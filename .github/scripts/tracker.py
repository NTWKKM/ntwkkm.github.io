#!/usr/bin/env python3
"""
Thailand Post Package Tracker — GitHub Actions Cron Job
========================================================
Polls the Thailand Post Track & Trace API for barcode statuses,
diffs against existing state, and updates status_store.json.

API Documentation: https://track.thailandpost.co.th/developerGuide

Environment Variables:
    TRACK_API_TOKEN — Thailand Post developer API token (stored in GitHub Secrets)

File I/O:
    READ:  tracking/track_list.json    — Barcodes to track (manually maintained)
    WRITE: tracking/status_store.json  — Latest status per barcode (auto-generated)
"""

import json
import os
import re
import sys
import time
from datetime import datetime, timezone, timedelta

import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
AUTH_URL = "https://trackapi.thailandpost.co.th/post/api/v1/authenticate/token"
TRACK_URL = "https://trackapi.thailandpost.co.th/post/api/v1/track"

TRACK_LIST_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "tracking", "track_list.json")
STATUS_STORE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "tracking", "status_store.json")

# Thailand Post API limits: max 100 barcodes per request
BATCH_SIZE = 100

# Barcode format validation (e.g., EF123456789TH, RI987654321TH)
BARCODE_PATTERN = re.compile(r"^[A-Z]{2}\d{9}[A-Z]{2}$")

# Timezone for timestamps
TH_TZ = timezone(timedelta(hours=7))

# Delivery status codes that indicate successful delivery
DELIVERED_CODES = {"501", "S"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def log(msg: str) -> None:
    """Print timestamped log message to stdout."""
    ts = datetime.now(TH_TZ).strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")


def load_json(path: str) -> dict | list:
    """Load and parse a JSON file."""
    abs_path = os.path.normpath(path)
    with open(abs_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: str, data: dict | list) -> None:
    """Write data to a JSON file with pretty formatting."""
    abs_path = os.path.normpath(path)
    with open(abs_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    log(f"Saved: {abs_path}")


def validate_barcode(barcode: str) -> bool:
    """Validate Thailand Post barcode format."""
    return bool(BARCODE_PATTERN.match(barcode))


# ---------------------------------------------------------------------------
# API Client
# ---------------------------------------------------------------------------
def authenticate(api_token: str) -> str:
    """
    Step 1: Exchange the long-lived API token for a short-lived access token.

    POST /post/api/v1/authenticate/token
    Header: Authorization: Token <TRACK_API_TOKEN>
    Response: { "expire": "...", "token": "<access_token>" }
    """
    headers = {
        "Authorization": f"Token {api_token}",
        "Content-Type": "application/json",
    }

    for attempt in range(2):
        try:
            resp = requests.post(AUTH_URL, headers=headers, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                token = data.get("token")
                if token:
                    log("Authentication successful")
                    return token
                else:
                    log(f"Authentication response missing token: {data}")
                    sys.exit(1)
            elif resp.status_code == 401:
                log(f"Authentication failed (401): Invalid API token")
                sys.exit(1)
            elif resp.status_code == 429:
                log(f"Rate limited (429) on authentication. Waiting 60s...")
                time.sleep(60)
                continue
            else:
                log(f"Authentication failed ({resp.status_code}): {resp.text}")
                if attempt == 0:
                    time.sleep(10)
                    continue
                sys.exit(1)
        except requests.exceptions.Timeout:
            log(f"Authentication timeout (attempt {attempt + 1}/2)")
            if attempt == 0:
                time.sleep(10)
                continue
            sys.exit(1)
        except requests.exceptions.RequestException as e:
            log(f"Authentication network error: {e}")
            if attempt == 0:
                time.sleep(10)
                continue
            sys.exit(1)

    log("Authentication exhausted all retries")
    sys.exit(1)


def track_barcodes(access_token: str, barcodes: list[str]) -> dict:
    """
    Step 2: Fetch tracking events for a batch of barcodes.

    POST /post/api/v1/track
    Header: Authorization: Token <access_token>
    Body: { "status": "all", "language": "TH", "barcode": [...] }
    Response: { "response": { "items": { "<barcode>": [...events] } }, "message": "...", "status": true }
    """
    headers = {
        "Authorization": f"Token {access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "status": "all",
        "language": "TH",
        "barcode": barcodes,
    }

    for attempt in range(2):
        try:
            resp = requests.post(TRACK_URL, headers=headers, json=payload, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") is True or data.get("response"):
                    return data.get("response", {}).get("items", {})
                else:
                    log(f"Track API returned unexpected structure: {data.get('message', 'Unknown')}")
                    return {}
            elif resp.status_code == 401:
                log("Track API 401 — access token may have expired")
                return {}
            elif resp.status_code == 429:
                log("Track API rate limited (429). Waiting 60s...")
                time.sleep(60)
                continue
            else:
                log(f"Track API error ({resp.status_code}): {resp.text[:200]}")
                if attempt == 0:
                    time.sleep(10)
                    continue
                return {}
        except requests.exceptions.Timeout:
            log(f"Track API timeout (attempt {attempt + 1}/2)")
            if attempt == 0:
                time.sleep(10)
                continue
            return {}
        except requests.exceptions.RequestException as e:
            log(f"Track API network error: {e}")
            if attempt == 0:
                time.sleep(10)
                continue
            return {}

    return {}


# ---------------------------------------------------------------------------
# Core Logic
# ---------------------------------------------------------------------------
def process_tracking_events(barcode: str, events: list[dict], note: str, existing: dict | None) -> dict:
    """
    Process raw API events for a single barcode and merge with existing state.

    Each event from the API typically has:
    - barcode, status, status_description, status_date,
      location, postcode, delivery_status, delivery_description, signature, etc.
    """
    # Build history from events
    history = []
    for event in events:
        history.append({
            "status": event.get("status_description", event.get("status", "")),
            "status_date": event.get("status_date", ""),
            "location": event.get("location", ""),
            "post_code": event.get("postcode", ""),
            "status_code": str(event.get("status", "")),
            "delivery_status": event.get("delivery_status", ""),
        })

    # Sort history by date (oldest first)
    history.sort(key=lambda x: x.get("status_date", ""))

    # Determine current status from the latest event
    latest = history[-1] if history else {}
    is_delivered = (
        str(latest.get("status_code", "")) in DELIVERED_CODES
        or str(latest.get("delivery_status", "")).upper() == "S"
    )

    return {
        "note": note,
        "barcode": barcode,
        "last_status": latest.get("status", ""),
        "last_status_date": latest.get("status_date", ""),
        "status_code": latest.get("status_code", ""),
        "is_delivered": is_delivered,
        "location": latest.get("location", ""),
        "delivery_status": latest.get("delivery_status", ""),
        "track_count": str(len(history)),
        "history": history,
    }


def main() -> None:
    """Main entry point — orchestrates the tracking pipeline."""
    log("=" * 60)
    log("Thailand Post Package Tracker — Starting")
    log("=" * 60)

    # --- 1. Load API token from environment ---
    api_token = os.environ.get("TRACK_API_TOKEN", "").strip()
    if not api_token:
        log("ERROR: TRACK_API_TOKEN environment variable is not set")
        sys.exit(1)

    # --- 2. Load track list ---
    try:
        track_list = load_json(TRACK_LIST_PATH)
    except FileNotFoundError:
        log(f"ERROR: Track list not found at {TRACK_LIST_PATH}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        log(f"ERROR: Invalid JSON in track list: {e}")
        sys.exit(1)

    if not track_list:
        log("Track list is empty — nothing to track. Exiting.")
        sys.exit(0)

    log(f"Loaded {len(track_list)} barcode(s) from track list")

    # --- 3. Validate barcodes ---
    valid_items = []
    for item in track_list:
        barcode = item.get("barcode", "").strip().upper()
        if not barcode:
            log(f"WARN: Skipping entry with empty barcode: {item}")
            continue
        if not validate_barcode(barcode):
            log(f"WARN: Invalid barcode format, skipping: {barcode}")
            continue
        valid_items.append({"barcode": barcode, "note": item.get("note", "")})

    if not valid_items:
        log("No valid barcodes found. Exiting.")
        sys.exit(0)

    # --- 4. Load existing status store ---
    try:
        status_store = load_json(STATUS_STORE_PATH)
    except (FileNotFoundError, json.JSONDecodeError):
        log("Status store not found or invalid — initializing empty store")
        status_store = {"last_updated": None, "packages": {}}

    packages = status_store.get("packages", {})

    # --- 5. Filter out delivered packages ---
    active_items = []
    for item in valid_items:
        existing = packages.get(item["barcode"])
        if existing and existing.get("is_delivered", False):
            log(f"SKIP (delivered): {item['barcode']} — {item['note']}")
            continue
        active_items.append(item)

    if not active_items:
        log("All packages are delivered — no API calls needed. Exiting.")
        # Still update notes for any items in track_list (in case notes changed)
        for item in valid_items:
            if item["barcode"] in packages:
                packages[item["barcode"]]["note"] = item["note"]
        status_store["packages"] = packages
        save_json(STATUS_STORE_PATH, status_store)
        sys.exit(0)

    log(f"Active (non-delivered) packages: {len(active_items)}")

    # --- 6. Authenticate with Thailand Post API ---
    access_token = authenticate(api_token)

    # --- 7. Batch and track ---
    active_barcodes = [item["barcode"] for item in active_items]
    notes_map = {item["barcode"]: item["note"] for item in valid_items}
    changes_made = False

    for i in range(0, len(active_barcodes), BATCH_SIZE):
        batch = active_barcodes[i : i + BATCH_SIZE]
        log(f"Tracking batch {i // BATCH_SIZE + 1}: {len(batch)} barcode(s)")

        items_data = track_barcodes(access_token, batch)

        if not items_data:
            log(f"No data returned for batch {i // BATCH_SIZE + 1}")
            continue

        for barcode in batch:
            events = items_data.get(barcode, [])
            if not events:
                log(f"  {barcode}: No events returned")
                continue

            existing = packages.get(barcode)
            new_state = process_tracking_events(
                barcode, events, notes_map.get(barcode, ""), existing
            )

            # Check if status actually changed
            if existing:
                old_count = existing.get("track_count", "0")
                new_count = new_state.get("track_count", "0")
                old_status = existing.get("last_status", "")
                new_status = new_state.get("last_status", "")

                if old_count != new_count or old_status != new_status:
                    log(f"  {barcode}: UPDATED — {old_status} → {new_status} (events: {old_count} → {new_count})")
                    changes_made = True
                else:
                    log(f"  {barcode}: No change — {new_status}")
            else:
                log(f"  {barcode}: NEW — {new_state.get('last_status', 'Unknown')}")
                changes_made = True

            packages[barcode] = new_state

        # Rate limit between batches
        if i + BATCH_SIZE < len(active_barcodes):
            log("Waiting 5s between batches...")
            time.sleep(5)

    # --- 8. Update notes for delivered packages (in case notes changed in track_list) ---
    for item in valid_items:
        if item["barcode"] in packages:
            packages[item["barcode"]]["note"] = item["note"]

    # --- 9. Remove packages no longer in track_list ---
    tracked_barcodes = {item["barcode"] for item in valid_items}
    removed = [bc for bc in packages if bc not in tracked_barcodes]
    for bc in removed:
        log(f"Removing barcode no longer in track list: {bc}")
        del packages[bc]
        changes_made = True

    # --- 10. Save updated store ---
    status_store["last_updated"] = datetime.now(TH_TZ).isoformat()
    status_store["packages"] = packages
    save_json(STATUS_STORE_PATH, status_store)

    log("=" * 60)
    log(f"Done. Total: {len(packages)}, Active: {len(active_items)}, Changes: {changes_made}")
    log("=" * 60)


if __name__ == "__main__":
    main()
