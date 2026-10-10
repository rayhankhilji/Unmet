#!/bin/sh
# Vercel build for apps/web (vercel.json → buildCommand).
# Previews migrate and seed their own Neon branch with the synthetic fixture corpus, so every
# PR deploys a working read-only demo. Production never seeds; its migrations run from CI on
# merge to main (ARCHITECTURE §13).
set -eu
cd "$(dirname "$0")/.."

if [ "${VERCEL_ENV:-}" = "preview" ]; then
  pnpm db:migrate
  pnpm db:seed
fi

pnpm turbo run build --filter=web
