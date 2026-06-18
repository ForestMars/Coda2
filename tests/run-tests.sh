#!/usr/bin/env bash

TMP_FILE="tmp_junit_report.xml"

# 1. Force clear old reports
rm -f "$TMP_FILE"

# 2. Run the tests fresh and suppress stdout
bun test ./tests/unit/*.test.ts --reporter=junit --reporter-outfile="$TMP_FILE" --no-cache > /dev/null 2>&1 || true

if [ ! -f "$TMP_FILE" ] || [ ! -s "$TMP_FILE" ]; then
    echo -e "\n\033[0;31mError:\033[0m Bun crashed completely before writing the test report."
    exit 1
fi

echo -e "\n=== Test Suite Results ===\n"

# 3. Read the file line-by-line using native Bash regex matching
CURRENT_NAME=""
CURRENT_FILE=""
IS_FAIL=0
IS_SKIP=0

# Pre-compile the regex strings for native Bash processing
NAME_REGEX='name="([^"]*)"'
FILE_REGEX='file="([^"]*)"'

while read -r line; do
    # If we hit an opening testcase tag, extract the properties using native Bash [[ $str =~ regex ]]
    if [[ "$line" == *"<testcase"* ]]; then
        
        if [[ "$line" =~ $NAME_REGEX ]]; then
            CURRENT_NAME="${BASH_REMATCH[1]}"
        fi
        
        if [[ "$line" =~ $FILE_REGEX ]]; then
            FILE_PATH="${BASH_REMATCH[1]}"
            CURRENT_FILE=$(basename "$FILE_PATH")
        fi
        
        IS_FAIL=0
        IS_SKIP=0
        
        # If the tag is self-closing (/>), it's a pass. Print it immediately.
        if [[ "$line" == *"/"\> ]]; then
            echo -e "  \033[0;32m✓\033[0m $CURRENT_NAME \033[0;90m($CURRENT_FILE)\033[0m"
            CURRENT_NAME=""
        fi
    
    # Check inner block states
    elif [[ "$line" == *"<failure"* ]]; then
        IS_FAIL=1
    elif [[ "$line" == *"<skipped"* ]]; then
        IS_SKIP=1
        
    # When we hit the closing tag of an open block, print the collected metrics
    elif [[ "$line" == *"</testcase>"* && -n "$CURRENT_NAME" ]]; then
        if [ $IS_FAIL -eq 1 ]; then
            echo -e "  \033[0;31m✗\033[0m $CURRENT_NAME \033[0;90m($CURRENT_FILE)\033[0m"
        elif [ $IS_SKIP -eq 1 ]; then
            echo -e "  \033[0;36m- [SKIPPED]\033[0m $CURRENT_NAME \033[0;90m($CURRENT_FILE)\033[0m"
        fi
        CURRENT_NAME=""
    fi
done < "$TMP_FILE"

echo ""

# 4. Clean up
rm -f "$TMP_FILE"
