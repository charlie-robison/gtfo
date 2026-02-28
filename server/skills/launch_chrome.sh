#!/usr/bin/env bash
# Launch Chrome with remote debugging enabled so browser-use skills can
# connect to your real browser profile — bypassing bot detection.
#
# Usage:
#   bash skills/launch_chrome.sh          # Uses default profile
#   bash skills/launch_chrome.sh custom   # Uses a dedicated "automovers" profile

set -euo pipefail

PORT="${CHROME_CDP_PORT:-9222}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [[ "${1:-}" == "custom" ]]; then
    DATA_DIR="/tmp/automovers-chrome-profile"
    echo "Using dedicated profile at $DATA_DIR"
else
    # Use default — omit --user-data-dir so Chrome uses your real profile
    DATA_DIR=""
    echo "Using your default Chrome profile"
fi

# Check if Chrome is already listening on the debug port
if curl -s "http://localhost:$PORT/json/version" >/dev/null 2>&1; then
    echo "Chrome is already running with debugging on port $PORT."
    curl -s "http://localhost:$PORT/json/version" | python3 -m json.tool 2>/dev/null || true
    exit 0
fi

echo "Starting Chrome with remote debugging on port $PORT ..."
echo "  (Keep this terminal open. Press Ctrl+C to stop.)"
echo

if [[ -n "$DATA_DIR" ]]; then
    "$CHROME" \
        --remote-debugging-port="$PORT" \
        --user-data-dir="$DATA_DIR" \
        --no-first-run \
        --no-default-browser-check \
        2>/dev/null &
else
    "$CHROME" \
        --remote-debugging-port="$PORT" \
        --no-first-run \
        --no-default-browser-check \
        2>/dev/null &
fi

CHROME_PID=$!

# Wait for Chrome to be ready
for i in {1..15}; do
    if curl -s "http://localhost:$PORT/json/version" >/dev/null 2>&1; then
        echo "Chrome is ready on http://localhost:$PORT"
        echo "You can now run the Zillow skills."
        wait $CHROME_PID 2>/dev/null
        exit 0
    fi
    sleep 1
done

echo "ERROR: Chrome did not start in time. Check if another Chrome is already running."
echo "If so, close all Chrome windows first, then try again."
exit 1
