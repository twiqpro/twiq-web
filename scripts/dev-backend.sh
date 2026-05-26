#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../backend"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi

source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
