#!/usr/bin/env bash
# Runs ON THE SERVER (in ~/memodeum) as the last step of a deploy.
# The GitHub workflow has already copied the deploy files here and loaded the
# new image into Docker. This script switches the running app over to it.
#
# Usage: IMAGE_TAG=<tag> bash remote-deploy.sh
set -euo pipefail

: "${IMAGE_TAG:?IMAGE_TAG must be set}"
cd "$(dirname "$0")"

# Files we create here (.env) must be readable by this user only.
umask 077

# First deploy only: generate a random database password.
if [ ! -f .env ]; then
  echo "First deploy: creating .env with a generated database password"
  printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)" > .env
fi

# Record which image is live, so plain `docker compose ...` commands run by hand
# on the server also know the tag.
{ grep -v '^IMAGE_TAG=' .env || true; } > .env.new
printf 'IMAGE_TAG=%s\n' "$IMAGE_TAG" >> .env.new
mv .env.new .env

# Start or update the stack. Containers whose config/image didn't change
# (database, Caddy) are left alone; only the app is replaced.
docker compose up -d --remove-orphans

# Wait for the new app container to report healthy.
echo "Waiting for the app to become healthy..."
for attempt in $(seq 1 30); do
  container_id="$(docker compose ps -q app)"
  status="$(docker inspect --format '{{.State.Health.Status}}' "$container_id" 2>/dev/null || echo starting)"
  if [ "$status" = "healthy" ]; then
    echo "App is healthy."
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "App did not become healthy in time. Recent logs:" >&2
    docker compose logs --tail=50 app >&2
    exit 1
  fi
  sleep 3
done

# Tidy up: keep the 3 newest app images (for quick rollbacks), delete the rest.
# `docker images` lists newest first; images still in use can't be removed
# and are skipped.
docker images memodeum-app --format '{{.Repository}}:{{.Tag}}' \
  | tail -n +4 \
  | xargs -r docker rmi >/dev/null 2>&1 || true

echo "Deployed ${IMAGE_TAG}."
