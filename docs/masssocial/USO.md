# MASSSOCIAL: guía de uso de las funciones propias

## Menú

- **Calendario**: el calendario de Postiz, con filtro por proyecto (`?customer=`).
- **Masivo**: tres pestañas: Importar CSV/Excel, Lotes y Perennes.
- **Proyectos**: tus marcas o perfiles (nachogarciaegea, DR1982, vCISO...), cada uno con sus canales y su perfil.

## Proyectos

Un proyecto agrupa canales (cuentas de red social) y guarda un perfil: tono, idioma, zona horaria,
hashtags por defecto, horas por defecto y color. El perfil lo usan la importación masiva y el
adaptador de texto para rellenar lo que no digas en cada fila.

1. Proyectos → Nuevo proyecto → nombre.
2. Canales → marca las cuentas que pertenecen al proyecto.
3. Editar perfil → hashtags, horas por defecto (por ejemplo 12:30 y 19:00), zona horaria.

## Importar CSV o Excel

1. Masivo → Importar → Descargar plantilla. Rellena una fila por publicación.
2. Sube el archivo. Verás una tabla con cada fila resuelta: fecha en tu hora, proyecto, canales
   con avatar, texto, medios encontrados en la mediateca y estado (ok, avisos o errores).
3. Corrige el texto en línea si hace falta, o pulsa "Adaptar por red" para recortar y ajustar
   por canal.
4. "Programar N publicaciones" crea las publicaciones válidas; las que tengan errores se quedan
   en la tabla con el motivo.

Columnas (insensibles a mayúsculas y acentos):

| Columna | Valor | Ejemplo |
|---|---|---|
| fecha | AAAA-MM-DD | 2026-10-01 |
| hora | HH:mm en tu zona | 19:00 |
| zona_horaria | IANA, opcional | Europe/Madrid |
| proyecto | nombre del proyecto | DR1982 |
| redes | red o canal, separados por `\|` | instagram\|tiktok |
| texto | texto plano, salto de línea = párrafo | Nuevo mural en Melilla |
| medios | nombre del archivo en la mediateca o URL https | mural1.mp4 |
| titulo | YouTube, Pinterest y TikTok (subida) | Mural Melilla 2026 |
| tipo | Instagram: post o story (reel = post) | post |
| tablero | Pinterest: id del tablero | 1234567890 |
| repetir_dias | perenne: cada N días | 30 |
| etiquetas | nombres de etiqueta existentes, separadas por `\|` | graffiti\|melilla |
| borrador | si o no | no |
| adaptar | si o no (por defecto si) | si |

Si `redes` va vacío y hay proyecto, se usan todos los canales del proyecto. Si falta `hora`, se usa la
primera hora por defecto del proyecto y, si no hay, las 12:00. Los medios tienen que estar ya en la
mediateca (Media) o ser URLs https con extensión de imagen o mp4.

## Lotes

Para "sube 30 reels y publica uno al día a las 19:00 en Instagram y TikTok":

1. Masivo → Lotes. Elige proyecto (rellena canales, zona horaria y horas) o marca canales a mano.
2. Elige medios de la mediateca (cada archivo es una publicación) o pega textos separados por una
   línea en blanco. El texto común admite `{n}` para numerar.
3. Reglas: fecha de inicio, horas del día, días de la semana, publicaciones por día, máximo por red
   y día, repetir cada N días (perenne), borrador, adaptar por red.
4. "Calcular plan" muestra la misma tabla de vista previa. "Programar" crea las publicaciones.

## Perennes

Cualquier publicación con "repetir cada N días" se vuelve a programar sola tras publicarse (usa el
mecanismo nativo de Postiz, `intervalInDays`). En Masivo → Perennes puedes cambiar el intervalo o
quitarlas de la rotación.

## Adaptar por red

Sin clave de OpenAI: reglas. Párrafos a HTML, recorte por palabra al límite del canal (X 280,
Threads 500, Instagram 2200, TikTok 2000, LinkedIn 3000...), hashtags del proyecto al final si caben
(en X, máximo 3). Con `OPENAI_API_KEY` en Railway y el interruptor "Usar IA": reescritura con el tono
e idioma del perfil del proyecto.

## Conectar redes

Cada red necesita su app de desarrollador. Variables en Railway (servicio `masssocial`):
Instagram y Facebook `FACEBOOK_APP_ID` y `FACEBOOK_APP_SECRET`; TikTok `TIKTOK_CLIENT_ID` y
`TIKTOK_CLIENT_SECRET`; YouTube `YOUTUBE_CLIENT_ID` y `YOUTUBE_CLIENT_SECRET`; X `X_API_KEY` y
`X_API_SECRET`; LinkedIn `LINKEDIN_CLIENT_ID` y `LINKEDIN_CLIENT_SECRET`. URL de retorno:
`https://<dominio>/integrations/social/<red>`.
