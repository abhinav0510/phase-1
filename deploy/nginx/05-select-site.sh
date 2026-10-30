#!/bin/sh
# Runs when the nginx container starts, before its templates are rendered. Serves plain
# HTTP until a certificate exists, so a new server can start and pass Let's Encrypt's check.
set -eu
mkdir -p /etc/nginx/templates /var/cache/nginx/static
rm -f /etc/nginx/templates/*
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  cp /etc/nginx/site-templates/https.conf.template /etc/nginx/templates/site.conf.template
  echo "nginx: serving HTTPS for ${DOMAIN}"
else
  cp /etc/nginx/site-templates/http.conf.template /etc/nginx/templates/site.conf.template
  echo "nginx: no certificate yet, serving HTTP for ${DOMAIN}"
fi

# Picks up renewed certificates.
(while :; do sleep 6h; nginx -s reload; done) &
