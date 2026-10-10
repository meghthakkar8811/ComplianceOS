#!/usr/bin/env bash
# Local dev setup: port-forwards the rest service and serves this static frontend.
# Usage: ./dev.sh [frontend-port] [backend-port]
# The backend's local CORS tier (deploy/k8s/rest/tiers/local/values.yaml) accepts any
# http://localhost:<port> origin, so any free frontend port works here.
set -euo pipefail

NAMESPACE="${NAMESPACE:-complianceos}"
SERVICE="${SERVICE:-rest-local}"
FRONTEND_PORT="${1:-${FRONTEND_PORT:-3000}}"
BACKEND_PORT="${2:-${BACKEND_PORT:-8080}}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

command -v kubectl >/dev/null || { echo "kubectl not found on PATH" >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 not found on PATH" >&2; exit 1; }

port_in_use() {
  if command -v lsof >/dev/null; then
    lsof -i ":$1" -sTCP:LISTEN >/dev/null 2>&1
  else
    (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && exec 3>&-
  fi
}

if port_in_use "$BACKEND_PORT"; then
  echo "Port $BACKEND_PORT is already in use. Free it, or pick another: ./dev.sh $FRONTEND_PORT <other port>" >&2
  exit 1
fi
if port_in_use "$FRONTEND_PORT"; then
  echo "Port $FRONTEND_PORT is already in use. Pick another: ./dev.sh <other port>" >&2
  exit 1
fi

if ! kubectl get svc "$SERVICE" -n "$NAMESPACE" >/dev/null 2>&1; then
  echo "Service $SERVICE not found in namespace $NAMESPACE." >&2
  echo "Is the backend deployed (deploycos deploy -t local ...)? Override NAMESPACE/SERVICE env vars if it's named differently." >&2
  exit 1
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
if [ "$BACKEND_PORT" != "8080" ]; then
  echo "NOTE: js/api.js's API_ORIGIN is hardcoded to http://localhost:8080 — update it to http://localhost:$BACKEND_PORT to match."
fi
echo "Serving frontend at http://localhost:$FRONTEND_PORT/login.html"
echo "Ctrl+C stops both."
echo

python3 -m http.server "$FRONTEND_PORT"
