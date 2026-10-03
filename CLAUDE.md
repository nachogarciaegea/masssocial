# CLAUDE.md — MASSSOCIAL

**MASSSOCIAL** — gestor de redes sociales multired, multidominio. Fork de Postiz con extensiones (carruseles).

## Consolidación 2026-10-03

Integración de masssocial-platform/feat/carruseles:
- Feature carruseles: creatividad nueva sustituye diapositivas, espera de imágenes se para al salir
- Repo unificado: github.com/nachogarciaegea/masssocial (masssocial-platform archivado)

## Contexto principal

- **Stack:** Postiz fork v2.12+, Next.js, NestJS, PostgreSQL, Redis, Temporal
- **Despliegue:** Docker en iamaster-1 (Tailscale Funnel), medios en Cloudflare R2
- **Auth:** Instagram standalone + INSTAGRAM_APP_ID/SECRET

## Decisiones clave

1. **Multidominio:** FRONTEND_URL global (pendiente derivar de Host)
2. **Medios:** Cloudflare R2 (Meta no descarga de Funnel)
3. **Seguridad:** Fix cascada DELETE en /integrations
4. **Carruseles:** Feature nueva para gestión avanzada de contenido

Ver history.md y agentes.md para cronología completa.
