#!/usr/bin/env bash
# Install/update the buckmountain.farm media watcher on Openclaw.
#
# Usage:
#   ./install_openclaw_watcher.sh            # install or update
#   ./install_openclaw_watcher.sh uninstall  # remove
#
# Idempotent. Safe to re-run.

set -euo pipefail

REMOTE="iamclaw@100.88.89.39"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY_SRC="$SCRIPT_DIR/openclaw_watcher.py"
PLIST_SRC="$SCRIPT_DIR/com.buckmountain.farm.media-watcher.plist"

REMOTE_APP_SUPPORT='/Users/iamclaw/Library/Application Support/buckmountain-farm'
REMOTE_PY="${REMOTE_APP_SUPPORT}/openclaw_watcher.py"
REMOTE_PLIST='/Users/iamclaw/Library/LaunchAgents/com.buckmountain.farm.media-watcher.plist'
LABEL='com.buckmountain.farm.media-watcher'

action="${1:-install}"

ssh_quote() {
  # Escape a string for safe embedding in a remote shell command.
  printf "%s" "$1" | sed "s/'/'\\\\''/g"
}

remote() {
  ssh -o ConnectTimeout=10 -o BatchMode=yes "$REMOTE" "$@"
}

case "$action" in
  install|update)
    [[ -f "$PY_SRC" ]] || { echo "FATAL: missing $PY_SRC"; exit 1; }
    [[ -f "$PLIST_SRC" ]] || { echo "FATAL: missing $PLIST_SRC"; exit 1; }

    echo "→ Ensuring remote directories"
    remote "mkdir -p '$REMOTE_APP_SUPPORT' '/Users/iamclaw/Library/LaunchAgents' '/Users/iamclaw/Library/Logs'"

    echo "→ Stopping existing watcher (if any)"
    remote "launchctl bootout gui/\$(id -u) '$REMOTE_PLIST' 2>/dev/null || true"

    # File transport via ssh stdin → remote `cat >` — sidesteps scp/rsync space-in-path issues.
    echo "→ Copying watcher script"
    ssh -o ConnectTimeout=10 -o BatchMode=yes "$REMOTE" "cat > '$REMOTE_PY'" < "$PY_SRC"
    remote "chmod 0755 '$REMOTE_PY'"

    echo "→ Copying launchd plist"
    ssh -o ConnectTimeout=10 -o BatchMode=yes "$REMOTE" "cat > '$REMOTE_PLIST'" < "$PLIST_SRC"
    remote "chmod 0644 '$REMOTE_PLIST'"

    echo "→ Loading launchd job"
    remote "launchctl bootstrap gui/\$(id -u) '$REMOTE_PLIST'"
    remote "launchctl enable gui/\$(id -u)/$LABEL"

    echo "→ Verifying"
    remote "launchctl print gui/\$(id -u)/$LABEL | head -20 || echo 'WARN: not loaded'"
    echo "→ Tail of log (will be empty if just installed):"
    remote "tail -20 ~/Library/Logs/buckmountain-farm-watcher.log 2>/dev/null || echo '(no log yet)'"

    echo "✓ Done. Watcher will poll every 30s. Log: ~/Library/Logs/buckmountain-farm-watcher.log on openclaw."
    ;;

  uninstall|remove)
    echo "→ Stopping watcher"
    remote "launchctl bootout gui/\$(id -u) '$REMOTE_PLIST' 2>/dev/null || true"
    echo "→ Removing plist (leaving script + manifest in place for forensics)"
    remote "rm -f '$REMOTE_PLIST'"
    echo "✓ Uninstalled. Manifest preserved at: $REMOTE_APP_SUPPORT/manifest.jsonl"
    ;;

  *)
    echo "Usage: $0 [install|update|uninstall]"; exit 2;;
esac
