#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PYTHON="${ROOT}/.venv/bin/python"
if [[ ! -x "$PYTHON" ]]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
  "${ROOT}/.venv/bin/pip" install -q pandas openpyxl
  PYTHON="${ROOT}/.venv/bin/python"
fi

echo "==> Validating question tags"
"$PYTHON" validate_question_tags.py

echo "==> Normalizing Excel categories, original categories, and tags"
"$PYTHON" normalize_categories.py

echo "==> Building Brewing Intelligence solution links"
"$PYTHON" solution_links.py

echo "==> Generating data.js"
"$PYTHON" generate_data_js.py

echo "==> Generating venn_data.json"
"$PYTHON" compute_overlaps.py

echo "==> Validating outputs"
"$PYTHON" validate_data.py

echo "Done. Refresh the browser to load updated data."
