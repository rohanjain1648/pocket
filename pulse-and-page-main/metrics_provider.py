"""
Single entry point for "give me the person's current heart rate" — tries a
connected wearable first, in this priority: Fitbit -> WHOOP -> BLE (direct
Bluetooth, works with almost any band, no account needed). Falls back to
manual entry if none are available.

Deliberately only asks for heart rate + whether the person is currently
active — no blood pressure, no step count. Those were tried and dropped:
they didn't change the recommendation for this use case and just added
friction to what the person has to type in.

Output shape is the same regardless of source, so callers (CLI or API)
don't need to know which path was taken:
    {"heart_rate": int, "is_active": bool, "source": "fitbit"|"whoop"|"ble"|"manual"}
"""
import asyncio
from typing import Optional

import config
from connectors import HEART_RATE_MEASUREMENT_UUID


def auto_detect(ble_name_filter: str = "", ble_scan_seconds: float = 5.0) -> Optional[dict]:
    """Tries Fitbit, then WHOOP, then a quick BLE scan. Returns None if nothing is connected."""
    fitbit = _try_fitbit()
    if fitbit:
        return fitbit

    whoop = _try_whoop()
    if whoop:
        return whoop

    device = asyncio.run(_find_ble_device(ble_name_filter, ble_scan_seconds))
    if device:
        hr = asyncio.run(_read_one_ble_reading(device))
        if hr:
            return {"heart_rate": hr, "is_active": False, "source": "ble"}

    return None


def get_metrics(ble_name_filter: str = "", ble_scan_seconds: float = 6.0) -> dict:
    """CLI convenience: auto-detect, and if nothing's connected, ask interactively."""
    result = auto_detect(ble_name_filter, ble_scan_seconds)
    if result:
        print(f"Connected via {result['source']} — HR: {result['heart_rate']} bpm")
        return result

    print("No connected wearable detected. Enter your metrics manually.")
    return _manual_input()


def build_manual_metrics(heart_rate: int, is_active: bool = False) -> dict:
    """Used by both the CLI's interactive prompt and the web API's request body."""
    return {"heart_rate": heart_rate, "is_active": is_active, "source": "manual"}


def _try_fitbit():
    if not config.FITBIT_ACCESS_TOKEN:
        return None
    try:
        from connectors import FitbitConnector
        snapshot = FitbitConnector(access_token=config.FITBIT_ACCESS_TOKEN).get_wellness_snapshot()
        return snapshot if snapshot.get("heart_rate") else None
    except Exception:
        return None


def _try_whoop():
    if not config.WHOOP_ACCESS_TOKEN:
        return None
    try:
        from connectors import WhoopConnector
        snapshot = WhoopConnector(access_token=config.WHOOP_ACCESS_TOKEN).get_wellness_snapshot()
        return snapshot if snapshot.get("heart_rate") else None
    except Exception:
        return None


async def _find_ble_device(name_filter: str, timeout: float):
    try:
        from bleak import BleakScanner
    except ImportError:
        return None

    try:
        devices = await BleakScanner.discover(timeout=timeout)
    except Exception:
        return None

    for d in devices:
        if d.name and (not name_filter or name_filter.lower() in d.name.lower()):
            return d
    return None


async def _read_one_ble_reading(device, timeout: float = 10.0):
    from bleak import BleakClient

    reading = {"bpm": None}
    got_reading = asyncio.Event()

    def handle_notification(_, data: bytearray):
        flags = data[0]
        bpm = int.from_bytes(data[1:3], "little") if flags & 0x1 else data[1]
        reading["bpm"] = bpm
        got_reading.set()

    try:
        async with BleakClient(device.address) as client:
            await client.start_notify(HEART_RATE_MEASUREMENT_UUID, handle_notification)
            try:
                await asyncio.wait_for(got_reading.wait(), timeout=timeout)
            except asyncio.TimeoutError:
                return None
            return reading["bpm"]
    except Exception:
        return None


def _manual_input() -> dict:
    def ask_int(prompt):
        while True:
            raw = input(prompt).strip()
            try:
                return int(raw)
            except ValueError:
                print("Please enter a whole number.")

    def ask_yes_no(prompt):
        return input(prompt).strip().lower() in ("y", "yes")

    heart_rate = ask_int("Heart rate (bpm): ")
    is_active = ask_yes_no("Currently walking / exercising right now? (y/n): ")
    return build_manual_metrics(heart_rate, is_active)
