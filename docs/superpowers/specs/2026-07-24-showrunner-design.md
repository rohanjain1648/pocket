# Showrunner — AI Production Copilot for Serialized Audio

**Date:** 2026-07-24
**Context:** PocketFM x Databricks hackathon (theme 4: creator superpowers, production copilots, script-to-episode pipelines, quality-check automation).

## Pitch

Traditional recommendation platforms optimize what to show a listener.
Showrunner optimizes what a *creator* ships in the first place: it predicts
beat-by-beat listener drop-off in a script before it's ever recorded,
diagnoses *why* using a multi-agent story-intelligence system grounded in a
per-series knowledge graph, one-click-rewrites the weak beats, and renders
the result into multi-voice audio — all tied to one number PocketFM already
lives and dies by: **predicted retention / next-episode unlock rate.**

Three pillars, one spine:

| Pillar | What it is |
|---|---|
| **Diagnose** | Retention heatmap + Cliffhanger/Pacing/Emotion/Dialogue/Readability scores per beat |
| **Ground** | Story Bible knowledge graph (characters, world rules, timeline, relationships) + consistency RAG |
| **Generate** | Novel/article → serialized cliffhanger-optimized script; one-click beat rewrites; script → multi-voice audio |

## Data model

`Series → Episode → Beat` (a beat = one scene/dialogue chunk).
`StoryBible(series)` = `Character | WorldRule | TimelineEvent | Relationship`.
`Analysis(beat)` = scores + agent findings + consistency flags.
`AudioRender(episode)`.

See `prisma/schema.prisma` for the full schema.

## Multi-agent architecture

A **Showrunner orchestrator** (`src/lib/agents/orchestrator.ts`) fans out,
per beat, in parallel:

- **Cliffhanger, Pacing, Emotion, Dialogue** agents — Groq (`openai/gpt-oss-120b`),
  chosen for latency: five beats × four agents fanned out in parallel needs
  to stay fast enough for a synchronous "Analyze" click.
- **Consistency** agent — Gemini (`gemini-flash-latest`), retrieves the
  most relevant Story Bible facts via vector search and checks the beat
  against them (character trait violations, broken world rules, timeline
  conflicts).
- **Readability** — computed locally (Flesch Reading Ease, remapped for
  spoken narrative), no LLM call needed.

Plus, invoked on demand rather than fanned out per-analysis:

- **Editor** agent (rewrite) — Gemini first, Groq fallback.
- **Bible-Builder** agent (entity extraction from new episodes) — Gemini,
  long context.
- **Adapter** agent (novel/article → serialized episodes) — Gemini, long
  context.
- **TTS Director** — casts a voice per character, renders via ElevenLabs
  (falls back to browser `SpeechSynthesis` with symbolic voice hints when
  no API key is set, so the multi-voice flow still demos end-to-end).

**Provider choice:** Groq and Gemini, not Anthropic — picked per project
requirements. Groq for low-latency fan-out, Gemini for long-context
reasoning (Story Bible RAG, adaptation, rewrites) and embeddings.

## Retention model

The core IP. Retention **compounds** beat over beat — you can't win back a
listener you already lost — which is what produces a realistic
monotonically-decaying curve instead of independent per-beat scores:

```
beat_quality  = weighted(cliffhanger, pacing, emotion, dialogue, readability)
                 — final beat of an episode weights cliffhanger at 50%
                 (that's the coin-unlock moment)
survival_rate = 0.80 + (beat_quality / 100) * 0.19
retention[i]  = retention[i-1] * survival_rate[i]      (retention[0] = 100)
dropoff_risk  = bucketed from survival_rate: low/medium/high/critical
```

Implemented transparently in `src/lib/retention/local.ts`. The Databricks
path (`src/lib/retention/databricks.ts`) calls an MLflow-served model with
the identical contract — same weighted "beat quality" kept for
interpretability, but `survival_rate` becomes a learned probability instead
of a formula. Swapping one for the other is a `.env` change
(`DATABRICKS_RETENTION_MODEL_ENDPOINT`), not a code change, and any endpoint
failure falls back to the local formula automatically.

## Story Bible RAG

`src/lib/vector/local-search.ts` embeds the Story Bible on the fly (Gemini
`gemini-embedding-001`, process-lifetime cache) and ranks by cosine
similarity — sufficient at hackathon-bible scale. `databricks.ts` swaps in a
real Vector Search Delta Sync index with Databricks-managed embeddings; see
`databricks/notebooks/03_vector_search_index.py`.

## Resilience design (also a pitch point)

Every external dependency degrades instead of crashing:

- No `GROQ_API_KEY` → specialist agents fall back to keyword/length-based
  heuristics (still produces varied, non-fake scores).
- No `GEMINI_API_KEY` → Consistency check reports "unavailable" instead of
  failing the whole analysis; rewrite requires *some* LLM key (no honest
  offline substitute for generative rewriting).
- No `ELEVENLABS_API_KEY` → audio render still succeeds, played back via
  browser TTS with symbolic voice-per-character casting.
- No Databricks env vars, or a live Databricks call failing → local
  formula/local vector search transparently takes over.

"Runs on a laptop with zero API keys in a degraded-but-functional mode,
scales to Databricks-served ML in production" is the resilience story.

## Databricks integration (sponsor bonus)

See `databricks/README.md`. Three notebooks: Delta ingest
(`01_ingest_beats_delta.py`), MLflow-tracked retention model
(`02_train_retention_model_mlflow.py`), Vector Search index
(`03_vector_search_index.py`). Real listener telemetry wasn't available, so
engagement labels are simulated from the same specialist scores the app
already computes (with noise) — the training/serving pipeline itself is
real and unchanged by swapping in real telemetry later.

## Known operational notes

- Dated model IDs rot fast: `gemini-2.0-flash` was already shut down
  (2026-06-01) and `llama-3.3-70b-versatile` deprecated (2026-06-17) by the
  time this was built. Fixed by using Gemini's `-latest` alias
  (`gemini-flash-latest`) where possible, and Groq's recommended
  replacement (`openai/gpt-oss-120b`) where no alias exists.
- Gemini's free tier rate-limits fairly aggressively under repeated
  Analyze calls (each beat fires an embed + a generateContent call for
  Consistency). For a live pitch demo, use a paid-tier/Vertex key or
  reduce Analyze frequency during rehearsal — the app degrades gracefully
  either way, but a live 429 means Consistency silently reports "no
  issues" instead of showing off the planted contradiction.

## What's built vs. remaining

Built: full data model, all seven agents, retention engine (local +
Databricks-ready), vector RAG (local + Databricks-ready), TTS pipeline
(ElevenLabs + browser fallback), dashboard + Studio UI (heatmap, beat
detail, rewrite, audio player), adaptation flow (paste source → serialized
series), Databricks notebooks, seed data with a deliberately weak beat and
a deliberately planted continuity violation for demo purposes. Verified
live in-browser against real Groq/Gemini API calls.

Not built (candidates for further iteration, not required for the current
demo path): PocketFM-real engagement data integration, a creator-facing
"before/after" retention delta report for the rewrite action, batch
adaptation of a whole novel rather than a single paste, waveform-accurate
audio concatenation (current ElevenLabs path does naive MP3 buffer
concatenation, acceptable for a demo, not broadcast-grade).
