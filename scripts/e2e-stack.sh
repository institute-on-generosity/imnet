#!/usr/bin/env bash
# B-034: a separate local Supabase stack for browser tests (ports 553xx, project "imnet-e2e"), so
# test orgs and posts never appear in the app you browse on :3100. Same migrations and demo seed;
# no seed_local.sql. Usage: npm run e2e:stack (start/refresh), npm run e2e:stack -- stop
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
D=.e2e/supabase
if [ "${1:-}" = "stop" ]; then npx supabase stop --workdir .e2e; exit; fi
mkdir -p "$D"
ln -sfn ../../supabase/migrations "$D/migrations"
ln -sfn ../../supabase/seed-images "$D/seed-images"
for f in seed.sql seed_demo.sql; do ln -sfn "../../supabase/$f" "$D/$f"; done
sed -e 's/^project_id = "imnet"/project_id = "imnet-e2e"/' \
    -e 's/= 543\([0-9][0-9]\)$/= 553\1/' \
    -e 's/^inspector_port = 8083/inspector_port = 8183/' \
    -e 's/localhost:3100/localhost:3200/g' \
    -e 's|, "./seed_local\*.sql"||' \
    supabase/config.toml > "$D/config.toml"
# Reset the test database whenever migrations or the seed change, so tests see the current data.
HASH=$(cat supabase/migrations/*.sql supabase/seed.sql supabase/seed_demo.sql | shasum | cut -d' ' -f1)
if npx supabase status --workdir .e2e >/dev/null 2>&1; then
  if [ "$(cat .e2e/.seed-hash 2>/dev/null)" != "$HASH" ]; then
    npx supabase db reset --local --workdir .e2e
    npx supabase seed buckets --local --workdir .e2e
  fi
else
  npx supabase start --workdir .e2e -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,realtime,postgres-meta
  npx supabase seed buckets --local --workdir .e2e
fi
echo "$HASH" > .e2e/.seed-hash
