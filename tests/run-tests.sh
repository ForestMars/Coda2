#!/usr/bin/env bash

TMP_FILE="tmp_junit_report.xml"

# 1. Run Bun tests and force JUnit output to the temp file
bun run tests:unit -- --reporter=junit --reporter-outfile="$TMP_FILE" > /dev/null 2>&1 || true

if [ ! -f "$TMP_FILE" ]; then
    echo "Error: Test report file was not generated."
    exit 1
fi

echo -e "\n=== Test Suite Results ===\n"

# 2. Parse the XML using awk to extract attributes reliably
grep -E "<testcase" "$TMP_FILE" | while read -r line; do
    # Extract the name property using an awk match group
    name=$(echo "$line" | awk -F'name="' '{print $2}' | awk -F'"' '{print $1}')
    
    # Extract the file path
    file=$(echo "$line" | awk -F'file="' '{print $2}' | awk -F'"' '{print $1}')
    file_short=$(basename "$file")

    # If the name extraction failed or came up empty, fallback to the raw line structure
    if [ -z "$name" ]; then
        name="Unknown Test Case"
    fi

    # Check for the closed tag structure to determine pass/fail
    if [[ "$line" == *"/"\> ]]; then
        echo -e "  \033[0;32m✓\033[0m $name \033[0;90m($file_short)\033[0m"
    else
        echo -e "  \033[0;31m✗\033[0m $name \033[0;90m($file_short)\033[0m"
    fi
done

echo ""

# 3. Clean up the temp file forcefully
rm -f "$TMP_FILE"
