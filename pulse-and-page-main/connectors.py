"""
Three ways in to heart-rate data. Pick whichever matches the device you're
demoing with — you don't need all three running at once.

1. FitbitConnector   -> Fitbit Web API (OAuth2, cloud, polling)
2. WhoopConnector    -> WHOOP API v2   (OAuth2, cloud, polling — NOT live-streaming)
3. BLEHeartRateConnector -> direct Bluetooth (no account, real-time, works with
   almost any watch/strap that broadcasts the standard Heart Rate Service)

Where to get credentials:
- Fitbit: https://dev.fitbit.com/apps -> "Register An App" -> Client ID/Secret.
  OAuth2 Authorization Code Grant with PKCE. Note: intraday (fine-grained,
  per-second/minute) heart rate requires Fitbit to approve your app for the
  "Intraday" scope on a case-by-case basis — without that approval you only
  get daily heart-rate zone summaries, not something you can react to live.
  Also: Fitbit Web API sunsets Sept 2026 (Google Health API is the successor).
  Fine for a hackathon demo now, not for a long-term build.
- WHOOP: https://developer.whoop.com -> Developer Dashboard -> create an app
  -> Client ID/Secret. OAuth2. Scopes: read:recovery, read:cycles, read:sleep,
  read:workout, offline. Important: WHOOP's public API is NOT a live heart-rate
  stream — it exposes periodic recovery/cycle/sleep summaries, updated a few
  times a day. Good for "how stressed has this user been today", not good for
  second-by-second reaction.
- BLE: no account needed. Put your watch/strap in pairing/broadcast mode.
  Uses the `bleak` library (cross-platform BLE). This is the only one of the
  three that gives you genuinely real-time heart rate, which is what you
  actually want for "tone changes as heart rate changes right now".
"""
import time
import requests

# ---------------------------------------------------------------------------
# 1. FITBIT WEB API
# ---------------------------------------------------------------------------
class FitbitConnector:
    BASE_URL = "https://api.fitbit.com"

    def __init__(self, access_token: str):
        if not access_token:
            raise ValueError("Missing FITBIT_ACCESS_TOKEN. See .env.example.")
        self.access_token = access_token

    def _headers(self):
        return {"Authorization": f"Bearer {self.access_token}"}

    def get_resting_heart_rate_today(self):
        """Daily summary heart rate (works without special approval)."""
        url = f"{self.BASE_URL}/1/user/-/activities/heart/date/today/1d.json"
        resp = requests.get(url, headers=self._headers(), timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data["activities-heart"][0]["value"]

    def get_intraday_heart_rate(self, detail_level="1min"):
        """
        Fine-grained heart rate for today. Requires Fitbit to have approved
        your app for Intraday access — request it at
        https://dev.fitbit.com/build/reference/web-api/intraday/
        """
        url = f"{self.BASE_URL}/1/user/-/activities/heart/date/today/1d/{detail_level}.json"
        resp = requests.get(url, headers=self._headers(), timeout=10)
        resp.raise_for_status()
        data = resp.json()
        dataset = data["activities-heart-intraday"]["dataset"]
        if not dataset:
            return None
        return dataset[-1]["value"]  # most recent bpm reading

    def get_wellness_snapshot(self) -> dict:
        """Fetch the Fitbit signals used by the listening agent.

        Each resource is optional: a token may not carry every Fitbit scope or
        a particular device may not measure it, so one failed resource never
        prevents the rest of the snapshot from being useful.
        """
        def get(path):
            try:
                r = requests.get(f"{self.BASE_URL}{path}", headers=self._headers(), timeout=10)
                r.raise_for_status(); return r.json()
            except requests.RequestException:
                return {}
        heart = get("/1/user/-/activities/heart/date/today/1d/1min.json")
        hrv = get("/1/user/-/hrv/date/today.json")
        spo2 = get("/1/user/-/spo2/date/today.json")
        breathing = get("/1/user/-/br/date/today.json")
        activity = get("/1/user/-/activities/date/today.json")
        sleep = get("/1.2/user/-/sleep/date/today.json")
        dataset = heart.get("activities-heart-intraday", {}).get("dataset", [])
        hrv_rows = hrv.get("hrv", [])
        spo2_rows = spo2.get("spo2", [])
        br_rows = breathing.get("br", [])
        sleeps = sleep.get("sleep", [])
        summary = activity.get("summary", {})
        return {
            "heart_rate": dataset[-1].get("value") if dataset else None,
            "hrv": (hrv_rows[-1].get("value", {}).get("dailyRmssd") if hrv_rows else None),
            "spo2": (spo2_rows[-1].get("value", {}).get("avg") if spo2_rows else None),
            "respiratory_rate": (br_rows[-1].get("value", {}).get("breathingRate") if br_rows else None),
            "steps": summary.get("steps"),
            "cadence": None,  # Fitbit cadence needs intraday activity permission.
            "sleep_minutes": sum(s.get("minutesAsleep", 0) for s in sleeps if s.get("isMainSleep")) or None,
            "is_active": bool(summary.get("fairlyActiveMinutes", 0) >= 10 or summary.get("veryActiveMinutes", 0) >= 5),
            "source": "fitbit",
        }


# ---------------------------------------------------------------------------
# 2. WHOOP API v2
# ---------------------------------------------------------------------------
class WhoopConnector:
    BASE_URL = "https://api.prod.whoop.com/developer/v2"

    def __init__(self, access_token: str):
        if not access_token:
            raise ValueError("Missing WHOOP_ACCESS_TOKEN. See .env.example.")
        self.access_token = access_token

    def _headers(self):
        return {"Authorization": f"Bearer {self.access_token}"}

    def get_latest_recovery(self):
        """
        Returns the most recent recovery record (includes HRV, resting HR,
        recovery score 0-100 — lower recovery score is a reasonable proxy
        for 'this person is under strain/stress').
        """
        url = f"{self.BASE_URL}/recovery"
        resp = requests.get(url, headers=self._headers(), params={"limit": 1}, timeout=10)
        resp.raise_for_status()
        records = resp.json().get("records", [])
        return records[0] if records else None

    def get_wellness_snapshot(self) -> dict:
        record = self.get_latest_recovery() or {}
        score = record.get("score") or {}
        # WHOOP recovery is daily, rather than a live medical telemetry feed.
        return {
            "heart_rate": score.get("resting_heart_rate"),
            "hrv": score.get("hrv_rmssd_milli"),
            "spo2": score.get("spo2_percentage"),
            "recovery_score": score.get("recovery_score"),
            "steps": None,
            "cadence": None,
            "respiratory_rate": score.get("respiratory_rate"),
            "sleep_minutes": None,
            "is_active": False,
            "source": "whoop",
        }


# ---------------------------------------------------------------------------
# 3. DIRECT BLE (Bluetooth Heart Rate Service) — real-time, no account
# ---------------------------------------------------------------------------
# Requires: pip install bleak
HEART_RATE_SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb"
HEART_RATE_MEASUREMENT_UUID = "00002a37-0000-1000-8000-00805f9b34fb"


class BLEHeartRateConnector:
    def __init__(self, device_name_filter: str = ""):
        self.device_name_filter = device_name_filter
        self._latest_bpm = None

    def _parse_heart_rate(self, data: bytes) -> int:
        # Standard BLE Heart Rate Measurement characteristic format.
        # Byte 0 = flags. Bit 0 of flags = 0 -> HR is UINT8, = 1 -> UINT16.
        flags = data[0]
        if flags & 0x1:
            return int.from_bytes(data[1:3], byteorder="little")
        return data[1]

    async def stream(self, on_reading):
        """
        Connects to the first matching BLE device broadcasting the Heart Rate
        Service and calls on_reading(bpm) every time a new reading arrives.
        Run this inside asyncio.run(...).
        """
        from bleak import BleakScanner, BleakClient

        print("Scanning for BLE heart rate devices...")
        devices = await BleakScanner.discover(timeout=8.0)
        target = None
        for d in devices:
            if d.name and (not self.device_name_filter or self.device_name_filter.lower() in d.name.lower()):
                target = d
                break

        if not target:
            raise RuntimeError("No matching BLE heart rate device found. Make sure it's in pairing/broadcast mode.")

        print(f"Connecting to {target.name} ({target.address})...")

        def handle_notification(_, data: bytearray):
            bpm = self._parse_heart_rate(bytes(data))
            self._latest_bpm = bpm
            on_reading(bpm)

        async with BleakClient(target.address) as client:
            await client.start_notify(HEART_RATE_MEASUREMENT_UUID, handle_notification)
            print("Streaming heart rate. Ctrl+C to stop.")
            while True:
                await asyncio_sleep(1.0)

    @property
    def latest_bpm(self):
        return self._latest_bpm


async def asyncio_sleep(seconds):
    import asyncio
    await asyncio.sleep(seconds)
