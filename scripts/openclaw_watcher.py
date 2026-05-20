#!/usr/bin/env python3
"""
buckmountain.farm — openclaw media watcher

Runs on Openclaw (Joshuas-Mac-mini, user `iamclaw`). Watches the bucket-folders
inside `~/Desktop/Openclaw Media Ingestor/` and routes anything classified as
Buck Mountain Cannabis content to the buckmountain.farm dashboard.

Two ingest paths:
  1. Anything under `buckmountain/`              → bucket=buckmountain (trusted)
  2. Files in OTHER buckets whose name matches
     a Buck Mountain heuristic (e.g. 'buck',
     'BMC', 'bmcannabis', 'buckmtn', strain     → bucket=cross-folder-match
     names from the BigCommerce catalog)          (flagged for review)

For each new file: SHA-256 hash, mtime, size, ext, classify (image/video/other,
plus heuristic tag like 'jar-shot', 'strain-still', 'proof-of-life'). Records
go into a JSON-lines manifest. If $BUCKMOUNTAIN_DASHBOARD_URL is set, the
record is also POSTed to the dashboard's /api/admin/assets endpoint.

Failures are queued in the manifest (status=pending) and re-attempted on next
cycle.

No external Python deps — stdlib only. Polls every 30s.
"""

import hashlib
import json
import os
import re
import socket
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# ---------- config ----------
# Read from the home-dir real folder, NOT the Desktop symlink.
# macOS TCC protects ~/Desktop from launchd-spawned processes (no Full Disk Access).
# The bridge keeps a symlink at ~/Desktop/Openclaw Media Ingestor for drag-drop UX,
# but the real bytes live at ~/openclaw-media-ingestor/ — readable without FDA.
INGEST_ROOT = Path.home() / "openclaw-media-ingestor"
APP_SUPPORT = Path.home() / "Library" / "Application Support" / "buckmountain-farm"
MANIFEST_PATH = APP_SUPPORT / "manifest.jsonl"
SEEN_INDEX_PATH = APP_SUPPORT / "seen.json"  # sha → record-id, dedupe
LOG_PATH = Path.home() / "Library" / "Logs" / "buckmountain-farm-watcher.log"
POLL_INTERVAL_SECS = 30
DASHBOARD_URL = os.environ.get("BUCKMOUNTAIN_DASHBOARD_URL", "").strip()  # e.g. https://buckmountain.farm/api/admin/assets
DASHBOARD_TOKEN = os.environ.get("BUCKMOUNTAIN_DASHBOARD_TOKEN", "").strip()
DASHBOARD_VERCEL_BYPASS = os.environ.get("BUCKMOUNTAIN_VERCEL_BYPASS", "").strip()
WATCHER_VERSION = "0.1.0"
HOSTNAME = socket.gethostname()

# Buckets we always treat as Buck Mountain.
TRUSTED_BUCKETS = {"buckmountain"}

# Heuristic regex for filenames in other buckets that look like Buck Mountain content.
# Conservative — false-positives surface in /admin/assets as "candidate", not auto-approved.
STRAIN_NAMES = [
    "gelato 41", "gelato41", "permanent og", "permanentog", "grape lobster",
    "strawberry lobster", "yeet", "permanent marker", "xxx og", "xxxog",
    "jifflez", "hashberger", "cheetah piss", "watermelon punch", "dog",
]
BUCK_REGEXES = [
    re.compile(r"\b(buck[-_ ]?mtn|buck[-_ ]?mountain|bmcannabis|buck[-_ ]?cannabis)\b", re.I),
    re.compile(r"\bBMC\b"),  # case-sensitive on BMC to avoid 'bmc' inside e.g. 'submcat'
]
STRAIN_REGEX = re.compile("|".join(re.escape(s) for s in STRAIN_NAMES), re.I)

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".gif", ".bmp", ".tif", ".tiff"}
VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"}

# ---------- utils ----------

def log(msg: str) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    line = f"[{ts}] {msg}\n"
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass
    # Also stderr — launchd captures it in case the log file path is unwritable.
    sys.stderr.write(line)


def sha256_of(path: Path, chunk: int = 1 << 16) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            b = f.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def load_seen() -> dict:
    if not SEEN_INDEX_PATH.exists():
        return {}
    try:
        return json.loads(SEEN_INDEX_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        log(f"WARN seen.json corrupted — rebuilding from manifest")
        return rebuild_seen_from_manifest()


def rebuild_seen_from_manifest() -> dict:
    seen = {}
    if not MANIFEST_PATH.exists():
        return seen
    try:
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    rec = json.loads(line)
                    seen[rec["sha256"]] = rec["id"]
                except (json.JSONDecodeError, KeyError):
                    continue
    except Exception as e:
        log(f"WARN failed to rebuild seen index: {e}")
    return seen


def save_seen(seen: dict) -> None:
    APP_SUPPORT.mkdir(parents=True, exist_ok=True)
    tmp = SEEN_INDEX_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(seen, indent=0), encoding="utf-8")
    tmp.replace(SEEN_INDEX_PATH)


def append_manifest(rec: dict) -> None:
    APP_SUPPORT.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, separators=(",", ":")) + "\n")


def update_manifest_status(record_id: str, **patch) -> None:
    """Rewrite the manifest with the patched record. O(n) — fine at our scale."""
    if not MANIFEST_PATH.exists():
        return
    tmp = MANIFEST_PATH.with_suffix(".jsonl.tmp")
    with open(MANIFEST_PATH, "r", encoding="utf-8") as fin, open(tmp, "w", encoding="utf-8") as fout:
        for line in fin:
            try:
                rec = json.loads(line)
                if rec.get("id") == record_id:
                    rec.update(patch)
                fout.write(json.dumps(rec, separators=(",", ":")) + "\n")
            except json.JSONDecodeError:
                fout.write(line)
    tmp.replace(MANIFEST_PATH)


# ---------- classification ----------

def classify_kind(ext: str) -> str:
    if ext.lower() in IMAGE_EXTS:
        return "image"
    if ext.lower() in VIDEO_EXTS:
        return "video"
    return "other"


def classify_tags(name: str) -> list[str]:
    # Normalize separators so strain regex catches `Buck_Mtn_Gelato_41_jar` → `gelato 41`.
    name_l = re.sub(r"[_\-.]+", " ", name.lower())
    tags: list[str] = []
    if any(k in name_l for k in ("jar", "label", "package")):
        tags.append("jar-shot")
    if any(k in name_l for k in ("proof", "pol")):
        tags.append("proof-of-life")
    if any(k in name_l for k in ("still", "macro", "shot", "scale")):
        tags.append("strain-still")
    if any(k in name_l for k in ("video", "vid", "reel", "clip", "raw")):
        tags.append("video-raw")
    if "rosin" in name_l or "extract" in name_l or "badder" in name_l:
        tags.append("concentrate")
    if "vape" in name_l or "cart" in name_l or "disposable" in name_l:
        tags.append("vape")
    strain_match = STRAIN_REGEX.search(name_l)
    if strain_match:
        tags.append(f"strain:{strain_match.group(0).strip().lower().replace(' ', '-')}")
    return tags


def is_buckmountain_in_other_bucket(name: str) -> bool:
    if any(rx.search(name) for rx in BUCK_REGEXES):
        return True
    if STRAIN_REGEX.search(name):
        return True
    return False


# ---------- post to dashboard ----------

def post_to_dashboard(rec: dict) -> tuple[bool, str]:
    if not DASHBOARD_URL:
        return False, "no-url"
    try:
        body = json.dumps(rec).encode("utf-8")
        req = urllib.request.Request(DASHBOARD_URL, data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("User-Agent", f"buckmountain-farm-watcher/{WATCHER_VERSION}")
        if DASHBOARD_TOKEN:
            req.add_header("Authorization", f"Bearer {DASHBOARD_TOKEN}")
        if DASHBOARD_VERCEL_BYPASS:
            # Bypass Vercel Deployment Protection so the watcher can POST while
            # the rest of the site stays auth-walled until prod-promote.
            req.add_header("x-vercel-protection-bypass", DASHBOARD_VERCEL_BYPASS)
            req.add_header("x-vercel-set-bypass-cookie", "false")
        with urllib.request.urlopen(req, timeout=15) as resp:
            if 200 <= resp.status < 300:
                return True, f"http-{resp.status}"
            return False, f"http-{resp.status}"
    except urllib.error.HTTPError as e:
        return False, f"http-{e.code}"
    except urllib.error.URLError as e:
        return False, f"url-error:{e.reason}"
    except Exception as e:
        return False, f"exception:{type(e).__name__}:{e}"


# ---------- scan + process ----------

def iter_candidate_files() -> list[tuple[Path, str, str]]:
    """Yield (path, bucket, route) for every file under INGEST_ROOT.

    route ∈ {'trusted', 'cross-folder-match'}
    """
    if not INGEST_ROOT.exists():
        return []
    out: list[tuple[Path, str, str]] = []
    for bucket_dir in INGEST_ROOT.iterdir():
        if not bucket_dir.is_dir():
            continue
        if bucket_dir.name.startswith("."):
            continue
        bucket = bucket_dir.name.lower()
        trusted = bucket in TRUSTED_BUCKETS
        for f in bucket_dir.rglob("*"):
            if not f.is_file():
                continue
            if f.name.startswith("."):
                continue  # .DS_Store etc
            if f.name.endswith(".tmp"):
                continue
            if trusted:
                out.append((f, bucket, "trusted"))
            elif is_buckmountain_in_other_bucket(f.name):
                out.append((f, bucket, "cross-folder-match"))
    return out


def process_one(path: Path, bucket: str, route: str, seen: dict) -> bool:
    """Returns True if a new record was created."""
    try:
        st = path.stat()
        if st.st_size == 0:
            return False
        # Skip files modified in the last 10s — likely still being written.
        if (time.time() - st.st_mtime) < 10:
            return False
        sha = sha256_of(path)
    except Exception as e:
        log(f"ERR hash {path}: {e}")
        return False

    if sha in seen:
        return False

    record_id = sha[:16]
    rel = str(path.relative_to(INGEST_ROOT))
    ext = path.suffix
    rec = {
        "id": record_id,
        "schema": "buckmountain-farm/asset/v1",
        "sha256": sha,
        "source": {
            "host": HOSTNAME,
            "user": os.environ.get("USER", "unknown"),
            "abs_path": str(path),
            "rel_path": rel,
            "bucket": bucket,
            "route": route,
        },
        "file": {
            "name": path.name,
            "ext": ext.lower(),
            "size_bytes": st.st_size,
            "mtime_iso": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat(timespec="seconds"),
        },
        "kind": classify_kind(ext),
        "tags": classify_tags(path.name),
        "ingested_at_iso": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "watcher_version": WATCHER_VERSION,
        "dashboard": {
            "status": "pending",
            "attempts": 0,
            "last_error": None,
        },
    }

    ok, info = post_to_dashboard(rec)
    rec["dashboard"]["attempts"] = 1 if DASHBOARD_URL else 0
    if ok:
        rec["dashboard"]["status"] = "posted"
    elif DASHBOARD_URL:
        rec["dashboard"]["status"] = "retry"
        rec["dashboard"]["last_error"] = info

    append_manifest(rec)
    seen[sha] = record_id
    log(f"ADD id={record_id} route={route} bucket={bucket} kind={rec['kind']} tags={rec['tags']} dash={rec['dashboard']['status']}({info if DASHBOARD_URL else 'skipped'}) {rel}")
    return True


def retry_pending(seen: dict) -> int:
    """Replay manifest entries that are status=retry."""
    if not MANIFEST_PATH.exists() or not DASHBOARD_URL:
        return 0
    fixed = 0
    # Read entire manifest into memory — fine at our scale.
    records: list[dict] = []
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        for line in f:
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    changed = False
    for rec in records:
        d = rec.get("dashboard", {})
        # Replay both "retry" (transient failures) and "pending" (ingested when
        # URL wasn't yet configured). Skip "posted" (done) and anything else.
        if d.get("status") not in ("retry", "pending"):
            continue
        if d.get("attempts", 0) >= 50:
            continue  # give up after 50 tries (~25 hours at 30min cycles)
        ok, info = post_to_dashboard(rec)
        d["attempts"] = d.get("attempts", 0) + 1
        if ok:
            d["status"] = "posted"
            d["last_error"] = None
            fixed += 1
        else:
            d["last_error"] = info
        rec["dashboard"] = d
        changed = True
    if changed:
        tmp = MANIFEST_PATH.with_suffix(".jsonl.tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            for rec in records:
                f.write(json.dumps(rec, separators=(",", ":")) + "\n")
        tmp.replace(MANIFEST_PATH)
    return fixed


# ---------- main ----------

def cycle() -> None:
    seen = load_seen()
    seen_before = len(seen)
    added = 0
    candidates = iter_candidate_files()
    for path, bucket, route in candidates:
        try:
            if process_one(path, bucket, route, seen):
                added += 1
        except Exception as e:
            log(f"ERR process {path}: {e}")
    if added or seen_before == 0:
        save_seen(seen)
    fixed = retry_pending(seen)
    if added or fixed:
        log(f"CYCLE added={added} retried-fixed={fixed} total-known={len(seen)}")


def main() -> int:
    APP_SUPPORT.mkdir(parents=True, exist_ok=True)
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    log(f"START v{WATCHER_VERSION} host={HOSTNAME} dashboard={'set' if DASHBOARD_URL else 'unset'} ingest_root={INGEST_ROOT}")
    if not INGEST_ROOT.exists():
        log(f"FATAL ingest root does not exist: {INGEST_ROOT}")
        # Stay alive so launchd doesn't backoff — the folder may appear later.
    # Run forever; launchd KeepAlive restarts if we crash.
    while True:
        try:
            cycle()
        except Exception as e:
            log(f"ERR cycle: {type(e).__name__}: {e}")
        time.sleep(POLL_INTERVAL_SECS)


if __name__ == "__main__":
    sys.exit(main() or 0)
