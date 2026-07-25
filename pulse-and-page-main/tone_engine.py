"""
Applies a stress-state-appropriate tone to an audio file.

Approach: real audio DSP (pitch shift, tempo, low-pass filter, volume) via
librosa, applied to a base narration track. This is more reliable for a
hackathon than trying to do true real-time TTS voice modulation.

If you'd rather not touch DSP at all: pre-generate 3-4 versions of each line
through your TTS provider (calm/soft, normal, energetic) and just pick which
file to play based on `state` — swap TONE_PROFILES for a dict of file paths
instead of effect params. Both approaches plug into the same interface.
"""
import os

# librosa/soundfile are imported lazily inside apply_tone: the ElevenLabs path
# never touches DSP, so the app should still start without them installed.

# Effect parameters per stress state.
# pitch_shift: semitones (negative = lower/calmer)
# tempo_rate: playback speed multiplier (below 1.0 = slower)
# lowpass_cutoff_hz: None = no filter, lower = warmer/softer sound
# volume_db: gain adjustment
TONE_PROFILES = {
    "high_stress": {"pitch_shift": -3.0, "tempo_rate": 0.86, "lowpass_cutoff_hz": 2600, "volume_db": -4},
    "elevated":    {"pitch_shift": -1.5, "tempo_rate": 0.93, "lowpass_cutoff_hz": 4000, "volume_db": -2},
    "normal":      {"pitch_shift": 0.0,  "tempo_rate": 1.0,  "lowpass_cutoff_hz": None, "volume_db": 0},
    "calm":        {"pitch_shift": 0.0,  "tempo_rate": 1.0,  "lowpass_cutoff_hz": None, "volume_db": 0},
    "recovery":    {"pitch_shift": 0.3,  "tempo_rate": 0.98, "lowpass_cutoff_hz": None, "volume_db": 0},
    "active":      {"pitch_shift": 0.5,  "tempo_rate": 1.05, "lowpass_cutoff_hz": None, "volume_db": 1},
}

# older mode names map onto the profiles above
STATE_ALIASES = {"restore": "high_stress", "settle": "elevated", "everyday": "normal",
                 "focus": "normal", "workout": "active"}


def _apply_lowpass(y, sr: int, cutoff_hz: float):
    from scipy.signal import butter, lfilter
    nyquist = 0.5 * sr
    normal_cutoff = cutoff_hz / nyquist
    b, a = butter(4, normal_cutoff, btype="low", analog=False)
    return lfilter(b, a, y)


def apply_tone(input_path: str, output_path: str, state: str) -> str:
    """
    Loads input_path, applies the effect profile for `state`, writes the
    result to output_path. Returns output_path.
    """
    import librosa
    import soundfile as sf

    state = STATE_ALIASES.get(state, state)
    if state not in TONE_PROFILES:
        raise ValueError(f"Unknown state '{state}'. Expected one of {list(TONE_PROFILES)}")

    profile = TONE_PROFILES[state]
    y, sr = librosa.load(input_path, sr=None)

    if profile["pitch_shift"] != 0.0:
        y = librosa.effects.pitch_shift(y, sr=sr, n_steps=profile["pitch_shift"])

    if profile["tempo_rate"] != 1.0:
        y = librosa.effects.time_stretch(y, rate=profile["tempo_rate"])

    if profile["lowpass_cutoff_hz"]:
        y = _apply_lowpass(y, sr, profile["lowpass_cutoff_hz"])

    if profile["volume_db"] != 0:
        y = y * (10 ** (profile["volume_db"] / 20))

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    sf.write(output_path, y, sr)
    return output_path
