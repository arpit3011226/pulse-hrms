#!/usr/bin/env bash
#
# Build the database from nothing, the way a new environment has to.
#
# Two faults reached the Azure move because production was the only database
# that had ever run these files: a filesystem path pasted into 00020, and
# 00017 re-declaring `notifications` so that it silently skipped and then
# failed on an index — taking every migration after it with it.
#
# Neither is visible from a database that already exists. This is the check
# that makes them visible, and it is the one to run before a release.
#
# USAGE
#
#   Against a throwaway database you already have:
#     PULSE_REPLAY_URL=postgres://user:pass@host:5432/postgres \
#       ./QA/scripts/replay_migrations.sh
#
#   Against a local Postgres in Docker (it creates and removes the container):
#     ./QA/scripts/replay_migrations.sh --docker
#
# IT MUST BE AN EMPTY, THROWAWAY DATABASE. The first thing it does is drop
# the public schema. It refuses to run against anything whose name does not
# look disposable, but do not rely on that alone.

set -uo pipefail
cd "$(dirname "$0")/../.."

MIGRATIONS=(supabase/migrations/*.sql)
CONTAINER="pulse-replay-$$"
USE_DOCKER=0
[ "${1:-}" = "--docker" ] && USE_DOCKER=1

cleanup() {
  if [ "$USE_DOCKER" = "1" ]; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [ "$USE_DOCKER" = "1" ]; then
  command -v docker >/dev/null || { echo "docker not found"; exit 2; }
  echo "Starting a throwaway Postgres…"
  docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=replay \
    -p 55432:5432 postgres:15-alpine >/dev/null || exit 2
  PULSE_REPLAY_URL="postgres://postgres:replay@localhost:55432/postgres"
  until docker exec "$CONTAINER" pg_isready -q 2>/dev/null; do sleep 1; done
  sleep 2
fi

: "${PULSE_REPLAY_URL:?Set PULSE_REPLAY_URL, or pass --docker}"

# A small guard against the obvious accident.
case "$PULSE_REPLAY_URL" in
  *prod*|*production*|*live*)
    echo "That URL looks like production. Refusing." ; exit 2 ;;
esac

psql() { command psql "$PULSE_REPLAY_URL" --no-psqlrc --quiet -v ON_ERROR_STOP=1 "$@"; }

echo "Replaying ${#MIGRATIONS[@]} migrations into an empty database"
echo

# ── What Supabase provides and a bare Postgres does not ──────────────────
#
# Every policy in this project is written against these role names and
# against auth.uid(). On Supabase they already exist. Anywhere else they have
# to be created first, or every migration fails on the first policy.
#
# This is also the list your Azure setup needs, which is why it is spelled
# out rather than hidden in a fixture.
psql -c "
  DROP SCHEMA IF EXISTS public CASCADE;
  CREATE SCHEMA public;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE SCHEMA IF NOT EXISTS storage;
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";

  DO \$\$ BEGIN
    CREATE ROLE anon NOLOGIN NOINHERIT;              EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;
  DO \$\$ BEGIN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;     EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;
  DO \$\$ BEGIN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;
  DO \$\$ BEGIN
    CREATE ROLE supabase_auth_admin NOLOGIN NOINHERIT;    EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;
  DO \$\$ BEGIN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'replay'; EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;

  GRANT anon, authenticated, service_role TO authenticator;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

  -- Stand-ins for what GoTrue owns. The migrations reference these.
  CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY,
    email TEXT,
    encrypted_password TEXT,
    email_confirmed_at TIMESTAMPTZ,
    raw_app_meta_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS auth.identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    provider TEXT
  );
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
    \$f\$ SELECT nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid \$f\$;
  CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS
    \$f\$ SELECT nullif(current_setting('request.jwt.claims', true)::json->>'role','') \$f\$;

  -- Stand-ins for the Storage API's own tables.
  CREATE TABLE IF NOT EXISTS storage.buckets (
    id TEXT PRIMARY KEY, name TEXT, public BOOLEAN DEFAULT false,
    file_size_limit BIGINT, allowed_mime_types TEXT[]
  );
  CREATE TABLE IF NOT EXISTS storage.objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id TEXT REFERENCES storage.buckets(id),
    name TEXT, owner UUID, metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE OR REPLACE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[]
    LANGUAGE sql IMMUTABLE AS \$f\$ SELECT string_to_array(name, '/') \$f\$;
" >/dev/null 2>&1 || { echo "Could not prepare the database."; exit 2; }

failed=0
for f in "${MIGRATIONS[@]}"; do
  name=$(basename "$f")
  if out=$(psql -f "$f" 2>&1); then
    printf '  ok    %s\n' "$name"
  else
    printf '  FAIL  %s\n' "$name"
    printf '%s\n' "$out" | grep -E '^(psql:|ERROR|DETAIL|HINT)' | head -4 | sed 's/^/          /'
    failed=$((failed + 1))
    # Stop at the first failure. Everything after it is noise — that is
    # exactly how one broken file hid three more.
    echo
    echo "  Stopped here. Migrations after this one were not attempted."
    break
  fi
done

echo
if [ "$failed" -eq 0 ]; then
  echo "  All ${#MIGRATIONS[@]} migrations replayed into an empty database."
else
  echo "  Replay failed."
fi
exit "$failed"
