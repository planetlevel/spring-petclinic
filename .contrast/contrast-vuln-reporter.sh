#!/bin/bash
#
# Contrast Vulnerability Reporter Hook (UserPromptSubmit)
#
# Watches for new vulnerability findings and reports them to Claude.
# Uses the shared trace-parser library for consistent parsing.
#
# Configuration (environment variables):
#   CONTRAST_RESULTS_DIR - Path to results dir (default: ./contrast-results)
#   CONTRAST_SEEN_FILE - Path to track reported vulns (default: .contrast-seen)
#   CONTRAST_WORKSPACE - Workspace root for package discovery (default: .)
#   CONTRAST_DEBUG - Set to "true" for debug logging
#

set -e

# Read hook input from stdin
INPUT=$(cat)

# Debug logging
debug() {
    if [ "$CONTRAST_DEBUG" = "true" ]; then
        echo "[contrast-vuln] $1" >&2
    fi
}

# Configuration
RESULTS_DIR="${CONTRAST_RESULTS_DIR:-./contrast-results}"
SEEN_FILE="${CONTRAST_SEEN_FILE:-.contrast-seen}"
WORKSPACE="${CONTRAST_WORKSPACE:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

debug "Checking for new vulnerabilities in $RESULTS_DIR"

# Check if results dir exists
if [ ! -d "$RESULTS_DIR" ]; then
    debug "Results directory not found: $RESULTS_DIR"
    echo '{}'
    exit 0
fi

# Use shared library CLI to find new vulns
CLI_PATH="$SCRIPT_DIR/lib/cli.js"
if [ ! -f "$CLI_PATH" ]; then
    debug "CLI not found at $CLI_PATH"
    echo '{}'
    exit 0
fi

# Run the CLI and capture output
RESULT=$(node "$CLI_PATH" check-new "$RESULTS_DIR" "$SEEN_FILE" "$WORKSPACE" 2>/dev/null) || {
    debug "CLI failed"
    echo '{}'
    exit 0
}

debug "CLI result: $RESULT"

# Parse the result
COUNT=$(echo "$RESULT" | jq -r '.count // 0')

if [ "$COUNT" -eq 0 ]; then
    debug "No new vulnerabilities found"
    echo '{}'
    exit 0
fi

# Build human-readable report from JSON
REPORT=$(echo "$RESULT" | jq -r '
    .vulns[] |
    "---\nVULNERABILITY: \(.ruleId)\n  Route: \(.route)\n  Source: \(.source.type) \"\(.source.name)\"\n  App Code: \(.appCode.file // "unknown"):\(.appCode.line // "?") in \(.appCode.method // "unknown")()\n  Sink: \(.sink)\nFIX: \(.remediation)\n"
')

# Build JSON response with the report
cat << EOF
{
  "additionalContext": "CONTRAST SECURITY: $COUNT new vulnerability(ies) detected!\n\n$REPORT"
}
EOF
