#!/usr/bin/env bash
# Run Pi inside a container so generated commands can only touch what you mount.
# Based on Pi's "Run Pi in an isolated environment" docs. Run from the folder Pi should work on.
set -euo pipefail

# 1. Build the image once (Dockerfile.pi sits next to this script).
docker build -t pi-sandbox -f "$(dirname "$0")/Dockerfile.pi" "$(dirname "$0")"

# 2. Start Pi.
#    -e ANTHROPIC_API_KEY      passes the key by NAME: its value is copied from your shell, never written in this file.
#    -v "$PWD:/workspace"      the ONLY host folder the container can see (read-write: Pi can change these files).
#    -v pi-agent-home:...      a named volume: Pi's settings and sessions live in the container, not in your real ~/.pi/agent.
#    Do NOT mount your host ~/.pi/agent: that would expose your credentials and sessions.
docker run --rm -it \
  -e ANTHROPIC_API_KEY \
  -v "$PWD:/workspace" \
  -v pi-agent-home:/root/.pi/agent \
  pi-sandbox

# Variants:
#   Review-only (Pi cannot change your files):   -v "$PWD:/workspace:ro"
#   Verify the boundary, inside Pi, run:          !pwd        (should print /workspace)
# Note: Pi itself needs network access to reach the model API, so do not add "--network none" to this command.
