#!/usr/bin/env bash
set -euo pipefail

repo_root=${1:-"$(cd "$(dirname "$0")/.." && pwd)"}
env_example="$repo_root/.env.example"
env_file="$repo_root/.env"

if [ ! -f "$env_example" ]; then
  echo ".env.example was not found." >&2
  exit 1
fi

generated_auth_secret=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64"))')
default_value() {
  local key=$1
  local value=$2

  case "$key" in
    BETTER_AUTH_SECRET)
      printf '%s' "$generated_auth_secret"
      ;;
    BETTER_AUTH_SECRETS)
      printf '1:%s' "$generated_auth_secret"
      ;;
    *)
      printf '%s' "$value"
      ;;
  esac
}

if [ ! -e "$env_file" ]; then
  env_tmp=$(mktemp "$repo_root/.env.tmp.XXXXXX")
  cleanup() { rm -f "$env_tmp"; }
  trap cleanup EXIT

  while IFS= read -r line || [ -n "$line" ]; do
    if [[ "$line" =~ ^([A-Z][A-Z0-9_]*)=(.*)$ ]]; then
      key=${BASH_REMATCH[1]}
      value=${BASH_REMATCH[2]}
      printf '%s=%s\n' "$key" "$(default_value "$key" "$value")"
    else
      printf '%s\n' "$line"
    fi
  done < "$env_example" > "$env_tmp"

  chmod 600 "$env_tmp"
  mv "$env_tmp" "$env_file"
  trap - EXIT
  printf 'Created .env with local defaults and generated auth secrets'
  exit 0
fi

if [ ! -f "$env_file" ]; then
  echo ".env exists but is not a regular file." >&2
  exit 1
fi

missing_entries=()
while IFS= read -r line || [ -n "$line" ]; do
  if [[ ! "$line" =~ ^([A-Z][A-Z0-9_]*)=(.*)$ ]]; then
    continue
  fi
  key=${BASH_REMATCH[1]}
  value=${BASH_REMATCH[2]}
  if grep -qE "^${key}=" "$env_file"; then
    continue
  fi
  missing_entries+=("${key}=$(default_value "$key" "$value")")
done < "$env_example"

if [ "${#missing_entries[@]}" -eq 0 ]; then
  printf '.env already contains every documented setting'
  exit 0
fi

{
  printf '\n# Added by pnpm dev:live\n'
  printf '%s\n' "${missing_entries[@]}"
} >> "$env_file"

printf 'Added %s missing setting(s) to .env' "${#missing_entries[@]}"
