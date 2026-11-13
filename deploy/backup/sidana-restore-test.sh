#!/bin/sh
# Proves a snapshot can be restored, without touching Supabase. Started by
# scripts/restore-test.sh. The age PRIVATE key arrives on stdin and is held in memory only.
#
#   sidana-restore-test <snapshot file | latest | offsite>
#
# It decrypts the snapshot, checks every checksum, restores the database into a throwaway
# Postgres inside this container, and compares row counts with the ones read at backup
# time. It also checks the Storage archive, the n8n export and the Pilot sheet.
# Then it deletes everything it made.
set -eu

OUT="${BACKUP_DIR:-/backups}"
TARGET="${1:-latest}"
export HOME="${HOME:-/tmp}" LC_ALL=C
export RCLONE_CONFIG="${RCLONE_CONFIG:-/tmp/rclone.conf}"
umask 077
[ -e "$RCLONE_CONFIG" ] || : > "$RCLONE_CONFIG"  # settings come from RCLONE_CONFIG_* variables
FAILS=0
say() { printf '%s\n' "$*"; }
bad() { say "  FAIL  $*"; FAILS=$((FAILS + 1)); }
good() { say "  ok    $*"; }
die() { say "FAIL: $*"; exit 1; }

T="$(mktemp -d "$OUT/.restore-test.XXXXXX")"
KEY="$(mktemp /tmp/identity.XXXXXX)"
SOCK="$(mktemp -d /tmp/pgsock.XXXXXX)"   # short path: socket paths are limited to ~100 characters
PGRUN=""
PGD=""
cleanup() {
  [ -n "${PGD:-}" ] && $PGRUN pg_ctl -D "$PGD" -m immediate stop > /dev/null 2>&1 || true
  rm -rf "$T" "$KEY" "$SOCK" "${PGD:-}"
}
trap cleanup EXIT
trap 'exit 1' INT TERM

cat > "$KEY"
grep -q '^AGE-SECRET-KEY-' "$KEY" || die "send the age private key on stdin (the line starting AGE-SECRET-KEY-)"

case "$TARGET" in
  latest)
    SNAP="$(ls -1 "$OUT"/snapshots/sidana-*.tar.age 2>/dev/null | sort | tail -n 1)"
    [ -n "$SNAP" ] || die "there are no snapshots in $OUT/snapshots" ;;
  offsite)
    [ -n "${BACKUP_REMOTE:-}" ] || die "BACKUP_REMOTE isn't set"
    name="$(rclone lsf "${BACKUP_REMOTE%/}" --include 'sidana-*.tar.age' | sort | tail -n 1)"
    [ -n "$name" ] || die "there are no snapshots at $BACKUP_REMOTE"
    say "Downloading $name from $BACKUP_REMOTE"
    rclone copyto "${BACKUP_REMOTE%/}/$name" "$T/$name" || die "download failed"
    SNAP="$T/$name" ;;
  *) SNAP="$TARGET"; [ -f "$SNAP" ] || die "$SNAP doesn't exist" ;;
esac
say "Testing $(basename "$SNAP")"

age -d -i "$KEY" -o "$T/snap.tar" "$SNAP" 2> "$T/age.err" || die "can't decrypt: $(cat "$T/age.err")"
good "decrypted with your key"
mkdir "$T/x"
tar -xf "$T/snap.tar" -C "$T/x" || die "the archive is damaged"
rm -f "$T/snap.tar"
(cd "$T/x" && sha256sum -c SHA256SUMS > /dev/null 2>&1) && good "every checksum matches" || bad "checksums don't match"
say "        taken $(jq -r .started_at "$T/x/manifest.json")"

# ---- database: restore into a throwaway Postgres
# As root (on the VPS), Postgres runs as its own user, which can't enter the private
# /backups folder, so its data goes on the container's scratch disk instead.
if [ "$(id -u)" = 0 ]; then
  PGD="/var/lib/postgresql/data/restore-test"
  chown postgres:postgres "$SOCK"
  PGRUN="su-exec postgres"
else
  PGD="$T/pg"
fi
$PGRUN initdb -D "$PGD" -U postgres --auth=trust > "$T/initdb.log" 2>&1 || die "initdb failed: $(tail -n 5 "$T/initdb.log")"
$PGRUN pg_ctl -D "$PGD" -w -l "$PGD/server.log" \
  -o "-c listen_addresses='' -k $SOCK -c fsync=off" start > /dev/null || die "couldn't start Postgres"
export PGHOST="$SOCK" PGUSER=postgres PGDATABASE=postgres
# What Supabase provides around the dumped schemas.
psql -X -q -v ON_ERROR_STOP=1 > /dev/null <<'SQL'
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create role supabase_auth_admin nologin; create role supabase_admin nologin;
create schema if not exists extensions;
create extension if not exists pgcrypto schema extensions;
create extension if not exists "uuid-ossp" schema extensions;
SQL
pg_restore --no-owner --no-privileges -d postgres "$T/x/db.dump" > "$T/restore.log" 2>&1 || true
# The throwaway database already has a public schema; that one error is expected.
grep 'error:' "$T/restore.log" | grep -v 'schema "public" already exists' > "$T/errors.log" || true
errs="$(wc -l < "$T/errors.log" | tr -d ' ')"
if [ "$errs" = 0 ]; then good "database restored with no errors"
else say "  note  pg_restore reported $errs errors (often Supabase-only extras). First few:"; head -n 5 "$T/errors.log" | sed 's/^/          /'; fi

tables=0; mism=0
while IFS="$(printf '\t')" read -r tbl before after; do
  [ -n "$tbl" ] || continue
  tables=$((tables + 1))
  schema="${tbl%%.*}"; rel="${tbl#*.}"
  n="$(psql -X -A -t -v ON_ERROR_STOP=1 -c "select count(*) from \"$schema\".\"$rel\"" 2>/dev/null || echo missing)"
  lo="$before"; hi="$after"; [ "$lo" -gt "$hi" ] && { lo="$after"; hi="$before"; }
  if [ "$n" = missing ]; then bad "$tbl is missing"; mism=$((mism + 1))
  elif [ "$n" -lt "$lo" ] || [ "$n" -gt "$hi" ]; then bad "$tbl has $n rows, expected $before"; mism=$((mism + 1))
  fi
done < "$T/x/counts.tsv"
[ "$mism" = 0 ] && good "all $tables tables have the right row counts"
users="$(psql -X -A -t -c 'select count(*) from auth.users' 2>/dev/null || echo 0)"
say "        $users sign-in accounts in auth.users"

# ---- other parts
if [ -f "$T/x/storage.tar" ]; then
  want="$(wc -l < "$T/x/storage-manifest.tsv" | tr -d ' ')"
  have="$(tar -tf "$T/x/storage.tar" | grep -vc '/$' || true)"
  [ "$have" = "$want" ] && good "Storage: all $want files present" || bad "Storage has $have files, expected $want"
else say "  --    Storage files weren't part of this backup"; fi
if [ -f "$T/x/n8n-workflows.json" ]; then
  jq -e 'type == "array"' "$T/x/n8n-workflows.json" > /dev/null \
    && good "n8n: $(jq length "$T/x/n8n-workflows.json") workflows" || bad "n8n export is unreadable"
else say "  --    n8n wasn't part of this backup"; fi
if [ -f "$T/x/pilot-sheet.xlsx" ]; then
  [ "$(head -c 2 "$T/x/pilot-sheet.xlsx")" = "PK" ] && good "Pilot sheet: valid .xlsx" || bad "Pilot sheet isn't a valid .xlsx"
else say "  --    the Pilot sheet wasn't part of this backup"; fi

if [ "$FAILS" = 0 ]; then say "RESTORE TEST PASSED"; else say "RESTORE TEST FAILED ($FAILS problems)"; exit 1; fi
