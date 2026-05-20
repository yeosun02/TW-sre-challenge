#!/usr/bin/env bash
# Regenerate Python stubs from proto/metrics/metrics.proto (run from repo root).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON="${ROOT}/agent/.venv/bin/python"

if [[ ! -x "$PYTHON" ]]; then
  echo "Create the venv first: cd agent && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

"$PYTHON" -m grpc_tools.protoc \
  -I "${ROOT}/proto" \
  --python_out="${ROOT}/agent" \
  --grpc_python_out="${ROOT}/agent" \
  metrics/metrics.proto

echo "Generated agent/metrics/metrics_pb2*.py"
