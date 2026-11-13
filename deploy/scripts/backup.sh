#!/usr/bin/env bash
# Runs the nightly backup (see docs/BACKUPS.md). Cron starts it; you can also run it by hand:
#   /srv/sidana/scripts/backup.sh
# The job itself runs in the backup container, deploy/backup/sidana-backup.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
DC=./scripts/dc.sh

[ -f backup.env ] || { echo "backup.env is missing. Copy backup.env.example and fill it in." >&2; exit 1; }
install -d -m 700 backups
exec 9> backups/.lock
flock -n 9 || { echo "A backup is already running." >&2; exit 1; }

# Keep the log from growing without limit.
if [ -f backups/backup.log ] && [ "$(stat -c %s backups/backup.log)" -gt 5000000 ]; then
  mv backups/backup.log backups/backup.log.1
fi

{
  echo "=== $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  ./scripts/backup-image.sh "$DC"
  $DC --profile backup run --rm -T --user "$(id -u):$(id -g)" backup sidana-backup
} 2>&1 | tee -a backups/backup.log
