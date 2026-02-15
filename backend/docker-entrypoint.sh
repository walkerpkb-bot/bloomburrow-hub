#!/bin/sh
set -e

# Seed templates and prompts into the data volume on first run
if [ ! -f /app/data/templates/.seeded ]; then
    cp -rn /app/seed/templates/* /app/data/templates/ 2>/dev/null || true
    touch /app/data/templates/.seeded
fi

mkdir -p /app/data/campaigns /app/data/images

exec "$@"
