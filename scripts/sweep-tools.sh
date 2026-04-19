#!/usr/bin/env bash
# sweep-tools.sh — POST {} at every tool and bucket the results.
#
# Usage:   PORT=3000 ./scripts/sweep-tools.sh
#          ./scripts/sweep-tools.sh 2999
# Exit:    0 if no `http_non_200` / `other_error` rows, 1 otherwise.
#
# Requires: curl, jq.

set -u
set +e

PORT="${1:-${PORT:-3000}}"
HOST="127.0.0.1"
BASE="http://${HOST}:${PORT}"
TMPDIR="${TMPDIR:-/tmp}"
TMPFILE="${TMPDIR%/}/mcp-sweep-$$.jsonl"
trap 'rm -f "$TMPFILE"' EXIT

if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required" >&2
    exit 2
fi
if ! command -v jq >/dev/null 2>&1; then
    echo "jq is required" >&2
    exit 2
fi

# Fetch the tool list.
if ! tools_json=$(curl -sS -m 5 "${BASE}/api/tools"); then
    echo "Failed to GET ${BASE}/api/tools — is the server running?" >&2
    exit 2
fi

# POSIX-friendly line list (avoid bash-4+ `mapfile`).
targets_raw=$(echo "$tools_json" | jq -r '
  .tools[]
  | select(.longRunning != true)
  | "\(.category) \(.toolName)"
')

total=0
while IFS= read -r _; do total=$((total + 1)); done <<EOF
$targets_raw
EOF
if [ "$total" -eq 0 ] || [ -z "$targets_raw" ]; then
    echo "No tools returned — did /api/tools respond with an empty list?" >&2
    exit 2
fi

tmp_body="${TMPDIR%/}/mcp-sweep-body-$$"
: > "$tmp_body"
: > "$TMPFILE"

echo "$targets_raw" | while IFS= read -r entry; do
    [ -z "$entry" ] && continue
    category="${entry%% *}"
    tool_name="${entry#* }"
    full="${category}_${tool_name}"
    http_code=$(
        curl -sS -m 5 -o "$tmp_body" -w '%{http_code}' \
            -X POST "${BASE}/api/${category}/${tool_name}" \
            -H 'Content-Type: application/json' \
            -d '{}' 2>/dev/null || echo '000'
    )
    body="$(cat "$tmp_body" 2>/dev/null || true)"
    bucket=other_error
    if [[ "$http_code" != "200" ]]; then
        bucket=http_non_200
    else
        err=$(echo "$body" | jq -r '.error // .result.error // ""' 2>/dev/null || echo "")
        success=$(echo "$body" | jq -r '.success // .result.success // "false"' 2>/dev/null || echo "false")
        if [[ "$success" == "true" ]]; then
            bucket=success_true
        elif [[ "$err" == required_arg_missing* ]]; then
            bucket=required_arg_missing
        elif [[ "$err" == unsupported_on_engine_2* ]]; then
            bucket=unsupported_on_engine_2
        elif [[ "$err" == invalid_target_node* ]]; then
            bucket=invalid_target_node
        elif [[ "$err" == tool_timeout* ]]; then
            bucket=tool_timeout
        else
            bucket=other_error
        fi
    fi
    printf '{"tool":"%s","status":%s,"bucket":"%s","error":%s}\n' \
        "$full" "$http_code" "$bucket" "$(echo "$body" | jq -c '.error // .result.error // null' 2>/dev/null || echo null)" \
        >> "$TMPFILE"
done

rm -f "$tmp_body"

# Count buckets from the JSONL log (the pipe-loop runs in a subshell, so
# accumulating counters in-loop is lost on exit).
count_bucket() {
    local k="$1"
    jq -r 'select(.bucket == "'"$k"'") | 1' < "$TMPFILE" 2>/dev/null | wc -l | tr -d ' '
}

# Print the table.
printf '\nMCP sweep — %s tools at %s\n\n' "$total" "$BASE"
printf '  %-24s %6s\n' bucket count
printf '  %-24s %6s\n' '------' '-----'
for k in success_true required_arg_missing unsupported_on_engine_2 invalid_target_node tool_timeout other_error http_non_200; do
    printf '  %-24s %6s\n' "$k" "$(count_bucket "$k")"
done
printf '\n  log: %s\n' "$TMPFILE"
cp "$TMPFILE" "${TMPDIR%/}/mcp-sweep.jsonl" 2>/dev/null || true
printf '  copy: %s\n' "${TMPDIR%/}/mcp-sweep.jsonl"

fail=0
non200=$(count_bucket http_non_200)
other=$(count_bucket other_error)
if [ "$non200" != "0" ] || [ "$other" != "0" ]; then
    fail=1
fi
exit $fail
