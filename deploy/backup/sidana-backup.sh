#!/bin/sh
# The nightly backup. It runs inside the backup image, started by scripts/backup.sh.
# It only READS from Supabase, n8n and Google. It never writes back to any of them.
#
# One run makes one encrypted file, snapshots/sidana-<time>.tar.age, holding:
#   db.dump               the public and auth schemas (tables, data, logins), pg_dump custom format
#   schema-public.sql     the public schema as readable SQL, to see what's live
#   counts.tsv            row counts per table, read before and after the dump
#   storage.tar           every file in Supabase Storage (logos, MIS, decks), by bucket/path
#   storage-manifest.tsv  the list of those files with their sizes
#   n8n-workflows.json    every n8n workflow (if N8N_API_KEY is set)
#   pilot-sheet.xlsx      the Pilot sheet, all tabs (if PILOT_SHEET_ID is set)
#   manifest.json, SHA256SUMS
# Then it copies the file off the server, deletes old ones, writes last-status.json and
# pings the heartbeat URL, which alerts someone if a night is missed or fails.
set -eu

OUT="${BACKUP_DIR:-/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date -u +%Y-%m-%dT%H%MZ)"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STARTED_S="$(date -u +%s)"
WORK="$OUT/.work-$STAMP"
SNAP_DIR="$OUT/snapshots"
SNAP_NAME="sidana-$STAMP.tar.age"
TAB="$(printf '\t')"
export HOME="${HOME:-/tmp}" PGCONNECT_TIMEOUT=20
export RCLONE_CONFIG="${RCLONE_CONFIG:-/tmp/rclone.conf}"
umask 077
[ -e "$RCLONE_CONFIG" ] || : > "$RCLONE_CONFIG"  # settings come from RCLONE_CONFIG_* variables

ERRORS=""
DONE=0
EXIT_CODE=1
DB_STATE=pending; STORAGE_STATE=pending; STORAGE_FILES=0
N8N_STATE=skipped; N8N_WORKFLOWS=0; SHEET_STATE=skipped
OFFSITE_STATE=pending; SNAP_BYTES=0

log() { printf '%s  %s\n' "$(date -u +%H:%M:%S)" "$*"; }
problem() { log "PROBLEM: $*"; ERRORS="${ERRORS}${ERRORS:+ | }$*"; }
size_of() { wc -c < "$1" | tr -d ' '; }

ping_heartbeat() { # $1 = "" | /start | /fail, $2 = body
  [ -n "${BACKUP_HEARTBEAT_URL:-}" ] || return 0
  curl -fsS -m 15 --retry 3 -o /dev/null --data-raw "$2" "${BACKUP_HEARTBEAT_URL%/}$1" \
    || log "warning: couldn't reach the heartbeat URL"
}

# Writes last-status.json (read by people and, later, the developer panel), appends to
# history.jsonl, pings the heartbeat and exits. Runs exactly once, also on a crash.
finish() {
  [ "$DONE" = 1 ] && exit "$EXIT_CODE"
  DONE=1
  code="$1"
  [ "$code" = 0 ] && [ -n "$ERRORS" ] && code=1
  EXIT_CODE="$code"
  finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  last_ok="$(jq -r '.last_success_at // empty' "$OUT/last-status.json" 2>/dev/null || true)"
  [ "$code" = 0 ] && last_ok="$finished_at"
  file=""; [ -f "$SNAP_DIR/$SNAP_NAME" ] && file="$SNAP_NAME"
  jq -n \
    --arg started "$STARTED_AT" --arg finished "$finished_at" \
    --argjson seconds "$(( $(date -u +%s) - STARTED_S ))" \
    --argjson ok "$([ "$code" = 0 ] && echo true || echo false)" \
    --arg file "$file" --argjson bytes "$SNAP_BYTES" --arg last_ok "$last_ok" \
    --arg db "$DB_STATE" --arg storage "$STORAGE_STATE" --argjson files "$STORAGE_FILES" \
    --arg n8n "$N8N_STATE" --argjson workflows "$N8N_WORKFLOWS" --arg sheet "$SHEET_STATE" \
    --arg offsite "$OFFSITE_STATE" --arg errors "$ERRORS" \
    '{ok: $ok, started_at: $started, finished_at: $finished, duration_s: $seconds,
      snapshot: (if $file == "" then null else {file: $file, bytes: $bytes} end),
      last_success_at: (if $last_ok == "" then null else $last_ok end),
      parts: {database: $db, storage: {state: $storage, files: $files},
              n8n: {state: $n8n, workflows: $workflows}, pilot_sheet: $sheet, offsite: $offsite},
      problems: (if $errors == "" then [] else ($errors | split(" | ")) end)}' \
    > "$OUT/last-status.json.tmp" 2>/dev/null \
    && mv "$OUT/last-status.json.tmp" "$OUT/last-status.json" \
    && jq -c . "$OUT/last-status.json" >> "$OUT/history.jsonl" \
    || log "warning: couldn't write last-status.json"
  rm -rf "$WORK" "$WORK.tar"
  if [ "$code" = 0 ]; then
    log "Backup finished: $SNAP_NAME ($SNAP_BYTES bytes)"
    ping_heartbeat "" "OK $SNAP_NAME $SNAP_BYTES bytes, $STORAGE_FILES files, $N8N_WORKFLOWS workflows"
  else
    log "Backup FAILED: $ERRORS"
    ping_heartbeat "/fail" "FAILED: $ERRORS"
  fi
  exit "$code"
}
trap 'finish 1' EXIT
trap 'problem "stopped by a signal"; exit 1' INT TERM
fatal() { problem "$*"; finish 1; }

# ---------------------------------------------------------------- settings
ping_heartbeat /start ""
log "Backup $STAMP starting"
[ -n "${SUPABASE_DB_URL:-}" ] || fatal "SUPABASE_DB_URL isn't set in backup.env"
[ -n "${BACKUP_AGE_RECIPIENT:-}" ] || fatal "BACKUP_AGE_RECIPIENT isn't set in backup.env"
AGE_ARGS=""
for r in $BACKUP_AGE_RECIPIENT; do AGE_ARGS="$AGE_ARGS -r $r"; done
# shellcheck disable=SC2086
printf 'check' | age $AGE_ARGS > /dev/null 2>&1 || fatal "BACKUP_AGE_RECIPIENT isn't a valid age public key"
if [ -z "${BACKUP_REMOTE:-}" ] && [ "${BACKUP_OFFSITE:-}" != "none" ]; then
  fatal "BACKUP_REMOTE isn't set. Set it, or set BACKUP_OFFSITE=none to keep copies only on this server"
fi
if [ "${BACKUP_STORAGE:-}" != "none" ] && { [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; }; then
  fatal "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed to back up Storage files (or set BACKUP_STORAGE=none)"
fi

mkdir -p "$SNAP_DIR" "$OUT/storage-mirror"
# Leftovers from a run that was killed. scripts/backup.sh makes sure only one run is active.
find "$OUT" -maxdepth 1 -name '.work-*' -exec rm -rf {} + 2>/dev/null || true
mkdir "$WORK"

q() { psql "$SUPABASE_DB_URL" -X -q -A -t -v ON_ERROR_STOP=1 "$@"; }

# ---------------------------------------------------------------- 1. database
# One pg_dump call covers both schemas, so they come from the same instant. auth holds
# every login (auth.users, auth.identities); without it a restore would lock everyone out.
# The storage schema is left out on purpose: files are copied in step 2 and get fresh
# rows when they're uploaded again.
count_rows() {
  q -c "select coalesce(string_agg(format('select %L, count(*) from %I.%I',
          table_schema || '.' || table_name, table_schema, table_name), ' union all '
          order by table_schema, table_name), 'select null, null limit 0')
        from information_schema.tables
        where table_type = 'BASE TABLE'
          and (table_schema = 'public' or (table_schema = 'auth' and table_name in ('users', 'identities')))" \
    > "$WORK/count.sql" && q -F "$TAB" -f "$WORK/count.sql"
}
log "1/5 Database"
count_rows > "$WORK/counts-before.tsv" || fatal "couldn't connect to the database (check SUPABASE_DB_URL)"
pg_dump "$SUPABASE_DB_URL" --format=custom --no-owner --no-privileges \
  --schema=public --schema=auth --file="$WORK/db.dump" || fatal "pg_dump failed"
count_rows > "$WORK/counts-after.tsv" || fatal "couldn't count rows after the dump"
pg_restore --list "$WORK/db.dump" > /dev/null || fatal "the database dump is unreadable"
pg_dump "$SUPABASE_DB_URL" --schema-only --no-owner --no-privileges --schema=public \
  --file="$WORK/schema-public.sql" || problem "couldn't write schema-public.sql"
# table <TAB> rows before <TAB> rows after. The restore test accepts anything in between,
# because founders and n8n may write while the dump runs.
awk -F'\t' -v OFS='\t' 'NR==FNR {b[$1]=$2; next} {print $1, ($1 in b ? b[$1] : 0), $2}' \
  "$WORK/counts-before.tsv" "$WORK/counts-after.tsv" > "$WORK/counts.tsv"
rm -f "$WORK/counts-before.tsv" "$WORK/counts-after.tsv" "$WORK/count.sql"
DB_STATE=ok
log "    $(wc -l < "$WORK/counts.tsv" | tr -d ' ') tables, $(size_of "$WORK/db.dump") bytes"

# ---------------------------------------------------------------- 2. storage files
# A mirror on this server keeps the last copy of every file, so each night only new or
# changed files are downloaded. Files deleted in Supabase leave the mirror, but older
# snapshots still have them.
if [ "${BACKUP_STORAGE:-}" = "none" ]; then
  STORAGE_STATE=skipped
  log "2/5 Storage files: skipped (BACKUP_STORAGE=none)"
else
  log "2/5 Storage files"
  MIRROR="$OUT/storage-mirror"
  if q -F "$TAB" -c "select bucket_id, name, coalesce(metadata->>'size', '')
                      from storage.objects where name is not null order by 1, 2" \
       > "$WORK/storage-manifest.tsv"; then
    key="$SUPABASE_SERVICE_ROLE_KEY"; base="${SUPABASE_URL%/}"
    fetched=0; failed=0
    while IFS="$TAB" read -r bucket name size; do
      case "/$bucket/$name/" in */../*|*/./*|*//*) problem "skipped a file with an unsafe name in $bucket"; continue ;; esac
      dest="$MIRROR/$bucket/$name"
      if [ -f "$dest" ] && [ -n "$size" ] && [ "$(size_of "$dest")" = "$size" ]; then continue; fi
      mkdir -p "$(dirname "$dest")"
      path="$(jq -rn --arg s "$name" '$s | split("/") | map(@uri) | join("/")')"
      if curl -fsS -m 300 --retry 2 -H "apikey: $key" -H "Authorization: Bearer $key" \
           -o "$dest.part" "$base/storage/v1/object/authenticated/$bucket/$path" < /dev/null; then
        mv "$dest.part" "$dest"; fetched=$((fetched + 1))
      else
        rm -f "$dest.part"; failed=$((failed + 1))
      fi
    done < "$WORK/storage-manifest.tsv"
    awk -F'\t' '{print $1 "/" $2}' "$WORK/storage-manifest.tsv" | sort > "$WORK/want"
    (cd "$MIRROR" && find . -type f ! -name '*.part' | sed 's|^\./||' | sort) > "$WORK/have"
    comm -23 "$WORK/have" "$WORK/want" | while IFS= read -r gone; do rm -f "$MIRROR/$gone"; done
    find "$MIRROR" -mindepth 1 -type d -empty -delete 2>/dev/null || true
    rm -f "$WORK/want" "$WORK/have"
    tar -cf "$WORK/storage.tar" -C "$MIRROR" . || problem "couldn't pack the Storage files"
    STORAGE_FILES="$(wc -l < "$WORK/storage-manifest.tsv" | tr -d ' ')"
    if [ "$failed" -gt 0 ]; then
      STORAGE_STATE=partial; problem "$failed of $STORAGE_FILES Storage files couldn't be downloaded"
    else
      STORAGE_STATE=ok
    fi
    log "    $STORAGE_FILES files, $fetched downloaded this run, $failed failed"
  else
    STORAGE_STATE=failed; problem "couldn't list Storage files"
  fi
fi

# ---------------------------------------------------------------- 3. n8n workflows
# Workflows only. n8n never returns credential secrets through this API.
if [ -n "${N8N_API_KEY:-}" ]; then
  log "3/5 n8n workflows"
  n8n="${N8N_BASE_URL:-}"; n8n="${n8n%/}"
  cursor=""; page=0; N8N_STATE=ok
  [ -n "$n8n" ] || { N8N_STATE=failed; problem "N8N_API_KEY is set but N8N_BASE_URL isn't"; page=100; }
  while [ "$page" -lt 100 ]; do
    url="$n8n/api/v1/workflows?limit=100"
    [ -n "$cursor" ] && url="$url&cursor=$(jq -rn --arg s "$cursor" '$s | @uri')"
    if ! curl -fsS -m 60 --retry 2 -H "X-N8N-API-KEY: $N8N_API_KEY" -H "Accept: application/json" \
         -o "$WORK/n8n-page-$page.json" "$url"; then
      N8N_STATE=failed; problem "couldn't download n8n workflows (check N8N_BASE_URL and N8N_API_KEY)"; break
    fi
    cursor="$(jq -r '.nextCursor // empty' "$WORK/n8n-page-$page.json")"
    page=$((page + 1))
    [ -z "$cursor" ] && break
  done
  if [ "$N8N_STATE" = ok ]; then
    jq -s '[.[].data[]]' "$WORK"/n8n-page-*.json > "$WORK/n8n-workflows.json"
    N8N_WORKFLOWS="$(jq length "$WORK/n8n-workflows.json")"
    log "    $N8N_WORKFLOWS workflows"
  fi
  rm -f "$WORK"/n8n-page-*.json
else
  log "3/5 n8n workflows: skipped (N8N_API_KEY isn't set)"
fi

# ---------------------------------------------------------------- 4. Pilot sheet
# Signs in as a Google service account (read-only Drive access) and exports the whole
# spreadsheet as .xlsx. Share the sheet with the service account's email as a Viewer.
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
google_token() {
  sa="$(printf '%s' "$GOOGLE_SERVICE_ACCOUNT_B64" | openssl base64 -d -A)" || return 1
  email="$(printf '%s' "$sa" | jq -r .client_email)"
  pem="$(mktemp /tmp/sa.XXXXXX)"
  printf '%s' "$sa" | jq -r .private_key > "$pem"
  now="$(date -u +%s)"
  head="$(printf '{"alg":"RS256","typ":"JWT"}' | b64url)"
  body="$(jq -cn --arg iss "$email" --argjson iat "$now" \
    '{iss: $iss, scope: "https://www.googleapis.com/auth/drive.readonly",
      aud: "https://oauth2.googleapis.com/token", iat: $iat, exp: ($iat + 600)}' | b64url)"
  sig="$(printf '%s.%s' "$head" "$body" | openssl dgst -sha256 -sign "$pem" | b64url)"
  rm -f "$pem"
  curl -fsS -m 30 --data-urlencode "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
    --data-urlencode "assertion=$head.$body.$sig" https://oauth2.googleapis.com/token \
    | jq -er .access_token
}
if [ -n "${PILOT_SHEET_ID:-}" ]; then
  log "4/5 Pilot sheet"
  if [ -z "${GOOGLE_SERVICE_ACCOUNT_B64:-}" ]; then
    SHEET_STATE=failed; problem "PILOT_SHEET_ID is set but GOOGLE_SERVICE_ACCOUNT_B64 isn't"
  elif ! token="$(google_token)"; then
    SHEET_STATE=failed; problem "couldn't sign in to Google with the service account"
  elif curl -fsS -m 300 -H "Authorization: Bearer $token" -o "$WORK/pilot-sheet.xlsx" \
         "https://www.googleapis.com/drive/v3/files/$PILOT_SHEET_ID/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; then
    SHEET_STATE=ok; log "    $(size_of "$WORK/pilot-sheet.xlsx") bytes"
  else
    SHEET_STATE=failed; rm -f "$WORK/pilot-sheet.xlsx"
    problem "couldn't export the Pilot sheet (is it shared with the service account?)"
  fi
else
  log "4/5 Pilot sheet: skipped (PILOT_SHEET_ID isn't set)"
fi

# ---------------------------------------------------------------- 5. pack, encrypt, copy off
log "5/5 Encrypting and copying off the server"
jq -n --arg stamp "$STAMP" --arg started "$STARTED_AT" \
  --arg db "$DB_STATE" --arg storage "$STORAGE_STATE" --arg n8n "$N8N_STATE" --arg sheet "$SHEET_STATE" \
  '{format: 1, stamp: $stamp, started_at: $started,
    parts: {database: $db, storage: $storage, n8n: $n8n, pilot_sheet: $sheet}}' > "$WORK/manifest.json"
(cd "$WORK" && sha256sum -- * > SHA256SUMS) || fatal "couldn't write checksums"
tar -cf "$WORK.tar" -C "$WORK" . || fatal "couldn't pack the snapshot"
# shellcheck disable=SC2086
age $AGE_ARGS -o "$SNAP_DIR/$SNAP_NAME.part" "$WORK.tar" || fatal "encryption failed"
mv "$SNAP_DIR/$SNAP_NAME.part" "$SNAP_DIR/$SNAP_NAME"
SNAP_BYTES="$(size_of "$SNAP_DIR/$SNAP_NAME")"
rm -f "$WORK.tar"

if [ -n "${BACKUP_REMOTE:-}" ]; then
  remote="${BACKUP_REMOTE%/}"
  if rclone copyto --retries 3 "$SNAP_DIR/$SNAP_NAME" "$remote/$SNAP_NAME" \
     && [ "$(rclone lsjson "$remote/$SNAP_NAME" | jq '.[0].Size')" = "$SNAP_BYTES" ]; then
    OFFSITE_STATE=ok; log "    copied to $remote"
    if [ -n "${OFFSITE_KEEP_DAYS:-}" ] && [ -z "$ERRORS" ]; then
      rclone delete "$remote" --min-age "${OFFSITE_KEEP_DAYS}d" --include 'sidana-*.tar.age' \
        || problem "couldn't delete old off-site copies"
    fi
  else
    OFFSITE_STATE=failed; problem "the off-site copy failed (check BACKUP_REMOTE and the RCLONE_CONFIG_ settings)"
  fi
else
  OFFSITE_STATE=disabled
  log "    off-site copy is off (BACKUP_OFFSITE=none)"
fi

# Old snapshots go only after a fully good night, so a run of failures never empties the folder.
if [ -z "$ERRORS" ]; then
  find "$SNAP_DIR" -name 'sidana-*.tar.age' -mtime +"$KEEP_DAYS" -exec rm -f {} +
fi
finish 0
