#!/usr/bin/env bash
# Releases an image tag: ./scripts/deploy.sh <tag>. If the new release doesn't become
# healthy, it goes back to the previous one and exits with an error.
set -euo pipefail
cd "$(dirname "$0")/.."

TAG="${1:?usage: deploy.sh <image tag>}"
DC=./scripts/dc.sh
PREVIOUS="$(sed -n 's/^APP_TAG=//p' release.env 2>/dev/null || true)"

use_tag() { printf 'APP_TAG=%s\n' "$1" > release.env; }

healthy() {
  $DC exec -T app node -e \
    "fetch('http://127.0.0.1:3000/api/health?deep=1').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
}

rollback() {
  if [ -z "$PREVIOUS" ]; then
    echo "Release $TAG failed and there is no previous release to go back to." >&2
    $DC logs --tail 50 app >&2 || true
    exit 1
  fi
  echo "Release $TAG failed. Going back to $PREVIOUS." >&2
  $DC logs --tail 50 app >&2 || true
  use_tag "$PREVIOUS"
  $DC up -d --wait --wait-timeout 120 app
  exit 1
}

use_tag "$TAG"
if ! $DC pull app; then
  echo "Could not download image $TAG. Nothing was changed." >&2
  if [ -n "$PREVIOUS" ]; then use_tag "$PREVIOUS"; else rm -f release.env; fi
  exit 1
fi

$DC up -d --wait --wait-timeout 120 app || rollback
healthy || rollback

# Recreate nginx only when its files changed, and only if the new config is valid.
NGINX_HASH="$(find nginx docker-compose.yml -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)"
if [ "$NGINX_HASH" != "$(cat .nginx-hash 2>/dev/null || true)" ]; then
  $DC run --rm --no-deps nginx nginx -t
  $DC up -d --force-recreate --no-deps nginx
  echo "$NGINX_HASH" > .nginx-hash
fi
$DC up -d

# Keeps recent images so a rollback doesn't have to download anything.
docker image prune -af --filter "until=336h" > /dev/null
echo "Release $TAG is live."
