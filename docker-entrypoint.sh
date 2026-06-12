#!/bin/sh
# Map Docker Swarm secret FILES → env vars the app actually reads.
# Swarm secrets mount at /run/secrets/<name>; Node reads process.env only.
# Env vars already set (e.g. from the stack template) always win.
set -e

if [ -z "${S3_SECRET_ACCESS_KEY:-}" ] && [ -f /run/secrets/s3_secret_access_key ]; then
  S3_SECRET_ACCESS_KEY="$(cat /run/secrets/s3_secret_access_key)"
  export S3_SECRET_ACCESS_KEY
fi

if [ -z "${NEXTAUTH_SECRET:-}" ] && [ -f /run/secrets/app_secret ]; then
  NEXTAUTH_SECRET="$(cat /run/secrets/app_secret)"
  export NEXTAUTH_SECRET
fi

exec "$@"
