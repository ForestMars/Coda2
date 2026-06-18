#!/usr/bin/env bash

TMP_FILE="tmp_junit_report.xml"

# 1. Run Bun tests and force JUnit output to the temp file
# We use '|| true' so the script doesn't exit prematurely when a test fails.
bun run tests:unit -- --reporter=junit --reporter-outfile="$TMP_FILE" > /dev/null 2>&1 || true

if [ ! -f "$TMP_FILE" ]; then
    echo "Error: Test report file was not generated."
    exit 1
fi

echo -e "\n=== Test Suite Results ===\n"

# 2. Parse the XML line-by-line using standard sed/awk/grep
# This checks if a testcase block is closed (passed) or open/contains a failure tag.
grep -E "<testcase" "$TMP_FILE" | while read -r line; do
    # Extract the test name from the name="..." attribute
    name=$(echo "$line" | sed -E 's/.*name="([^"]*)".*/\1/')
    # Extract the file path
    file=$(echo "$line" | sed -E 's/.*file="([^"]*)".*/\1/')
    
    # Clean up the path format for readability
    file_short=$(basename "$file")

    # If the line ends with '/>', it passed. Otherwise, it has a child <failure> tag.
    if [[ "$line" == *"/"\> ]]; then
        echo -e "  \033[0;32m✓\033[0m $name \033[0;90m($file_short)\033[0m"
    else
        echo -e "  \033[0;31m✗\033[0m $name \033[0;90m($file_short)\033[0m"
    fi
done

echo ""

# 3. Clean up the temp file silently and forcefully
rm -f "$TMP_FILE"
