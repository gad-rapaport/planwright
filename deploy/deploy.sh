#!/usr/bin/env bash
# Server-side deploy helper for a future demo host. Not run by anything today.
#   ./deploy.sh <registry/image@sha256:digest>   deploy a pinned image, roll back automatically if unhealthy
#   ./deploy.sh --rollback                        return to the previously deployed image
# Expects compose.yaml and compose.prod.yaml next to it. The site keeps no data on the server, so a deploy or
# rollback only swaps static files; visitors' plans stay in their browsers. A new version reaches open tabs
# through the service worker's "New version: reload" prompt.
set -euo pipefail
cd "$(dirname "$0")"

history_file=.deploy-history
compose=(docker compose -f compose.yaml -f compose.prod.yaml)

current_image() { tail -n 1 "$history_file" 2>/dev/null || true; }

start() {
  local image="$1"
  IMAGE="$image" "${compose[@]}" pull web
  IMAGE="$image" "${compose[@]}" up -d --wait --wait-timeout 60 web
}

if [[ "${1:-}" == "--rollback" ]]; then
  previous=$(tail -n 2 "$history_file" | head -n 1)
  [[ -n "$previous" ]] || { echo "no previous image recorded" >&2; exit 1; }
  start "$previous"
  echo "$previous" >> "$history_file"
  echo "rolled back to $previous"
  exit 0
fi

image="${1:?usage: deploy.sh <image@digest> | --rollback}"
[[ "$image" == *@sha256:* ]] || { echo "refusing to deploy an unpinned image: $image" >&2; exit 1; }

previous=$(current_image)
if start "$image"; then
  echo "$image" >> "$history_file"
  echo "deployed $image"
else
  echo "new image unhealthy, restoring ${previous:-nothing}" >&2
  [[ -n "$previous" ]] && start "$previous"
  exit 1
fi
