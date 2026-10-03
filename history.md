# history.md — MASSSOCIAL

## Cronología de decisiones y hitos

### 2026-09-17 | Fase 1: Inicio del fork
- **Commit:** inicio del fork de gitroomhq/postiz-app
- **Stack:** Postiz v2.12 (Temporal obligatorio para programación)
- **Decisión:** fork público en github.com/nachogarciaegea/masssocial
- **Fase 1 completada:** marca, `/masssocial` (proyectos, bulk parse/preview/commit/plan), página Masivo y Proyectos

### 2026-09-17/18 | Fase 2: Despliegue en Railway
- **Despliegue inicial:** railway.app (masssocial-production)
- **Imagen:** ghcr.io/gitroomhq/postiz-app:latest → construir propia en CI
- **Status:** Postgres, Redis, Temporal auto-setup en Railway
- **Workflow:** `.github/workflows/build-masssocial.yml` publica en ghcr.io/nachogarciaegea/masssocial

### 2026-09-20 | PR #3: Instagram Reels
- **Rama:** feat/instagram-reel-type
- **Cambio:** distinguir Reel de Post explícitamente (`post_type='reel'`)
- **Decisión:** no fusionar hasta validar retrocompatibilidad en producción (2 Reels programados)
- **Fix en revisión:** instagram.standalone.provider.ts faltaba checkValidity sin protección

### 2026-09-21 | Migración a IAMASTER
- **De:** Railway → IAMASTER (Tailscale, 100.104.34.35)
- **Setup:** docker-compose.yaml local + Dockerfile.dev (sin git)
- **Problema:** Meta no descarga desde Tailscale Funnel (*.ts.net bloqueado)
- **Solución:** Cloudflare R2 para medios (bucket masssocial-media)
- **Prueba real:** primer intento por Funnel falló; segundo por R2 publicó (Instagram p/Ddjb3Qyl68g/)
- **Bug arreglado:** DELETE /integrations borraba todos los posts en cascada, incluidos publicados
  - Fix: getPostsForChannel excluye state=PUBLISHED (commit 9b09ae0)

### 2026-09-21 onwards | Producción en IAMASTER
- **Stack:** Tailscale Funnel https://iamaster-1.tail05cbfb.ts.net:8443
- **Auth:** INSTAGRAM_APP_ID/SECRET en env
- **Medios:** Cloudflare R2 https://pub-97c5af7c12e14e3482d2394faa874ae7.r2.dev
- **Status:** vivo en producción (posts publicados validados)

## Decisiones reversibles (revisar periódicamente)

| Decisión | Estado | Alternativa |
|----------|--------|-------------|
| NOT_SECURED=true | Temporal | Cloudflare Tunnel + dominio propio |
| FRONTEND_URL global | Bloqueante para multidominio | Derivar de Host HTTP (pendiente) |
| Medios en R2 | Necesario (Meta bloquea Funnel) | IONOS + Tunnel = R2 opcional |
| Temporal sin Elasticsearch | Funcional | Elasticsearch si busquedas complejas |

## Pendientes

### Corto plazo (1-2 semanas)
- [ ] Dominio propio (IONOS) + Cloudflare Tunnel
- [ ] Multidominio: derivar FRONTEND_URL del Host HTTP
- [ ] Fusionar PR #3 (Reels) tras validar en producción

### Mediano plazo (1 mes)
- [ ] Backup automático nocturno (cron en iamaster)
- [ ] Alertas de caída (healthcheck → Slack/email)
- [ ] IA local (Ollama en iamaster) para generación de contenido en Masivo

### Largo plazo (2+ meses)
- [ ] TikTok (provider nuevo tras Instagram estable)
- [ ] LinkedIn, Bluesky (otros proveedores de Postiz)
- [ ] Dashboard de analytics (impresiones, engagement, followers delta)

---

**Relacionado:** [[user-nacho-garcia-egea]], [[reference-iamaster-opencode]]
