#!/usr/bin/env bash
# Restore a dump into a throwaway database and verify a known table. Never point
# RESTORE_TEST_DATABASE_URL at production.
set -euo pipefail
umask 077

: "${RESTORE_TEST_DATABASE_URL:?RESTORE_TEST_DATABASE_URL wajib diisi}"
: "${1:?Usage: restore-test.sh /path/to/gamestore.dump}"

dump="$1"
test -r "$dump"

psql "$RESTORE_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SQL

pg_restore --no-owner --no-privileges --exit-on-error \
  --dbname "$RESTORE_TEST_DATABASE_URL" "$dump"

psql "$RESTORE_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c 'SELECT count(*) AS users FROM users;' \
  -c 'SELECT count(*) AS migrations FROM _prisma_migrations WHERE finished_at IS NOT NULL;'

printf 'restore test ok: %s\n' "$dump"
