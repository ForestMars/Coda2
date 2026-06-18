#!/usr/bin/env bash

TMP=$(mktemp)

bun test ./tests/unit/*.test.ts --no-cache 2>&1 | tee "$TMP"
EXIT=${PIPESTATUS[0]}

echo ""
echo "=== Test Results ==="

grep -E "^\((pass|fail|skip)\)" "$TMP" | while read -r line; do
  name=$(echo "$line" | sed -E 's/^\((pass|fail|skip)\) //' | sed -E 's/ \[[0-9.]+ms\]$//')
  if [[ "$line" == \(pass\)* ]]; then
    echo -e "  \033[0;32m✓\033[0m $name"
  elif [[ "$line" == \(fail\)* ]]; then
    echo -e "  \033[0;31m✗\033[0m $name"
  elif [[ "$line" == \(skip\)* ]]; then
    echo -e "  \033[0;33m»\033[0m $name"
  fi
done

rm -f "$TMP"
exit $EXIT
