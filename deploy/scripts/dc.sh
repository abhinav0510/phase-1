#!/usr/bin/env bash
# Runs Compose with the production settings: ./scripts/dc.sh logs -f app
set -euo pipefail
cd "$(dirname "$0")/.."
touch release.env
exec docker compose --env-file .env --env-file release.env "$@"
