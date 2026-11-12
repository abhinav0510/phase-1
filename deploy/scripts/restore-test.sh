#!/usr/bin/env bash
# Proves a backup can be restored, without touching Supabase. Send the age PRIVATE key on
# stdin, from your own computer, so it's never saved on the server:
#   ssh deploy@<vps> /srv/sidana/scripts/restore-test.sh < sidana-backup-key.txt
#   ssh deploy@<vps> /srv/sidana/scripts/restore-test.sh offsite < sidana-backup-key.txt
# The argument is latest (the default), offsite (the newest off-site copy) or a file in
# backups/snapshots. See docs/BACKUPS.md.
set -euo pipefail
cd "$(dirname "$0")/.."
DC=./scripts/dc.sh
TARGET="${1:-latest}"
case "$TARGET" in
  latest|offsite) ;;
  *) TARGET="/backups/snapshots/$(basename "$TARGET")" ;;
esac
[ -t 0 ] && { echo "Send the age private key on stdin: restore-test.sh < key.txt" >&2; exit 1; }
$DC --profile backup build -q backup >&2 || true
# Runs as root inside the container only to hand the throwaway database to its own user.
exec $DC --profile backup run --rm -T --user 0 backup sidana-restore-test "$TARGET"
