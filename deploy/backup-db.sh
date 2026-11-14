#!/usr/bin/env bash
# Encrypted-at-rest destination is the operator's responsibility; this script only
# writes a consistent custom-format dump with strict permissions.
set -euo pipefail
umask 077

: "${DATABASE_URL:?DATABASE_URL wajib diisi}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/gamestore}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
file="$BACKUP_DIR/gamestore-$stamp.dump"

pg_dump --format=custom --no-owner --no-privileges --file="$file" "$DATABASE_URL"
chmod 600 "$file"
sha256sum "$file" > "$file.sha256"
chmod 600 "$file.sha256"

find "$BACKUP_DIR" -type f \( -name 'gamestore-*.dump' -o -name 'gamestore-*.dump.sha256' \) \
  -mtime "+$RETENTION_DAYS" -delete

printf 'backup ok: %s\n' "$file"
