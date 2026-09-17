# MASSSOCIAL: contrato de API de los módulos propios

Todos los endpoints cuelgan de `/masssocial` en el backend (NestJS), pasan por `AuthMiddleware`
(se añaden a `authenticatedController` en `apps/backend/src/api/api.module.ts`) y reciben la
organización con `@GetOrgFromRequest()`. El frontend los llama con `useFetch()` (`fetch('/masssocial/...')`).

Convenciones: fechas en ISO 8601 UTC con `Z`; `integrationId` es `Integration.id`; `customerId` es
`Customer.id` (en MASSSOCIAL un "proyecto" es un `Customer` de Postiz más un `ProjectProfile`).

## Modelo nuevo en Prisma

```prisma
model ProjectProfile {
  id             String       @id @default(uuid())
  organizationId String
  customerId     String       @unique
  tone           String?      // "personal" | "professional" | "playful" | texto libre
  language       String?      // "es", "en"...
  hashtags       String?      // texto, separados por espacios o saltos de línea
  timezone       String?      // IANA, ej. "Europe/Madrid"
  defaultTimes   String?      // JSON: ["19:00","12:30"] hora local del proyecto
  color          String?      // hex
  notes          String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  deletedAt      DateTime?
  organization   Organization @relation(fields: [organizationId], references: [id])
  customer       Customer     @relation(fields: [customerId], references: [id])
  @@index([organizationId])
}
```
Hay que añadir la relación inversa en `Organization` (`projectProfiles ProjectProfile[]`) y en
`Customer` (`profile ProjectProfile?`). Se aplica con `prisma db push` al arrancar el contenedor.

## Tipos compartidos (TypeScript)

```ts
// Objetivo (canal) ya resuelto para una fila
export interface BulkTarget {
  integrationId: string;
  name: string;            // Integration.name
  identifier: string;      // providerIdentifier (instagram, tiktok, x...)
  picture?: string;
  content: string;         // HTML final para ese canal (<p>...</p>)
  settings: Record<string, any>; // settings del proveedor SIN __type
  maxLength: number;
  truncated: boolean;      // true si el adaptador tuvo que recortar
}

export interface BulkMedia {
  id: string;
  path: string;
  name: string;
  thumbnail?: string;
}

export interface BulkRowPreview {
  index: number;                 // fila de origen (1-based, sin cabecera)
  date: string;                  // ISO UTC
  inter?: number;                // repetir cada N días (perenne)
  tags: string[];                // etiquetas por nombre (Tags.name)
  draft: boolean;
  project?: { id: string; name: string };
  media: BulkMedia[];
  targets: BulkTarget[];
  errors: string[];              // bloquean el commit de esa fila
  warnings: string[];
  raw: Record<string, string>;   // la fila original tal cual
}

// Fila de entrada (lo que sale del CSV/XLSX o del planificador de lotes)
export interface BulkRowInput {
  index: number;
  fecha?: string;        // YYYY-MM-DD (o ISO completo)
  hora?: string;         // HH:mm
  zona_horaria?: string; // IANA; si falta: perfil del proyecto, luego Europe/Madrid
  proyecto?: string;     // nombre del Customer (opcional)
  redes?: string;        // "instagram|tiktok" o nombres de canal, separados por | ; o ,
  texto?: string;        // texto plano; saltos de línea = párrafos
  medios?: string;       // nombres de archivo de la mediateca o URLs https, separados por |
  titulo?: string;       // youtube/pinterest/tiktok(upload)
  tipo?: string;         // instagram: post|story  (reel == post)
  tablero?: string;      // pinterest board id
  repetir_dias?: string; // número
  etiquetas?: string;    // separadas por |
  borrador?: string;     // si|no
  adaptar?: string;      // si|no (adaptar texto por red, por defecto si)
}
```

Cabeceras aceptadas en CSV/XLSX (insensibles a mayúsculas y acentos; alias en inglés entre paréntesis):
`fecha (date)`, `hora (time)`, `zona_horaria (timezone)`, `proyecto (project)`, `redes (channels|networks)`,
`texto (text|content)`, `medios (media|files)`, `titulo (title)`, `tipo (type)`, `tablero (board)`,
`repetir_dias (repeat_days)`, `etiquetas (tags)`, `borrador (draft)`, `adaptar (adapt)`.

## Endpoints

### Proyectos
- `GET /masssocial/projects` → `{ projects: ProjectView[], unassigned: ChannelView[] }`
  - `ProjectView = { customer: {id,name}, profile: ProjectProfile|null, integrations: ChannelView[] }`
  - `ChannelView = { id, name, identifier, picture, disabled }`
- `POST /masssocial/projects` body `{ name: string }` → `{ id, name }` (crea `Customer` en la org)
- `PUT /masssocial/projects/:customerId/profile` body `ProjectProfileDto` (todos opcionales: tone,
  language, hashtags, timezone, defaultTimes: string[], color, notes) → `ProjectProfile`
- `PUT /masssocial/projects/:customerId/channels` body `{ integrationIds: string[] }` → `{ ok: true }`
  (deja exactamente esos canales en el proyecto; los que estaban y no vienen quedan sin proyecto)
- `DELETE /masssocial/projects/:customerId` → `{ ok: true }` (soft delete del Customer, desasigna canales)

### Importación masiva
- `POST /masssocial/bulk/parse` multipart `file` (.csv o .xlsx) → `{ rows: BulkRowInput[], columns: string[] }`
- `POST /masssocial/bulk/preview` body `{ rows: BulkRowInput[] }` → `{ rows: BulkRowPreview[] }`
  Resuelve proyecto, canales, medios, fecha, settings por defecto y adaptación de texto. Nunca
  crea nada. Filas con `errors` no se pueden confirmar.
- `POST /masssocial/bulk/commit` body `{ rows: BulkRowPreview[] }` → `{ created: {index, postId, integrationId}[], failed: {index, error}[] }`
  Por cada fila crea un `CreatePostDto` (`type: draft|schedule`, `date`, `inter`, `tags`, `posts[]`:
  un elemento por target con `integration.id`, `value:[{content, image: media}]`, `settings`) y llama a
  `PostsService.mapTypeToPost` + `validatePosts` + `createPost(orgId, body, 'WEB')`. No usar `group`.
- `GET /masssocial/bulk/template` → `text/csv` con cabeceras y dos filas de ejemplo.

### Planificador por lotes
- `POST /masssocial/bulk/plan` body:
  ```ts
  {
    items: { content: string; mediaIds: string[]; title?: string }[];
    integrationIds: string[];
    projectId?: string;
    start: string;            // YYYY-MM-DD
    timesOfDay: string[];     // ["19:00"] hora local
    timezone?: string;        // por defecto: perfil del proyecto o Europe/Madrid
    weekdays?: number[];      // 1=lunes ... 7=domingo; por defecto todos
    perDay?: number;          // publicaciones por día (por defecto timesOfDay.length)
    maxPerNetworkPerDay?: number;
    inter?: number;           // perenne
    draft?: boolean;
    adapt?: boolean;          // por defecto true
  }
  ```
  → `{ rows: BulkRowPreview[] }` (se confirman con `/bulk/commit`)

### Adaptación por red
- `POST /masssocial/adapt` body `{ content: string; integrationIds: string[]; projectId?: string; useAi?: boolean }`
  → `{ adaptations: { integrationId, identifier, content, maxLength, truncated, notes: string[] }[] }`
  Reglas sin IA: párrafos a HTML, límite por proveedor (`provider.maxLength()`), recorte por palabra
  con "…", hashtags del proyecto al final si caben (en X máximo 3), en YouTube/Pinterest el texto se
  usa como descripción. Con `useAi` y `OPENAI_API_KEY` presente: reescritura con el tono/idioma del perfil.

### Perennes (reciclaje)
- `GET /masssocial/evergreen` → `{ posts: { id, content, publishDate, intervalInDays, state, integration: {id,name,identifier,picture} }[] }`
  (posts con `intervalInDays` no nulo, `deletedAt` nulo, `parentPostId` nulo)
- `PUT /masssocial/evergreen/:postId` body `{ intervalInDays: number | null }` → `{ ok: true }`

## Defaults de settings por proveedor (servidor)

| identifier | settings por defecto |
|---|---|
| instagram, instagram-standalone | `{ post_type: 'post' }` (`tipo=story` → `story`) |
| tiktok, tiktok-business | `{ privacy_level:'PUBLIC_TO_EVERYONE', duet:false, stitch:false, comment:true, brand_content_toggle:false, brand_organic_toggle:false, autoAddMusic:'no', content_posting_method:'DIRECT_POST' }` + `title` si hay `titulo` |
| youtube | `{ title: titulo || primeras 100 letras del texto, type:'public' }` |
| x | `{ who_can_reply_post:'everyone' }` |
| pinterest | `{ board: tablero }` (+ `title`); sin tablero → error de fila |
| facebook, linkedin, linkedin-page, threads, bluesky, mastodon | `{}` |
| resto | `{}` y warning "revisa los ajustes de este canal" |
