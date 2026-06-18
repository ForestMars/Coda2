#!/usr/bin/env bash

TMP=$(mktemp)

bun test ./tests/unit/*.test.ts --no-cache 2>&1 | tee "$TMP"
EXIT=${PIPESTATUS[0]}

echo ""
echo "=== Test Results ==="
grep -E "^\((pass|fail|skip)\)" "$TMP"
rm -f "$TMP"

exit $EXIT
