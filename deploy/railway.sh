#!/usr/bin/env bash
# MASSSOCIAL: despliegue en Railway (fase 1, imagen oficial de Postiz).
# Requisitos: railway CLI autenticada (railway login) y openssl.
# Crea: proyecto masssocial, Postgres, Redis, Temporal (auto-setup) y la app.
set -euo pipefail
export MSYS_NO_PATHCONV=1  # Git Bash en Windows: no convertir /uploads en ruta de Windows

PROJECT="${PROJECT:-masssocial}"
APP_IMAGE="${APP_IMAGE:-ghcr.io/gitroomhq/postiz-app:latest}"
TEMPORAL_IMAGE="${TEMPORAL_IMAGE:-temporalio/auto-setup:1.28.1}"
JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"

echo ">> Proyecto"
railway init --name "$PROJECT"

echo ">> Bases de datos"
railway add --database postgres
railway add --database redis

echo ">> Temporal (usa el mismo Postgres, bases temporal y temporal_visibility)"
railway add --service temporal --image "$TEMPORAL_IMAGE" \
  --variables "DB=postgres12" \
  --variables "DB_PORT=5432" \
  --variables 'POSTGRES_USER=${{Postgres.PGUSER}}' \
  --variables 'POSTGRES_PWD=${{Postgres.PGPASSWORD}}' \
  --variables 'POSTGRES_SEEDS=${{Postgres.RAILWAY_PRIVATE_DOMAIN}}' \
  --variables "DBNAME=temporal" \
  --variables "VISIBILITY_DBNAME=temporal_visibility" \
  --variables "ENABLE_ES=false" \
  --variables "BIND_ON_IP=0.0.0.0" \
  --variables "TEMPORAL_BROADCAST_ADDRESS=127.0.0.1" \
  --variables "TEMPORAL_ADDRESS=127.0.0.1:7233" \
  --variables "DEFAULT_NAMESPACE=default" \
  --variables "TEMPORAL_NAMESPACE=default" \
  --variables "SKIP_DEFAULT_NAMESPACE_CREATION=false" \
  --variables "SKIP_ADD_CUSTOM_SEARCH_ATTRIBUTES=true"

echo ">> App"
railway add --service masssocial --image "$APP_IMAGE" \
  --variables 'MAIN_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}' \
  --variables 'FRONTEND_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}' \
  --variables 'NEXT_PUBLIC_BACKEND_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}/api' \
  --variables "PORT=3000" \
  --variables "BACKEND_INTERNAL_URL=http://localhost:3000" \
  --variables "JWT_SECRET=$JWT_SECRET" \
  --variables 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --variables 'REDIS_URL=${{Redis.REDIS_URL}}' \
  --variables 'TEMPORAL_ADDRESS=${{temporal.RAILWAY_PRIVATE_DOMAIN}}:7233' \
  --variables "TEMPORAL_NAMESPACE=default" \
  --variables "IS_GENERAL=true" \
  --variables "DISABLE_REGISTRATION=false" \
  --variables "STORAGE_PROVIDER=local" \
  --variables "UPLOAD_DIRECTORY=/uploads" \
  --variables "NEXT_PUBLIC_UPLOAD_DIRECTORY=/uploads" \
  --variables "API_LIMIT=30" \
  --variables "NX_ADD_PLUGINS=false"

echo ">> Volumen de subidas y dominio"
railway service masssocial
railway volume add --mount-path /uploads
railway domain --service masssocial --port 5000

echo ">> Listo. Cuando el primer usuario esté creado: railway variable set DISABLE_REGISTRATION=true --service masssocial"
