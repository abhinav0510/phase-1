#!/usr/bin/env bash
# Builds the backup image only when it's missing or deploy/backup has changed since the last
# build. The build checks Docker Hub, which can stall, so it gets a time limit; if it fails,
# the last good image is used. Called by backup.sh and restore-test.sh.
set -uo pipefail
DC="$1"
created="$(docker image inspect -f '{{.Created}}' sidana-backup:local 2>/dev/null)"
if [ -n "$created" ] && [ -z "$(find backup -type f -newermt "$created" 2>/dev/null | head -n 1)" ]; then
  exit 0
fi
echo "Building the backup image"
timeout 600 $DC --profile backup build -q backup && exit 0
if [ -n "$created" ]; then
  echo "warning: couldn't rebuild the backup image, using the last good one"
else
  echo "The backup image couldn't be built." >&2
  exit 1
fi
