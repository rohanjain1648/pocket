"""
Central config. Loads all credentials from environment variables (.env file).
Nothing here is hardcoded — fill in .env based on .env.example.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# --- Fitbit Web API ---
# Get these from: https://dev.fitbit.com/apps -> Register an App
# NOTE: Fitbit Web API is being sunset by Google in Sept 2026, replaced by
# the Google Health API (health.googleapis.com). Fine to use for a hackathon
# demo right now, but don't build a long-term product on it. See run notes.
FITBIT_CLIENT_ID = os.getenv("FITBIT_CLIENT_ID")
FITBIT_CLIENT_SECRET = os.getenv("FITBIT_CLIENT_SECRET")
FITBIT_ACCESS_TOKEN = os.getenv("FITBIT_ACCESS_TOKEN")  # obtained via OAuth2 flow, see connectors.py

# --- WHOOP API v2 ---
# Get these from: https://developer.whoop.com -> Developer Dashboard -> create an app
WHOOP_CLIENT_ID = os.getenv("WHOOP_CLIENT_ID")
WHOOP_CLIENT_SECRET = os.getenv("WHOOP_CLIENT_SECRET")
WHOOP_ACCESS_TOKEN = os.getenv("WHOOP_ACCESS_TOKEN")  # obtained via OAuth2 flow, see connectors.py

# --- BLE (direct Bluetooth, no account/API key needed) ---
# Any watch/strap broadcasting the standard Heart Rate Service (UUID 0x180D)
# works here — Polar, most Garmins in BLE broadcast mode, generic HR straps, etc.
BLE_DEVICE_NAME_FILTER = os.getenv("BLE_DEVICE_NAME_FILTER", "")  # optional substring to match device name

# --- Stress classification baseline ---
# Ideally calibrate this per-user (resting HR average over a week).
RESTING_HR_BASELINE = int(os.getenv("RESTING_HR_BASELINE", "70"))
HRV_BASELINE = float(os.getenv("HRV_BASELINE", "45"))

# --- Audio ---
INPUT_AUDIO_PATH = os.getenv("INPUT_AUDIO_PATH", "sample_narration.wav")
OUTPUT_AUDIO_DIR = os.getenv("OUTPUT_AUDIO_DIR", "output_audio")

# --- Narration ---
# elevenlabs (default, best quality — a distinct voice per wellbeing state)
# openai | groq are kept as fallbacks.
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "elevenlabs").strip().lower()
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_MODEL = os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2")
# librosa pitch/tempo post-processing. Only useful for single-voice providers;
# it is skipped entirely for ElevenLabs because it degrades the render.
TONE_DSP = os.getenv("TONE_DSP", "true").strip().lower() in ("1", "true", "yes", "on")
