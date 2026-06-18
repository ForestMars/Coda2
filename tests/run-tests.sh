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

# 3. Parse using awk, treating </testcase> as the record separator 
# This lets us safely inspect the entire block of each test, even across lines.
awk -v RS="</testcase>" '
NF {
    # Extract name
    match($0, /name="([^"]*)"/, n)
    name = n[1]
    
    # Extract file
    match($0, /file="([^"]*)"/, f)
    file_short = f[1]
    sub(/.*\//, "", file_short) # Grabs just the filename

    if (!name) next

    # Determine status by looking for child tags within the block
    if ($0 ~ /<failure/) {
        printf "  \033[0;31m✗\033[0m %s \033[0;90m(%s)\033[0m\n", name, file_short
    } else if ($0 ~ /<skipped/) {
        printf "  \033[0;36m- [SKIPPED]\033[0m %s \033[0;90m(%s)\033[0m\n", name, file_short
    } else {
        printf "  \033[0;32m✓\033[0m %s \033[0;90m(%s)\033[0m\n", name, file_short
    }
}
' "$TMP_FILE"

echo ""

# 4. Clean up
rm -f "$TMP_FILE"
