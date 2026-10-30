#!/usr/bin/env bash
# Nightly copy of the Supabase database, kept on the VPS. It only reads from Supabase.
# It doesn't cover Supabase Storage, so founder logos aren't included.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./backup.env; set +a
: "${SUPABASE_DB_URL:?set SUPABASE_DB_URL in backup.env}"

umask 077
mkdir -p backups
FILE="backups/supabase-$(date -u +%Y-%m-%dT%H%M).sql.gz"
docker run --rm -e SUPABASE_DB_URL postgres:17-alpine \
  sh -c 'pg_dump --no-owner --no-privileges --schema=public "$SUPABASE_DB_URL"' | gzip > "$FILE.tmp"
gzip -t "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
find backups -name 'supabase-*.sql.gz' -mtime "+${BACKUP_KEEP_DAYS:-14}" -delete
echo "Backup saved: $FILE ($(du -h "$FILE" | cut -f1))"
