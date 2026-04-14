#!/usr/bin/env bash
set -euo pipefail

INIT_MIGRATION="20260414000000_init"

echo "[release] Applying Prisma migrations"
if prisma migrate deploy; then
  echo "[release] Migrations applied"
else
  echo "[release] prisma migrate deploy failed, trying legacy baseline recovery"
  prisma migrate resolve --applied "$INIT_MIGRATION"
  prisma migrate deploy
fi

if [ "${HEROKU_RUN_SEED_ON_RELEASE:-false}" = "true" ]; then
  echo "[release] Running Prisma seed"
  prisma db seed
else
  echo "[release] Skipping seed (set HEROKU_RUN_SEED_ON_RELEASE=true to enable)"
fi
