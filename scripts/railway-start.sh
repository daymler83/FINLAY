#!/usr/bin/env bash
set -euo pipefail

INIT_MIGRATION="20260414000000_init"

echo "[railway] Applying Prisma migrations"
if prisma migrate deploy; then
  echo "[railway] Migrations applied"
else
  echo "[railway] prisma migrate deploy failed, trying legacy baseline recovery"
  prisma migrate resolve --applied "$INIT_MIGRATION"
  prisma migrate deploy
fi

if [ "${RAILWAY_RUN_SEED_ON_DEPLOY:-false}" = "true" ]; then
  echo "[railway] Running Prisma seed"
  prisma db seed
else
  echo "[railway] Skipping seed (set RAILWAY_RUN_SEED_ON_DEPLOY=true to enable)"
fi

echo "[railway] Starting Next.js"
exec next start --hostname 0.0.0.0 -p "${PORT:-3000}"
