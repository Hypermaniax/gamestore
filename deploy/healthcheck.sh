#!/usr/bin/env bash
# Uptime check for systemd timer or an external monitor. Health returns 503 when
# the DB or a scheduled-job heartbeat is stale.
set -euo pipefail
: "${HEALTH_URL:=http://127.0.0.1:3000/api/v1/health}"
body="$(curl -fsS --max-time 5 "$HEALTH_URL")"
case "$body" in
  *'"status":"ok"'*) printf 'health ok\n' ;;
  *) printf 'health degraded: %s\n' "$body" >&2; exit 1 ;;
esac
