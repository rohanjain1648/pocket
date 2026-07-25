"""
Web backend for the frontend.
"""
import os
import uuid
from typing import Optional, Union

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
import metrics_provider
import content_provider
import llm_tts
from tone_engine import apply_tone
from passage_provider import get_two_minute_passage
from stress_analyzer import StressAnalyzer

app = FastAPI(title="Biometric Audiobook")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GENERATED_DIR = "static/generated"
os.makedirs(GENERATED_DIR, exist_ok=True)
app.mount("/generated", StaticFiles(directory=GENERATED_DIR), name="generated")


class ManualMetrics(BaseModel):
    heart_rate: Optional[int] = None
    is_active: bool = False
    spo2: Optional[float] = None
    hrv: Optional[float] = None
    respiratory_rate: Optional[float] = None
    steps: Optional[int] = None
    cadence: Optional[float] = None
    sleep_minutes: Optional[int] = None
    recovery_score: Optional[float] = None
    source: str = "manual"


@app.get("/")
def index():
    return FileResponse("static/index.html")


@app.get("/api/auto-connect")
def auto_connect():
    """Tries Fitbit -> WHOOP -> BLE. Returns connected: false if nothing is available."""
    result = metrics_provider.auto_detect(ble_name_filter=config.BLE_DEVICE_NAME_FILTER)
    if not result:
        return {"connected": False}
    return {"connected": True, **result}


@app.get("/api/categories")
def categories():
    """Return all emotion folders catalog."""
    return content_provider.get_all_categories()


@app.get("/api/voices")
def voices():
    """Which narration voice each wellbeing state maps to."""
    return {"provider": config.TTS_PROVIDER,
            "voices": {state: llm_tts.voice_for_state(state) for state in llm_tts.STATE_VOICES}}


class NarrateRequest(BaseModel):
    state: str
    text: str
    book_id: Optional[Union[int, str]] = None


@app.post("/api/suggest")
def suggest(metrics: ManualMetrics):
    return _payload(_assess(metrics), metrics)


@app.post("/api/assess")
def assess(metrics: ManualMetrics):
    """Fast local assessment used while the simulation sliders are moving.

    It also returns the matching stories, so the recommendation grid updates
    live as soon as the state changes instead of waiting for a button press.
    """
    return _payload(_assess(metrics), metrics)


def _payload(assessment: dict, metrics: ManualMetrics) -> dict:
    return {
        **assessment,
        "heart_rate": metrics.heart_rate,
        "source": metrics.source,
        "narration_voice": llm_tts.voice_for_state(assessment["state"]),
        "stories": content_provider.get_stories_for_mode(assessment["mode"]),
        "graph": content_provider.knowledge_graph(assessment["mode"], assessment),
    }


def _assess(metrics: ManualMetrics) -> dict:
    if metrics.heart_rate is None:
        raise HTTPException(status_code=422, detail="Heart rate is required to make a recommendation.")
    analyzer = StressAnalyzer(baseline_hr=config.RESTING_HR_BASELINE, baseline_hrv=config.HRV_BASELINE)
    return analyzer.assess(metrics.model_dump() if hasattr(metrics, "model_dump") else metrics.dict())


@app.post("/api/narrate")
def narrate(req: NarrateRequest):
    state = llm_tts.normalize_state(req.state)
    provider = config.TTS_PROVIDER

    if provider == "elevenlabs":
        # ElevenLabs already delivers the state's tone (its own voice plus
        # stability / style / speed), so no DSP pass — post-processing a good
        # render only adds artefacts.
        filename = f"{uuid.uuid4().hex}.mp3"
        output_path = os.path.join(GENERATED_DIR, filename)
        try:
            llm_tts.synthesize_elevenlabs(req.text, state, output_path)
        except Exception as e:
            if os.path.exists(output_path):
                os.remove(output_path)
            raise HTTPException(status_code=502, detail=f"Narration generation failed: {e}")
        return {"audio_url": f"/generated/{filename}", "estimated_minutes": 2,
                "state": state, "voice": llm_tts.voice_for_state(state), "provider": provider}

    # OpenAI / Groq: a single generic voice, so keep the DSP tone pass.
    filename = f"{uuid.uuid4().hex}.wav"
    output_path = os.path.join(GENERATED_DIR, filename)
    temporary_path = os.path.join(GENERATED_DIR, f"{uuid.uuid4().hex}.mp3")
    try:
        if provider == "groq":
            temporary_path = temporary_path.removesuffix(".mp3") + ".wav"
            llm_tts.synthesize_groq(req.text, state, temporary_path)
        else:
            llm_tts.synthesize_openai(req.text, state, temporary_path)
        if config.TONE_DSP:
            apply_tone(temporary_path, output_path, state)
        else:
            os.replace(temporary_path, output_path)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Narration generation failed: {e}")
    finally:
        if os.path.exists(temporary_path):
            os.remove(temporary_path)

    return {"audio_url": f"/generated/{filename}", "estimated_minutes": 2,
            "state": state, "voice": llm_tts.voice_for_state(state), "provider": provider}
