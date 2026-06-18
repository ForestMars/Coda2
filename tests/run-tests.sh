#!/usr/bin/env bash

TMP_FILE="tmp_junit_report.xml"

# 1. Force clear old reports
rm -f "$TMP_FILE"

# 2. Run the tests fresh
bun run tests:unit -- --reporter=junit --reporter-outfile="$TMP_FILE" --no-cache > /dev/null 2>&1 || true

if [ ! -f "$TMP_FILE" ] || [ ! -s "$TMP_FILE" ]; then
    echo -e "\n\033[0;31mError:\033[0m Bun crashed before writing the test report."
    exit 1
fi

echo -e "\n=== Test Suite Results ===\n"

# 3. Use standard awk to flatten records onto single lines, then parse with portable sed
awk '{printf "%s ", $0} /<\/testcase>/ {print ""}' "$TMP_FILE" | while read -r record; do
    # Skip lines that don't contain a testcase node
    [[ "$record" != *"<testcase"* ]] && continue

    # Extract name and file properties cleanly using sed
    name=$(echo "$record" | sed -E 's/.*name="([^"]*)".*/\1/')
    file=$(echo "$record" | sed -E 's/.*file="([^"]*)".*/\1/')
    file_short=$(basename "$file")

    # Determine status by checking for failure/skipped strings inside the block
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
