# Despliegue de MASSSOCIAL en Railway

Proyecto Railway `masssocial` con cuatro servicios y un volumen: `Postgres`, `Redis`, `temporal`
(temporalio/auto-setup, sin Elasticsearch), `masssocial` (imagen de Postiz) y el volumen `/uploads`.
El script [railway.sh](railway.sh) lo crea todo desde cero con la CLI (`railway login` antes).

URL de producción: https://masssocial-production.up.railway.app

## Notas de la primera instalación (2026-09-17)

- **Git Bash en Windows** convierte `/uploads` en `C:/Program Files/Git/uploads`. El script exporta
  `MSYS_NO_PATHCONV=1`; si pasas variables a mano, hazlo con esa variable activa.
- **Atributos de búsqueda de Temporal.** Sin Elasticsearch, la visibilidad SQL admite solo tres
  atributos de tipo `Text`. La imagen auto-setup registra dos de ejemplo (`CustomTextField`,
  `CustomStringField`) y Postiz añade `organizationId` y `postId`: cuatro, y el backend muere al
  arrancar con `cannot have more than 3 search attribute of type Text`. Solución aplicada:
  `SKIP_ADD_CUSTOM_SEARCH_ATTRIBUTES=true` en el servicio `temporal` (ya en el script) y, en la
  instalación existente, borrar los dos de ejemplo por SSH:
  `temporal operator search-attribute remove --name CustomTextField --name CustomStringField --yes`.
- **Puertos**: nginx escucha en 5000 dentro del contenedor y el dominio se crea con `--port 5000`.
  Railway inyecta `PORT=8080` en tiempo de ejecución y el backend lo obedece, así que nginx no lo
  encuentra en 3000 y devuelve 502. Por eso la app lleva `PORT=3000` fijado.
- **SSH a los contenedores**: hay una clave `railway-masssocial` registrada en la cuenta
  (`~/.ssh/id_ed25519_railway`). `railway ssh --service <servicio>` o un bloque generado con
  `railway ssh config --service <servicio> --alias <alias> --dry-run`.
- **Después del primer usuario**: `railway variable set DISABLE_REGISTRATION=true --service masssocial`.

## Credenciales de redes

La app arranca sin ninguna red configurada. Cada red necesita su app de desarrollador y sus variables
(`FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET` para Instagram y Facebook, `TIKTOK_CLIENT_ID`/`TIKTOK_CLIENT_SECRET`,
etc.). Las URLs de callback son `https://<dominio>/integrations/social/<proveedor>`.

## Fase 2 (imagen propia)

El workflow `build-masssocial.yml` publica `ghcr.io/nachogarciaegea/masssocial:latest` en cada push a
`main`. Para desplegar la versión personalizada basta con cambiar la imagen del servicio `masssocial`.
