#!/usr/bin/env bash

TMP_FILE="tmp_junit_report.xml"

# 1. Force clear any old reports so we never read stale data
rm -f "$TMP_FILE"

# 2. Run the tests fresh. 
# We add --no-cache to stop Bun from optimizing away your runs.
bun run tests:unit -- --reporter=junit --reporter-outfile="$TMP_FILE" --no-cache > /dev/null 2>&1 || true

# 3. If Bun crashed completely before it could even write the XML
if [ ! -f "$TMP_FILE" ] || [ ! -s "$TMP_FILE" ]; then
    echo -e "\n\033[0;31mError:\033[0m Bun or Ollama crashed hard before writing the test report."
    echo "Check your background terminal or run 'bun run tests:unit' raw to see the panic."
    exit 1
fi

echo -e "\n=== Test Suite Results ===\n"

# 4. Parse the fresh XML file
grep -E "<testcase" "$TMP_FILE" | while read -r line; do
    name=$(echo "$line" | awk -F'name="' '{print $2}' | awk -F'"' '{print $1}')
    file=$(echo "$line" | awk -F'file="' '{print $2}' | awk -F'"' '{print $1}')
    file_short=$(basename "$file")

    if [ -z "$name" ]; then
        name="Unknown Test Case"
    fi

    if [[ "$line" == *"/"\> ]]; then
        echo -e "  \033[0;32m✓\033[0m $name \033[0;90m($file_short)\033[0m"
    else
        echo -e "  \033[0;31m✗\033[0m $name \033[0;90m($file_short)\033[0m"
    fi
done

echo ""

# 5. Clean up the temp file forcefully
rm -f "$TMP_FILE"
