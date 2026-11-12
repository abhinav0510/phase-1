#!/bin/sh
# End-to-end test of the backup and restore-test scripts against a throwaway Postgres and
# a fake Supabase Storage / n8n, all on this machine. Touches no real service.
# Needs: postgres (initdb, pg_ctl, pg_dump), age, rclone, jq, curl, python3.
#   tests/backup/run.sh
set -eu
export LC_ALL=C
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d)"; PORT=48231
cleanup() { pg_ctl -D "$T/src" -m immediate stop > /dev/null 2>&1 || true; [ -n "${HTTP:-}" ] && kill "$HTTP" 2>/dev/null; rm -rf "$T"; }
trap cleanup EXIT

# Source database
initdb -D "$T/src" -U postgres --auth=trust > /dev/null
mkdir "$T/sock"
pg_ctl -D "$T/src" -w -l "$T/src.log" -o "-c listen_addresses='' -k $T/sock" start > /dev/null
DB="postgresql://postgres@/postgres?host=$T/sock"
psql "$DB" -X -q -v ON_ERROR_STOP=1 -f "$ROOT/tests/backup/fixture.sql" > /dev/null

# Fake Storage and n8n
W="$T/www"; S="$W/storage/v1/object/authenticated"
mkdir -p "$S/startup-logos/1" "$S/startup-logos/2" "$S/startup-mis/1" "$W/api/v1"
printf 'PNG-one' > "$S/startup-logos/1/logo.png"
printf 'PNG-two!' > "$S/startup-logos/2/logo.png"
printf 'xlsx data' > "$S/startup-mis/1/MIS Q3 2026.xlsx"
psql "$DB" -X -q -c "insert into storage.objects (bucket_id, name, metadata) values
  ('startup-logos', '1/logo.png', '{\"size\": 7}'), ('startup-logos', '2/logo.png', '{\"size\": 8}'),
  ('startup-mis', '1/MIS Q3 2026.xlsx', '{\"size\": 9}')"
printf '{"data":[{"id":"a","name":"Pilot sync"},{"id":"b","name":"Weekly report"}],"nextCursor":null}' > "$W/api/v1/workflows"
(cd "$W" && exec python3 -m http.server "$PORT" --bind 127.0.0.1 > /dev/null 2>&1) & HTTP=$!
sleep 1

age-keygen -o "$T/key.txt" 2> /dev/null
export BACKUP_DIR="$T/backups" SUPABASE_DB_URL="$DB" \
  BACKUP_AGE_RECIPIENT="$(age-keygen -y "$T/key.txt")" \
  SUPABASE_URL="http://127.0.0.1:$PORT" SUPABASE_SERVICE_ROLE_KEY=test-key \
  BACKUP_REMOTE="$T/offsite" N8N_BASE_URL="http://127.0.0.1:$PORT" N8N_API_KEY=test \
  RCLONE_CONFIG="$T/rclone.conf" HOME="$T"
mkdir -p "$BACKUP_DIR"
B="$ROOT/deploy/backup"
fail() { echo "TEST FAILED: $*"; exit 1; }

echo "--- first backup"
sh "$B/sidana-backup.sh" || fail "first backup exited non-zero"
jq -e '.ok and .parts.storage.files == 3 and .parts.n8n.workflows == 2 and .parts.offsite == "ok"' \
  "$BACKUP_DIR/last-status.json" > /dev/null || fail "unexpected status: $(cat "$BACKUP_DIR/last-status.json")"
ls "$T/offsite"/sidana-*.tar.age > /dev/null || fail "no off-site copy"

echo "--- restore test, local copy"
sh "$B/sidana-restore-test.sh" latest < "$T/key.txt" || fail "restore test failed"
echo "--- restore test, off-site copy"
sh "$B/sidana-restore-test.sh" offsite < "$T/key.txt" || fail "off-site restore test failed"

echo "--- a wrong key is refused"
age-keygen -o "$T/wrong.txt" 2> /dev/null
if sh "$B/sidana-restore-test.sh" latest < "$T/wrong.txt" > /dev/null 2>&1; then fail "a wrong key decrypted the backup"; fi

echo "--- a deleted file leaves the mirror; a missing file fails the run"
psql "$DB" -X -q -c "delete from storage.objects where name = '2/logo.png'"
psql "$DB" -X -q -c "insert into storage.objects (bucket_id, name, metadata) values ('startup-logos', '9/gone.png', '{\"size\": 1}')"
sleep 61  # a new minute, so a new snapshot name
if sh "$B/sidana-backup.sh"; then fail "a missing Storage file should fail the run"; fi
[ ! -e "$BACKUP_DIR/storage-mirror/startup-logos/2/logo.png" ] || fail "a deleted file stayed in the mirror"
jq -e '(.ok | not) and .parts.storage.state == "partial" and .snapshot != null and .last_success_at != null' \
  "$BACKUP_DIR/last-status.json" > /dev/null || fail "unexpected status after a partial run: $(cat "$BACKUP_DIR/last-status.json")"

echo "--- missing settings stop the run before anything happens"
if SUPABASE_DB_URL= sh "$B/sidana-backup.sh" > /dev/null 2>&1; then fail "ran without SUPABASE_DB_URL"; fi
jq -e '.problems[0] | test("SUPABASE_DB_URL")' "$BACKUP_DIR/last-status.json" > /dev/null || fail "missing-setting problem not recorded"
[ "$(wc -l < "$BACKUP_DIR/history.jsonl" | tr -d ' ')" = 3 ] || fail "history.jsonl should have 3 runs"
echo "ALL BACKUP TESTS PASSED"
