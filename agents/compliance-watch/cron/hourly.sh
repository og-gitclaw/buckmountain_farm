#!/usr/bin/env bash
# Hourly entry point. Sources secrets from ~/.openclaw_secrets.d/
# then invokes watch.py --once. Used by the launchd plist.
set -euo pipefail

# Source secrets if present
SECRETS=~/.openclaw_secrets.d/compliance_watch.env
if [ -f "$SECRETS" ]; then
  # shellcheck source=/dev/null
  set -a; source "$SECRETS"; set +a
fi

# Run from the repo (so relative rules/ paths resolve)
cd ~/buckmountain_farm/agents/compliance-watch
/usr/bin/python3 watch.py --once "$@"
