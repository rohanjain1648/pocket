"""
Default (no wearable required):
    python main.py
Auto-detects Fitbit -> WHOOP -> BLE (whichever is configured/connected); if
none, asks you to type your heart rate in. Either way it classifies stress,
pulls a real public-domain story matching the mood, and narrates it with
whichever TTS provider is configured (OpenAI or Groq; falls back to a local
placeholder + DSP tone shift if neither is set up yet).

For the web frontend instead, see app.py:
    uvicorn app:app --reload

Old continuous-polling modes (once you have a real Fitbit/WHOOP account):
    python main.py --source fitbit
    python main.py --source whoop
    python main.py --source ble
"""
import argparse
import os
import time

import config
from stress_analyzer import StressAnalyzer
from tone_engine import apply_tone


def run_single_shot():
    import metrics_provider

    metrics = metrics_provider.get_metrics(ble_name_filter=config.BLE_DEVICE_NAME_FILTER)

    analyzer = StressAnalyzer(baseline_hr=config.RESTING_HR_BASELINE)
    state = analyzer.classify(bpm=metrics["heart_rate"], is_active=metrics.get("is_active", False))

    print(f"\nSource: {metrics['source']}  |  HR: {metrics['heart_rate']} bpm  |  State: {state}")

    story = None
    try:
        import gutenberg_provider
        story = gutenberg_provider.get_story_for_state(state)
        print(f"Real story selected: \"{story['title']}\" by {story['author']}")
    except Exception as e:
        print(f"Couldn't fetch a real story from Gutenberg ({e}). Falling back to the local placeholder catalog.")

    if story:
        provider = os.getenv("TTS_PROVIDER", "openai").lower()
        try:
            import llm_tts
            out_path = f"{config.OUTPUT_AUDIO_DIR}/narration_{state}.mp3"
            if provider == "groq" and os.getenv("GROQ_API_KEY"):
                llm_tts.synthesize_groq(story["text"], state, out_path)
            elif os.getenv("OPENAI_API_KEY"):
                llm_tts.synthesize_openai(story["text"], state, out_path)
            else:
                print("Story text fetched, but no TTS provider is configured yet "
                      "(set OPENAI_API_KEY or GROQ_API_KEY in .env).")
                print(f"Excerpt preview: {story['text'][:300]}...")
                return
            print(f"Real narrated audio generated -> {out_path}")
            return
        except Exception as e:
            print(f"TTS generation failed ({e}).")
            print(f"Excerpt preview: {story['text'][:300]}...")
            return

    # Fallback: Gutenberg unreachable — old placeholder catalog + local DSP tone shift.
    import story_selector
    rec = story_selector.recommend(state)
    print(f"Recommended (placeholder) story: {rec['story']}")
    print(f"Narration style: {rec['narration_style']}")
    if os.path.exists(config.INPUT_AUDIO_PATH):
        out_path = f"{config.OUTPUT_AUDIO_DIR}/narration_{state}.wav"
        apply_tone(config.INPUT_AUDIO_PATH, out_path, state)
        print(f"Tone-adjusted placeholder audio rendered -> {out_path}")
    else:
        print(f"(No audio at {config.INPUT_AUDIO_PATH} either — nothing to render.)")


def run_polling_source(get_bpm_fn, poll_seconds=15):
    analyzer = StressAnalyzer(baseline_hr=config.RESTING_HR_BASELINE)
    last_state = None
    while True:
        bpm = get_bpm_fn()
        if bpm is None:
            print("No reading available yet, retrying...")
            time.sleep(poll_seconds)
            continue
        state = analyzer.classify(bpm)
        print(f"HR={bpm} bpm -> state={state}")
        if state != last_state:
            out_path = f"{config.OUTPUT_AUDIO_DIR}/narration_{state}.wav"
            apply_tone(config.INPUT_AUDIO_PATH, out_path, state)
            print(f"Tone changed -> {state}. Re-rendered audio at {out_path}")
            last_state = state
        time.sleep(poll_seconds)


def run_ble_polling_source():
    import asyncio
    from connectors import BLEHeartRateConnector

    analyzer = StressAnalyzer(baseline_hr=config.RESTING_HR_BASELINE)
    connector = BLEHeartRateConnector(device_name_filter=config.BLE_DEVICE_NAME_FILTER)
    last_state = {"value": None}

    def on_reading(bpm):
        state = analyzer.classify(bpm)
        print(f"HR={bpm} bpm -> state={state}")
        if state != last_state["value"]:
            out_path = f"{config.OUTPUT_AUDIO_DIR}/narration_{state}.wav"
            apply_tone(config.INPUT_AUDIO_PATH, out_path, state)
            print(f"Tone changed -> {state}. Re-rendered audio at {out_path}")
            last_state["value"] = state

    asyncio.run(connector.stream(on_reading))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", choices=["fitbit", "whoop", "ble"], default=None,
                         help="Omit this for the default auto-detect-or-manual single-shot flow.")
    args = parser.parse_args()

    if args.source is None:
        run_single_shot()
    elif args.source == "fitbit":
        from connectors import FitbitConnector
        conn = FitbitConnector(access_token=config.FITBIT_ACCESS_TOKEN)
        run_polling_source(conn.get_intraday_heart_rate, poll_seconds=15)
    elif args.source == "whoop":
        from connectors import WhoopConnector
        conn = WhoopConnector(access_token=config.WHOOP_ACCESS_TOKEN)

        def get_bpm():
            record = conn.get_latest_recovery()
            return record["score"]["resting_heart_rate"] if record else None

        run_polling_source(get_bpm, poll_seconds=300)
    elif args.source == "ble":
        run_ble_polling_source()


if __name__ == "__main__":
    main()
