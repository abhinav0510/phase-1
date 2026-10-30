#!/usr/bin/env bash
# Gets the first HTTPS certificate. Run once, after DNS points at this server. It accepts
# the Let's Encrypt subscriber agreement on behalf of LETSENCRYPT_EMAIL.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
: "${DOMAIN:?set DOMAIN in .env}" "${LETSENCRYPT_EMAIL:?set LETSENCRYPT_EMAIL in .env}"

./scripts/dc.sh up -d nginx
./scripts/dc.sh run --rm --no-deps --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot -d "$DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email --non-interactive
./scripts/dc.sh up -d --force-recreate --no-deps nginx
./scripts/dc.sh up -d certbot
echo "HTTPS is on for https://$DOMAIN"
