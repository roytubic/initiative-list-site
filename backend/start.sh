#!/usr/bin/env bash
set -euo pipefail
: "${DB_PATH:=/data/catalog.db}"
if [ ! -f "$DB_PATH" ]; then
  echo "No DB at $DB_PATH — seeding…"
  node /app/backend/db/seedCatalog.js
fi
exec node server.js
