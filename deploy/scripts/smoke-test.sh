#!/usr/bin/env bash
# Checks a running site from the outside: ./scripts/smoke-test.sh https://portal.example.com
# Only sends GET requests and changes nothing. Set CURL_EXTRA=-k for a self-signed certificate.
set -euo pipefail
BASE="${1:?usage: smoke-test.sh <base url>}"
FAILED=0
CURL=(curl -sS --max-time 20 ${CURL_EXTRA:-})

check() {
  if [ "$2" = "$3" ]; then echo "ok    $1"; else echo "FAIL  $1: expected '$3', got '$2'"; FAILED=1; fi
}
status() { "${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE$1"; }
header() { "${CURL[@]}" -o /dev/null -D - "$BASE$1" | tr -d '\r' | awk -v h="$(echo "$2" | tr 'A-Z' 'a-z'):" 'tolower($1)==h {sub(/^[^:]*: */,""); print; exit}'; }

check "health"                  "$(status /api/health)" 200
check "health reaches Supabase" "$(status '/api/health?deep=1')" 200
check "homepage"                "$(status /)" 200
check "sign-in page"            "$(status /login)" 200
check "robots.txt"              "$(status /robots.txt)" 200
check "portal needs sign-in"    "$(status /dashboard)" 307
LOCATION="$(header /dashboard location)"
check "redirect stays on site"  "${LOCATION#"$BASE"}" "/login?redirect=%2Fdashboard"
check "no framework banner"     "$(header / x-powered-by)" ""
check "frames blocked"          "$(header / x-frame-options)" DENY
check "no MIME sniffing"        "$(header / x-content-type-options)" nosniff
check "CSP present"             "$(header / content-security-policy | cut -d' ' -f1)" default-src

ASSET="$("${CURL[@]}" "$BASE/login" | grep -oE '/_next/static/[^"\\]+\.js' | head -1 || true)"
if [ -n "$ASSET" ]; then
  check "static files"          "$(status "$ASSET")" 200
else
  check "static files"          "not found in page" "present"
fi

[ "$FAILED" = 0 ] && echo "All checks passed." || { echo "Some checks failed."; exit 1; }
