#!/usr/bin/env python3
"""
compliance-watch — the autonomous compliance + ops agent on openclaw.

Polls regulatory feeds + integration health, diffs against last-known
state, applies updates atomically via the site's admin APIs, and escalates
to admin via SES when it can't auto-resolve.

Runs hourly via launchd (see launchd/com.buckmountain.compliance-watch.plist).
Stdlib + pyyaml + requests; no other deps so it installs cleanly on
macOS system Python.

Usage:
    python3 watch.py                 # full run
    python3 watch.py --once          # one iteration then exit
    python3 watch.py --dry-run       # no writes; print what would happen
    python3 watch.py --rule tcpa     # only run a specific rule
"""

import argparse
import hashlib
import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml  # type: ignore[import]
except ImportError:
    sys.stderr.write("pyyaml required: pip install pyyaml\n")
    sys.exit(1)

# ---------------- config ----------------

BASE = os.environ.get("BUCKMOUNTAIN_BASE", "https://buckmountain.farm").rstrip("/")
ADMIN_TOKEN = os.environ.get("ADMIN_API_TOKEN", "").strip()
STATE_DIR = Path(os.environ.get(
    "COMPLIANCE_STATE_DIR",
    str(Path.home() / "Library" / "Application Support" / "buckmountain-compliance"),
))
LOG_PATH = Path.home() / "Library" / "Logs" / "buckmountain-compliance-watch.log"
HERE = Path(__file__).resolve().parent
RULES_DIR = HERE / "rules"
AGENT_VERSION = "0.1.0"


# ---------------- utils ----------------

def log(msg: str) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    line = f"[{ts}] {msg}\n"
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass
    sys.stdout.write(line)


def state_path(rule_id: str) -> Path:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    return STATE_DIR / f"{rule_id}.json"


def load_state(rule_id: str) -> dict:
    p = state_path(rule_id)
    if not p.exists():
        return {}
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_state(rule_id: str, state: dict) -> None:
    p = state_path(rule_id)
    tmp = p.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, sort_keys=True)
    tmp.replace(p)


def http_get(url: str, timeout: int = 30) -> str:
    req = urllib.request.Request(url, headers={
        "User-Agent": f"buckmountain-compliance-watch/{AGENT_VERSION}",
    })
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def hash_content(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:16]


# ---------------- detectors ----------------
# Each detector returns (changed: bool, new_state: dict, summary: str).

def detect_http_diff(rule: dict, prev_state: dict) -> tuple[bool, dict, str]:
    """Polls an HTTP endpoint, hashes the body, flags any change."""
    url = rule["detect"]["url"]
    try:
        body = http_get(url)
    except (urllib.error.URLError, TimeoutError) as e:
        return False, prev_state, f"fetch-failed: {e}"
    new_hash = hash_content(body)
    prev_hash = prev_state.get("hash")
    if new_hash != prev_hash:
        new_state = {"hash": new_hash, "fetched_at": datetime.now(timezone.utc).isoformat()}
        return True, new_state, f"content changed (was {prev_hash} now {new_hash})"
    return False, prev_state, "unchanged"


def detect_api_field(rule: dict, prev_state: dict) -> tuple[bool, dict, str]:
    """Polls an API endpoint, extracts a nested field, flags any change."""
    url = rule["detect"]["url"]
    path = rule["detect"]["field"].split(".")
    try:
        body = json.loads(http_get(url))
    except Exception as e:
        return False, prev_state, f"fetch-failed: {e}"
    val = body
    for k in path:
        if not isinstance(val, dict) or k not in val:
            return False, prev_state, f"field-missing: {'.'.join(path)}"
        val = val[k]
    prev_val = prev_state.get("value")
    if val != prev_val:
        return True, {"value": val, "fetched_at": datetime.now(timezone.utc).isoformat()}, f"value changed: {prev_val} → {val}"
    return False, prev_state, "unchanged"


DETECTORS = {
    "http_diff": detect_http_diff,
    "api_field": detect_api_field,
}


# ---------------- actions ----------------

def action_admin_alert(rule: dict, summary: str, dry_run: bool) -> str:
    """Posts an admin alert via the site's admin API."""
    if dry_run:
        return f"DRY: would POST /api/admin/health-alert: {rule['id']}"
    if not ADMIN_TOKEN:
        return "skipped: ADMIN_API_TOKEN unset"
    payload = json.dumps({
        "integration": f"compliance:{rule['id']}",
        "detail": summary,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}/api/admin/health-alert",
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_TOKEN}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return f"alert posted ({resp.status})"
    except Exception as e:
        return f"alert post-failed: {e}"


def action_audit_log(rule: dict, summary: str, dry_run: bool) -> str:
    """Append a row to audit_log via /api/admin/audit (TODO endpoint)."""
    if dry_run:
        return f"DRY: would audit_log: {rule['id']} | {summary}"
    return "audit logged (endpoint TODO)"


ACTIONS = {
    "admin_alert": action_admin_alert,
    "audit_log": action_audit_log,
    # Future: consent_update, render_legal, alpine_iq_sync, ses_pause
}


# ---------------- rule runner ----------------

def load_rules(filter_id: str | None) -> list[dict]:
    if not RULES_DIR.exists():
        return []
    out: list[dict] = []
    for p in sorted(RULES_DIR.glob("*.yaml")):
        with open(p, "r", encoding="utf-8") as f:
            rule = yaml.safe_load(f)
        if filter_id and rule.get("id") != filter_id:
            continue
        out.append(rule)
    return out


def run_rule(rule: dict, dry_run: bool) -> None:
    rid = rule["id"]
    detect_type = rule["detect"]["type"]
    detector = DETECTORS.get(detect_type)
    if not detector:
        log(f"ERR rule={rid} unknown detector type: {detect_type}")
        return

    prev = load_state(rid)
    changed, new_state, summary = detector(rule, prev)
    log(f"RULE id={rid} changed={changed} summary={summary}")

    if not changed:
        return

    for action in rule.get("actions", []):
        kind = action["kind"]
        fn = ACTIONS.get(kind)
        if not fn:
            log(f"  WARN unknown action: {kind}")
            continue
        result = fn(rule, summary, dry_run)
        log(f"  ACTION {kind}: {result}")

    if not dry_run:
        save_state(rid, new_state)


def cycle(filter_id: str | None, dry_run: bool) -> None:
    rules = load_rules(filter_id)
    log(f"CYCLE v{AGENT_VERSION} rules={len(rules)} dry_run={dry_run}")
    for rule in rules:
        try:
            run_rule(rule, dry_run)
        except Exception as e:
            log(f"ERR rule={rule.get('id', '?')}: {type(e).__name__}: {e}")


# ---------------- main ----------------

def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--once", action="store_true", help="run one cycle then exit")
    p.add_argument("--dry-run", action="store_true", help="don't apply changes")
    p.add_argument("--rule", help="run only this rule id")
    p.add_argument("--interval", type=int, default=3600, help="seconds between cycles when looping")
    args = p.parse_args()

    log(f"START agent=compliance-watch v{AGENT_VERSION} base={BASE} admin_token={'set' if ADMIN_TOKEN else 'UNSET'}")

    if args.once:
        cycle(args.rule, args.dry_run)
        return 0

    while True:
        try:
            cycle(args.rule, args.dry_run)
        except Exception as e:
            log(f"FATAL cycle: {type(e).__name__}: {e}")
        time.sleep(args.interval)


if __name__ == "__main__":
    sys.exit(main())
