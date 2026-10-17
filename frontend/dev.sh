#!/usr/bin/env bash
# Local dev setup: serves this static frontend, port-forwarding the rest service for the
# local tier (default). For the remote (mining) tier, this points the frontend at its public
# ingress instead — no port-forward needed.
# Usage: ./dev.sh [local|remote] [frontend-port] [backend-port]
# backend-port only applies to local mode. The backend's local CORS tier
# (deploy/k8s/rest/tiers/local/values.yaml) accepts any http://localhost:<port> origin, so any
# free frontend port works for either mode.
set -euo pipefail

MODE="local"
if [ "${1:-}" = "local" ] || [ "${1:-}" = "remote" ]; then
  MODE="$1"
  shift
fi

NAMESPACE="${NAMESPACE:-complianceos}"
SERVICE="${SERVICE:-rest-local}"
REMOTE_ORIGIN="${REMOTE_ORIGIN:-https://agentengine.duckdns.org}"
FRONTEND_PORT="${1:-${FRONTEND_PORT:-3000}}"
BACKEND_PORT="${2:-${BACKEND_PORT:-8080}}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

command -v python3 >/dev/null || { echo "python3 not found on PATH" >&2; exit 1; }

port_in_use() {
  if command -v lsof >/dev/null; then
    lsof -i ":$1" -sTCP:LISTEN >/dev/null 2>&1
  else
    (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && exec 3>&-
  fi
}

# api.js defaults to http://localhost:8080 on its own when served from localhost, so an
# override is only needed when that wouldn't be right: local mode on a non-default backend
# port, or remote mode (served from localhost, but talking to the deployed backend).
write_override() {
  echo "window.API_ORIGIN_OVERRIDE = '$1';" >js/env.local.js
}
clear_override() {
  rm -f js/env.local.js
}

if port_in_use "$FRONTEND_PORT"; then
  echo "Port $FRONTEND_PORT is already in use. Pick another: ./dev.sh $MODE <other port>" >&2
  exit 1
fi

if [ "$MODE" = "remote" ]; then
  write_override "$REMOTE_ORIGIN"
  echo "Remote mode: not port-forwarding anything — js/api.js will call $REMOTE_ORIGIN."
  echo "Serving frontend at http://localhost:$FRONTEND_PORT/login.html"
  echo "Ctrl+C stops it."
  echo

  python3 -m http.server "$FRONTEND_PORT"
  exit 0
fi

command -v kubectl >/dev/null || { echo "kubectl not found on PATH" >&2; exit 1; }

if port_in_use "$BACKEND_PORT"; then
  echo "Port $BACKEND_PORT is already in use. Free it, or pick another: ./dev.sh $MODE $FRONTEND_PORT <other port>" >&2
  exit 1
fi

if ! kubectl get svc "$SERVICE" -n "$NAMESPACE" >/dev/null 2>&1; then
  echo "Service $SERVICE not found in namespace $NAMESPACE." >&2
  echo "Is the backend deployed (deploycos deploy -t local ...)? Override NAMESPACE/SERVICE env vars if it's named differently." >&2
  exit 1
fi

if [ "$BACKEND_PORT" != "8080" ]; then
  write_override "http://localhost:$BACKEND_PORT"
else
  clear_override
fi

PORT_FORWARD_LOG="$(mktemp)"
kubectl port-forward -n "$NAMESPACE" "svc/$SERVICE" "$BACKEND_PORT:$BACKEND_PORT" >"$PORT_FORWARD_LOG" 2>&1 &
PORT_FORWARD_PID=$!

cleanup() {
  kill "$PORT_FORWARD_PID" 2>/dev/null || true
  rm -f "$PORT_FORWARD_LOG"
}
trap cleanup EXIT INT TERM

# Give the port-forward a moment to come up, and fail loudly if it didn't.
for _ in $(seq 1 20); do
  if ! kill -0 "$PORT_FORWARD_PID" 2>/dev/null; then
    echo "Port-forward to $SERVICE died:" >&2
    cat "$PORT_FORWARD_LOG" >&2
    exit 1
  fi
  if grep -q "Forwarding from" "$PORT_FORWARD_LOG" 2>/dev/null; then
    break
  fi
  sleep 0.5
done

echo "Backend reachable at http://localhost:$BACKEND_PORT (forwarded from $SERVICE in $NAMESPACE)"
echo "Serving frontend at http://localhost:$FRONTEND_PORT/login.html"
echo "Ctrl+C stops both."
echo

python3 -m http.server "$FRONTEND_PORT"
