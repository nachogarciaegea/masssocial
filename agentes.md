# agentes.md — MASSSOCIAL

## Agentes y skills usados

### Desarrollo
- **Agent: claude** — Análisis de Postiz codebase, diseño de extensión multidominio, integración de R2
- **Skill: code-review** — Revisión de PR #3 (Reels), detección bug en instagram.standalone.provider.ts

### Debugging
- **Agent: claude** — Diagóstico: Meta no descarga de Funnel, solución: R2

### Seguridad
- **Skill: security-review** — Cascada DELETE, flujo de medios

## Técnicas aplicadas

| Técnica | Resultado | Archivo |
|---------|-----------|---------|
| Cascada DELETE | ❌ Bug → Fix en 9b09ae0 | apps/api |
| Cloudflare R2 fallback | ✅ Solución a Meta blocking | docker-compose.yaml |
| FRONTEND_URL global | ⚠️ Bloqueante para multidominio | apps/web |
| Instagram standalone | ✅ Directo sin broker | apps/api/instagram.standalone.provider.ts |

## Próximas sesiones

1. Validar multidominio (Host HTTP → FRONTEND_URL)
2. PR #3 en producción
3. Dominio + Cloudflare Tunnel
4. Backup automático

**Skills para futuras tareas:** `/code-review`, `/simplify`, `/run`
