#!/usr/bin/env bash
# Fail if tool classes call Editor.Message directly (must use IEditorAdapter).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if rg -n "Editor\\.Message" "$ROOT/source/tools" --glob '*.ts' 2>/dev/null; then
  echo "ERROR: Editor.Message found under source/tools — route via IEditorAdapter instead." >&2
  exit 1
fi
echo "OK: no Editor.Message in source/tools"
