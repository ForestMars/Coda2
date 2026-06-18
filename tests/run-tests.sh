#!/usr/bin/env bash

TMP_FILE="tmp_junit_report.xml"

# 1. Force clear old reports
rm -f "$TMP_FILE"

# 2. Force evaluate all matching test files by expanding the glob explicitly.
# We bypass "bun run tests:unit" and invoke "bun test" directly with the files
# to prevent Bun from optimizing out the passing files in the XML report.
bun test ./tests/unit/*.test.ts --reporter=junit --reporter-outfile="$TMP_FILE" --no-cache > /dev/null 2>&1 || true

if [ ! -f "$TMP_FILE" ] || [ ! -s "$TMP_FILE" ]; then
    echo -e "\n\033[0;31mError:\033[0m Bun crashed completely before writing the test report."
    exit 1
fi

echo -e "\n=== Test Suite Results ===\n"

# 3. Collapse XML nodes to single lines and parse
awk '{printf "%s ", $0} /<\/testcase>/ {print ""}' "$TMP_FILE" | while read -r record; do
    [[ "$record" != *"<testcase"* ]] && continue

    # Extract name and file attributes cleanly using sed
    name=$(echo "$record" | sed -E 's/.*name="([^"]*)".*/\1/')
    file=$(echo "$record" | sed -E 's/.*file="([^"]*)".*/\1/')
    file_short=$(basename "$file")

    if [ -z "$name" ]; then
        continue
    fi

    # Determine status
    if [[ "$record" == *"<failure"* ]]; then
        echo -e "  \033[0;31m✗\033[0m $name \033[0;90m($file_short)\033[0m"
    elif [[ "$record" == *"<skipped"* ]]; then
        echo -e "  \033[0;36m- [SKIPPED]\033[0m $name \033[0;90m($file_short)\033[0m"
    else
        echo -e "  \033[0;32m✓\033[0m $name \033[0;90m($file_short)\033[0m"
    fi
done

echo ""

# 4. Clean up
rm -f "$TMP_FILE"
