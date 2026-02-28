#!/bin/bash
#
# Contrast Agent Injection Hook
#
# Automatically injects -javaagent when Claude runs a Java app.
# Install: Copy to your project and configure in .claude/settings.local.json
#
# Configuration (environment variables):
#   CONTRAST_AGENT_PATH - Path to contrast.jar (default: ./contrast.jar)
#   CONTRAST_CONFIG_PATH - Path to contrast_security.yaml (optional)
#   CONTRAST_DEBUG - Set to "true" for debug logging
#

set -e

# Read hook input from stdin
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Debug logging
debug() {
    if [ "$CONTRAST_DEBUG" = "true" ]; then
        echo "[contrast-hook] $1" >&2
    fi
}

debug "Received command: $COMMAND"

# Find the Contrast agent JAR
# Priority: 1) CONTRAST_AGENT_PATH env var, 2) .contrast/, 3) /opt/contrast/
find_agent() {
    # Check explicit env var first
    if [ -n "$CONTRAST_AGENT_PATH" ] && [ -f "$CONTRAST_AGENT_PATH" ]; then
        echo "$CONTRAST_AGENT_PATH"
        return
    fi

    # Check .contrast directory (installed by npx contrast-claude init)
    if [ -f "./.contrast/contrast.jar" ]; then
        echo "./.contrast/contrast.jar"
        return
    fi

    # Check for versioned jar in .contrast/ (e.g., contrast-agent-6.19.0.jar)
    local versioned=$(ls -1 ./.contrast/contrast-agent-*.jar 2>/dev/null | head -1)
    if [ -n "$versioned" ] && [ -f "$versioned" ]; then
        echo "$versioned"
        return
    fi

    # Check /opt/contrast/
    if [ -f "/opt/contrast/contrast.jar" ]; then
        echo "/opt/contrast/contrast.jar"
        return
    fi

    # Not found
    echo ""
}

# Agent configuration
AGENT_PATH=$(find_agent)
CONFIG_PATH="${CONTRAST_CONFIG_PATH:-}"

debug "Agent path: $AGENT_PATH"

# Patterns that indicate "run the JVM with app code"
# These are commands where we want to attach the agent
APP_RUN_PATTERNS=(
    "java -jar"
    "java -cp"
    "bootRun"
    "spring-boot:run"
    "quarkus:dev"
    "quarkus:test"
    "micronaut:run"
    "run-app"
    "appRun"
    "./gradlew test"
    "./gradlew iT"
    "./gradlew integrationTest"
    "gradle test"
    "gradlew test"
    "mvn test"
    "mvn verify"
    "mvn integration-test"
    "mvn spring-boot:run"
)

# Patterns that are definitely NOT app runs (skip these fast)
SKIP_PATTERNS=(
    "^git "
    "^ls"
    "^cat "
    "^echo "
    "^cd "
    "^pwd"
    "^mkdir"
    "^rm "
    "^cp "
    "^mv "
    "^chmod"
    "^curl "
    "^wget "
    "--version"
    "--help"
    "^gradle -"
    "^./gradlew -"
    "gradlew clean$"
    "gradlew compile$"
    "gradlew build$"
    "gradlew classes$"
    "gradlew jar$"
    "gradlew assemble$"
    "gradle clean$"
    "gradle build$"
)

# Check if we should skip (fast path for non-Java commands)
should_skip() {
    for pattern in "${SKIP_PATTERNS[@]}"; do
        if [[ "$COMMAND" =~ $pattern ]]; then
            debug "Skipping - matches skip pattern: $pattern"
            return 0
        fi
    done
    return 1
}

# Check if this is an app run command
is_app_run() {
    for pattern in "${APP_RUN_PATTERNS[@]}"; do
        if [[ "$COMMAND" == *"$pattern"* ]]; then
            debug "Matched app run pattern: $pattern"
            return 0
        fi
    done
    return 1
}

# Build the agent JVM arguments
build_agent_args() {
    local args="-javaagent:$AGENT_PATH"
    # Only add config path if the file actually exists
    if [ -n "$CONFIG_PATH" ] && [ -f "$CONFIG_PATH" ]; then
        args="$args -Dcontrast.config.path=$CONFIG_PATH"
    fi
    echo "$args"
}

# Modify Gradle command to include agent
inject_gradle() {
    local cmd="$1"
    local agent_args=$(build_agent_args)

    # Add JVM args via -D or -P flag
    # Using org.gradle.jvmargs property
    echo "$cmd -Dorg.gradle.jvmargs=\"$agent_args\""
}

# Modify Maven command to include agent
inject_maven() {
    local cmd="$1"
    local agent_args=$(build_agent_args)

    # Prepend MAVEN_OPTS
    echo "MAVEN_OPTS=\"$agent_args\" $cmd"
}

# Modify java command to include agent
inject_java() {
    local cmd="$1"
    local agent_args=$(build_agent_args)

    # Insert agent args after 'java' and tee output to file for verification
    local modified=$(echo "$cmd" | sed "s|java |java $agent_args |")
    echo "$modified 2>&1 | tee ./contrast-output.log"
}

# Determine build tool and inject appropriately
inject_agent() {
    local cmd="$1"

    if [[ "$cmd" == *"gradle"* ]] || [[ "$cmd" == *"gradlew"* ]]; then
        inject_gradle "$cmd"
    elif [[ "$cmd" == *"mvn"* ]]; then
        inject_maven "$cmd"
    elif [[ "$cmd" == java* ]]; then
        inject_java "$cmd"
    else
        # Generic - just return as-is (might need manual handling)
        debug "Unknown build tool, returning unmodified"
        echo "$cmd"
    fi
}

# Main logic
main() {
    # Fast path: skip non-Java commands
    if should_skip; then
        # Pass through unchanged
        cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow"
  }
}
EOF
        return
    fi

    # Check if this is an app run
    if is_app_run; then
        # Check if agent JAR exists
        if [ -z "$AGENT_PATH" ] || [ ! -f "$AGENT_PATH" ]; then
            debug "Agent JAR not found - passing through"
            cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow"
  },
  "additionalContext": "⚠️ Contrast agent not found - run 'npx contrast-claude update' to download"
}
EOF
            return
        fi

        # Inject the agent
        MODIFIED=$(inject_agent "$COMMAND")
        debug "Modified command: $MODIFIED"

        # Escape for JSON
        MODIFIED_ESCAPED=$(echo "$MODIFIED" | sed 's/"/\\"/g')

        cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "command": "$MODIFIED_ESCAPED"
    }
  },
  "additionalContext": "🛡️ Contrast Security agent attached for runtime vulnerability detection"
}
EOF
    else
        # Not an app run, pass through
        cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow"
  }
}
EOF
    fi
}

main
