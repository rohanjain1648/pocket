# Pulse & Page

**Audiobooks that read your body, then change how they sound.**

Pulse & Page reads wearable signals (or a manual entry), works out what state
you're in, picks a book shelf that suits that state, and narrates a passage in
a voice chosen to move you *toward* where you should be — soft and slow when
you're stressed, bright and energetic when you're steady, brisk when you're
moving.

It is a wellbeing tool, not a medical device. See [Disclaimer](#disclaimer).

---

## The idea

Most audiobook apps play the same voice no matter what's happening to you.
Pulse & Page treats narration as an intervention:

| Your state | What it plays | How it reads it | Intent |
| --- | --- | --- | --- |
| High stress | Calming classics (*The Wind in the Willows*, *Walden*) | Soft, low, 0.80× speed, long pauses | Bring you down |
| Elevated stress | Grounding comfort reads (*Anne of Green Gables*) | Warm, measured, 0.92× speed | Settle you to baseline |
| Normal | Joyful, witty fiction (*Alice in Wonderland*, *Pride and Prejudice*) | Bright, expressive, 1.06× speed | Lift your energy |
| Recovery | Laugh-out-loud comedy (*Three Men in a Boat*) | Relaxed, playful, comedic | Make you laugh while you rest |
| Physically active | Rom-com (*Emma*, *The Enchanted April*) | Sparkling, brisk, 1.12× speed | Match your tempo |

---

## How the state is decided

Every signal contributes a **continuous** amount to one of two indices rather
than an all-or-nothing point. That matters: with a coarse integer system most
slider movement produces no visible change and the reachable band collapses to
two or three states.

```
stress_index    0–100   how activated / strained the body looks
recovery_index  0–100   how rested and parasympathetic it looks
```

**Stress contributors** (max weight): heart rate vs. personal resting baseline
(45), HRV deficit (30), wearable recovery score (18), short sleep (12), low
SpO2 (10), fast breathing (8).

**Recovery contributors**: HRV surplus (35), high recovery score (30), generous
sleep (15), slow breathing (10), sub-baseline heart rate (10), stillness (8).

Then:

| State | Condition |
| --- | --- |
| `active` | `is_active` is set, or cadence ≥ 105 steps/min |
| `high_stress` | `stress_index` ≥ 45 |
| `elevated` | `stress_index` ≥ 22 |
| `recovery` | `stress_index` < 22 **and** `recovery_index` ≥ 38 |
| `normal` | everything else |

Any single slider pushed far enough can carry the state on its own, so all five
moods are reachable from the simulator. Heart rate alone, with every other
input at its default, walks the full range:

```
HR  70 -> normal       stress  0.0
HR  95 -> elevated     stress 26.8
HR 115 -> high_stress  stress 45.0
```

Both indices, their per-signal breakdown, and the thresholds are returned by the
API and drawn as live meters in the UI, so nothing about the decision is hidden.

---

## Narration voices

Narration uses **ElevenLabs**, with a distinct voice and delivery profile per
state rather than one voice pitch-shifted in post-processing:

| State | Voice | `stability` | `style` | `speed` |
| --- | --- | --- | --- | --- |
| `high_stress` | Sarah | 0.92 | 0.05 | 0.80× |
| `elevated` | Matilda | 0.78 | 0.15 | 0.92× |
| `normal` | Laura | 0.40 | 0.55 | 1.06× |
| `recovery` | Charlie | 0.45 | 0.50 | 1.00× |
| `active` | Jessica | 0.35 | 0.65 | 1.12× |

High `stability` reads as steady and calm; low `stability` with high `style`
reads as expressive and animated. Calming states also get lengthened pauses
inserted between sentences in the text itself.

Because ElevenLabs already renders the tone, the librosa DSP pass is **skipped**
for this provider — post-processing a good render only adds artefacts. It still
runs for the `openai` and `groq` fallbacks (disable with `TONE_DSP=false`).

Voice IDs self-heal: if an ID isn't available on your account, the code resolves
the voice by name against `/v1/voices` before falling back.

---

## Quick start

```bash
git clone https://github.com/Aishwary0402/pulse-and-page.git
cd pulse-and-page

python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # then add your ElevenLabs key
uvicorn app:app --reload
```

Open **http://localhost:8000**. With no wearable connected the page shows the
manual simulator — drag the sliders and watch the mood, the shelf, and the
narrator all change. Only heart rate is required; every other field is optional.

There's also a CLI:

```bash
python main.py                    # auto-detect wearable, else prompt for HR
python main.py --source fitbit    # or whoop / ble
```

---

## Configuration

Everything lives in `.env` (see `.env.example`). Nothing is hardcoded.

| Variable | Default | Purpose |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` | — | **Required** for narration |
| `ELEVENLABS_MODEL` | `eleven_multilingual_v2` | `eleven_turbo_v2_5` is faster/cheaper |
| `TTS_PROVIDER` | `elevenlabs` | `elevenlabs` \| `openai` \| `groq` |
| `TONE_DSP` | `true` | librosa post-processing for the fallback providers |
| `RESTING_HR_BASELINE` | `70` | Your resting HR — calibrate for accurate results |
| `HRV_BASELINE` | `45` | Your baseline RMSSD |
| `FITBIT_ACCESS_TOKEN` | — | Optional wearable connector |
| `WHOOP_ACCESS_TOKEN` | — | Optional wearable connector |
| `BLE_DEVICE_NAME_FILTER` | — | Optional substring match for a BLE strap |

> `.env` is gitignored. Never commit real keys — and rotate any key that has
> been pasted into a chat, a screenshot, or a demo.

---

## API

| Endpoint | Method | Returns |
| --- | --- | --- |
| `/` | GET | The single-page UI |
| `/api/assess` | POST | State, both indices, per-signal breakdown, matching books, knowledge graph |
| `/api/suggest` | POST | Same payload (kept for the original call site) |
| `/api/narrate` | POST | `{audio_url, voice, state, provider}` for a generated passage |
| `/api/categories` | GET | The full book catalog, grouped by shelf |
| `/api/voices` | GET | The state → voice mapping and its settings |
| `/api/auto-connect` | GET | Tries Fitbit → WHOOP → BLE |

```bash
curl -X POST localhost:8000/api/assess \
  -H 'Content-Type: application/json' \
  -d '{"heart_rate":115,"hrv":22,"spo2":95,"sleep_minutes":300}'
```

---

## Wearables

| Source | Signals |
| --- | --- |
| Fitbit | Heart rate, HRV, SpO2, breathing rate, activity, sleep |
| WHOOP | Daily recovery score |
| BLE (0x180D) | Live heart rate only — Polar, generic HR straps, Garmin in broadcast mode |
| Manual | Whatever you type; heart rate is the only required field |

You must authorise the relevant OAuth scopes yourself. Some signals vary by
device and subscription tier.

> Fitbit's Web API is being sunset by Google in September 2026 in favour of the
> Google Health API. Fine for a demo; don't build a product on it.

---

## Project layout

```
app.py                 FastAPI backend and routes
main.py                CLI entry point
stress_analyzer.py     Signals -> stress/recovery indices -> state
llm_tts.py             ElevenLabs / OpenAI / Groq synthesis, voice mapping
tone_engine.py         librosa DSP tone pass (fallback providers only)
content_provider.py    Curated public-domain catalog, five shelves
story_selector.py      Listening intent and narration direction per state
passage_provider.py    Pulls a clean ~2 min passage from Project Gutenberg
gutenberg_provider.py  Gutendex search and excerpt extraction
metrics_provider.py    Wearable auto-detection and manual fallback
connectors.py          Fitbit, WHOOP and BLE clients
static/index.html      Single-file frontend
```

---

## Books

All texts are public domain, sourced from
[Project Gutenberg](https://www.gutenberg.org/). Nothing copyrighted is bundled
in the repo — longer passages are fetched at narration time and stripped of
front matter.

---

## Disclaimer

This is a wellbeing recommendation heuristic, **not** a medical device and not a
diagnosis. It should not be used to interpret a low SpO2 reading, an abnormal
heart rate, or any other health signal. If a reading concerns you, talk to a
clinician rather than an audiobook app.
