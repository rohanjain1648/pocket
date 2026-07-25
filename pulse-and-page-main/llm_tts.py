"""State-aware text-to-speech.

Three providers, all with the same (text, state, output_path) signature so the
caller can swap between them with one environment variable:

    TTS_PROVIDER = elevenlabs | openai | groq

ElevenLabs is the default and the highest quality of the three.  Instead of
pitch-shifting one voice in post, each wellbeing state gets its **own** voice
plus its own delivery settings:

    high_stress -> soft, low, slow, very steady        (calm the listener down)
    elevated    -> warm, measured, reassuring          (settle back to baseline)
    normal      -> bright, lively, expressive          (raise energy)
    recovery    -> playful, relaxed, comedic           (make them laugh)
    active      -> brisk, sparkling, high-energy       (match workout tempo)
"""
import os
import re
import threading

import requests

ELEVEN_API = "https://api.elevenlabs.io/v1"

# --- ElevenLabs: one voice + one delivery profile per wellbeing state --------
# voice_id values are ElevenLabs' shared default library voices, available on
# every account. If an id is unavailable the code falls back to resolving the
# voice by name against /v1/voices, then to the first voice on the account.
#
# voice_settings:
#   stability        higher = steadier/calmer, lower = more emotive variation
#   similarity_boost fidelity to the original voice
#   style            higher = more expressive/exaggerated delivery
#   speed            0.7-1.2 pacing baked into the generation (no DSP needed)
STATE_VOICES = {
    "high_stress": {
        "name": "Sarah",
        "voice_id": "EXAVITQu4vr4xnSDxMaL",
        "description": "Soft, low, unhurried female voice for calming someone down",
        "voice_settings": {"stability": 0.92, "similarity_boost": 0.75, "style": 0.05,
                           "speed": 0.80, "use_speaker_boost": True},
    },
    "elevated": {
        "name": "Matilda",
        "voice_id": "XrExE9yKIg1WjnnlVkGX",
        "description": "Warm, friendly narration that settles you back to baseline",
        "voice_settings": {"stability": 0.78, "similarity_boost": 0.75, "style": 0.15,
                           "speed": 0.92, "use_speaker_boost": True},
    },
    "normal": {
        "name": "Laura",
        "voice_id": "FGY2WhTYpPnrIDTdsKH5",
        "description": "Bright, upbeat and energetic voice to lift a balanced mood",
        "voice_settings": {"stability": 0.40, "similarity_boost": 0.80, "style": 0.55,
                           "speed": 1.06, "use_speaker_boost": True},
    },
    "recovery": {
        "name": "Charlie",
        "voice_id": "IKne3meq5aSn9XLyUdCD",
        "description": "Relaxed, playful comic delivery for post-workout recovery",
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.75, "style": 0.50,
                           "speed": 1.00, "use_speaker_boost": True},
    },
    "active": {
        "name": "Jessica",
        "voice_id": "cgSgspJ2msm6clMCkdW9",
        "description": "Sparkling, brisk, high-energy voice that matches workout tempo",
        "voice_settings": {"stability": 0.35, "similarity_boost": 0.80, "style": 0.65,
                           "speed": 1.12, "use_speaker_boost": True},
    },
}
# older mode names still resolve
STATE_ALIASES = {"calm": "recovery", "restore": "high_stress", "settle": "elevated",
                 "everyday": "normal", "focus": "normal", "workout": "active"}

DEFAULT_ELEVEN_MODEL = os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2")

STATE_TONE_INSTRUCTIONS = {
    "high_stress": "Speak slowly and very softly, in a low, calm, reassuring tone, "
                   "like gently talking someone down from anxiety. Long pauses between sentences.",
    "elevated": "Speak at a slightly slower pace than normal, warm and settled, gently reassuring.",
    "normal": "Speak with bright, lively energy, expressive and engaging, like a favourite narrator "
              "who is genuinely enjoying the story.",
    "recovery": "Speak in a relaxed, playful, comedic tone with a smile in the voice; land the jokes.",
    "active": "Speak with energy and enthusiasm, upbeat and brisk, matching someone who's active and moving.",
}

STATE_ORPHEUS_TAG = {
    "high_stress": "[whisper]", "elevated": "[calm]", "normal": "[cheerful]",
    "recovery": "[laugh]", "active": "[excited]",
}

DEFAULT_OPENAI_VOICE = "coral"
DEFAULT_GROQ_VOICE = "hannah"

_voice_cache = {}
_voice_lock = threading.Lock()


def normalize_state(state: str) -> str:
    state = (state or "normal").lower()
    state = STATE_ALIASES.get(state, state)
    return state if state in STATE_VOICES else "normal"


def voice_for_state(state: str) -> dict:
    """Public helper so the API can tell the UI which voice will be used."""
    profile = STATE_VOICES[normalize_state(state)]
    return {"name": profile["name"], "voice_id": profile["voice_id"],
            "description": profile["description"], "settings": profile["voice_settings"]}


# --- ElevenLabs -------------------------------------------------------------
def _eleven_key() -> str:
    api_key = os.getenv("ELEVENLABS_API_KEY") or os.getenv("ELEVEN_API_KEY")
    if not api_key:
        raise ValueError("Missing ELEVENLABS_API_KEY. Add it to .env.")
    return api_key


def _resolve_voice_id(name: str, preferred_id: str, api_key: str) -> str:
    """Return a voice id that actually exists on this account.

    Tries the hardcoded default-library id first; if the account cannot use it,
    looks the voice up by name, then falls back to any available voice.
    """
    with _voice_lock:
        if preferred_id in _voice_cache:
            return _voice_cache[preferred_id]
    resolved = preferred_id
    try:
        resp = requests.get(f"{ELEVEN_API}/voices", headers={"xi-api-key": api_key}, timeout=20)
        if resp.ok:
            voices = resp.json().get("voices", [])
            ids = {v.get("voice_id") for v in voices}
            if voices and preferred_id not in ids:
                by_name = next((v["voice_id"] for v in voices
                                if v.get("name", "").lower() == name.lower()), None)
                resolved = by_name or voices[0]["voice_id"]
    except requests.RequestException:
        pass
    with _voice_lock:
        _voice_cache[preferred_id] = resolved
    return resolved


def _prepare_text(text: str, state: str) -> str:
    """Light delivery shaping that ElevenLabs honours in the text itself.

    For calming states we lengthen the beat between sentences, which reads as
    slower, more deliberate narration without the artefacts that post-hoc
    time-stretching introduces.
    """
    text = re.sub(r"\s+", " ", (text or "").strip())
    if state in ("high_stress", "elevated"):
        text = re.sub(r"(?<=[.!?])\s+", "  ...  ", text)
    return text


def synthesize_elevenlabs(text: str, state: str, output_path: str,
                          model_id: str = None, voice_id: str = None) -> str:
    api_key = _eleven_key()
    state = normalize_state(state)
    profile = STATE_VOICES[state]
    vid = voice_id or _resolve_voice_id(profile["name"], profile["voice_id"], api_key)

    resp = requests.post(
        f"{ELEVEN_API}/text-to-speech/{vid}",
        headers={"xi-api-key": api_key, "Content-Type": "application/json",
                 "Accept": "audio/mpeg"},
        json={
            "text": _prepare_text(text, state),
            "model_id": model_id or DEFAULT_ELEVEN_MODEL,
            "voice_settings": profile["voice_settings"],
            "output_format": "mp3_44100_128",
        },
        timeout=120,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"ElevenLabs TTS error {resp.status_code}: {resp.text[:400]}")
    _write(output_path, resp.content)
    return output_path


# --- OpenAI -----------------------------------------------------------------
def synthesize_openai(text: str, state: str, output_path: str, voice: str = DEFAULT_OPENAI_VOICE) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("Missing OPENAI_API_KEY. See .env.example.")

    resp = requests.post(
        "https://api.openai.com/v1/audio/speech",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": "gpt-4o-mini-tts",
            "input": text,
            "voice": voice,
            "instructions": STATE_TONE_INSTRUCTIONS.get(normalize_state(state),
                                                        STATE_TONE_INSTRUCTIONS["normal"]),
            "response_format": "mp3",
        },
        timeout=60,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"OpenAI TTS error {resp.status_code}: {resp.text}")
    _write(output_path, resp.content)
    return output_path


# --- Groq / Orpheus ---------------------------------------------------------
def synthesize_groq(text: str, state: str, output_path: str, voice: str = DEFAULT_GROQ_VOICE) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("Missing GROQ_API_KEY. See .env.example.")

    tag = STATE_ORPHEUS_TAG.get(normalize_state(state), "")
    tagged_text = f"{tag} {text}".strip()

    resp = requests.post(
        "https://api.groq.com/openai/v1/audio/speech",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": "canopylabs/orpheus-v1-english",
            "input": tagged_text,
            "voice": voice,
            "response_format": "wav",
        },
        timeout=60,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Groq TTS error {resp.status_code}: {resp.text}")
    _write(output_path, resp.content)
    return output_path


def _write(output_path: str, content: bytes):
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(content)
