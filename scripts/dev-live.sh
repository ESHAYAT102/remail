#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -t 1 ] && command -v tput >/dev/null; then
  bold=$(tput bold)
  dim=$(tput dim)
  amber=$(tput setaf 3)
  green=$(tput setaf 2)
  reset=$(tput sgr0)
else
  bold="" dim="" amber="" green="" reset=""
fi

step() { printf '%s→%s %s\n' "$dim" "$reset" "$1"; }
ok() { printf '%s✓%s %s\n' "$green" "$reset" "$1"; }

env_result=$(bash scripts/scaffold-env.sh)
ok "$env_result"

admin_user=admin
admin_secret=changeme
if [ -f .env ]; then
  env_user=$(grep -E '^STALWART_ADMIN_USER=' .env | head -n1 | cut -d= -f2- || true)
  env_secret=$(grep -E '^STALWART_ADMIN_SECRET=' .env | head -n1 | cut -d= -f2- || true)
  [ -n "${env_user:-}" ] && admin_user=$env_user
  [ -n "${env_secret:-}" ] && admin_secret=$env_secret
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running." >&2
  exit 1
fi

docker compose up -d postgres stalwart

step "Waiting for Postgres"
for i in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U redakt >/dev/null 2>&1; then
    ok "Postgres is ready"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "Postgres did not become ready." >&2
    exit 1
  fi
  sleep 0.5
done

step "Waiting for Stalwart"
for i in $(seq 1 60); do
  if curl -sf -o /dev/null http://localhost:8080/; then
    ok "Stalwart is ready"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "Stalwart did not become ready on :8080." >&2
    exit 1
  fi
  sleep 0.5
done

step "Pushing database schema"
pnpm exec drizzle-kit push --force
ok "Schema is up to date"

printf '\n'
printf '%s── Stalwart setup%s\n' "$amber$bold" "$reset"
printf '\n'
printf '  First boot only: finish the wizard, then close that tab.\n'
printf '  %shttp://localhost:8080/admin%s\n' "$bold" "$reset"
printf '  %s / %s\n' "$admin_user" "$admin_secret"
printf '\n'
printf '  Put the generated admin email and password in .env,\n'
printf '  then use Redakt at %shttp://localhost:3000%s\n' "$bold" "$reset"
printf '  Ignore any later “Sign in to localhost” prompt.\n'
printf '\n'
printf '  %sGuide:%s deploy/stalwart/README.md\n' "$dim" "$reset"
printf '\n'

DEMO_MODE=false exec pnpm dev
