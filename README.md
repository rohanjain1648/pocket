# 🎬 Showrunner

**An AI Production Copilot & Discovery Platform for Serialized Audio**
_Built for the PocketFM × Databricks Hackathon_

Showrunner is two connected products in one Next.js app:

1. **A production copilot** for writers/producers — paste a story idea in, get a beat-by-beat
   analyzed, consistency-checked, voice-cast, fully-rendered audio drama episode out, with a
   suite of AI agents assisting every step from first draft to marketing.
2. **A listener-facing discovery app** ("Listener Hub") — mood-based search, a scheduling
   concierge, curated festivals, cross-media recommendations, biometric audiobooks, and AI audio RPG games.

---

## ⚡ Quick Start — Running the Full Platform

To experience the complete Showrunner platform with all features (Studio, Listener Hub, Pulse & Page, and Audioverse RPG), open **3 separate terminal windows** and run:

| Component | Terminal Command | Local Address |
| :--- | :--- | :--- |
| **1. Showrunner Platform** (Next.js) | `npm run dev` | [http://localhost:3000](http://localhost:3000) |
| **2. Pulse & Page** (FastAPI) | `cd pulse-and-page-main` <br> `uvicorn app:app --reload` | [http://localhost:8000](http://localhost:8000) |
| **3. Audioverse RPG** (Socket Server) | `cd audioverse-main/server` <br> `node index.js` | [http://localhost:3001](http://localhost:3001) |

---

## ✨ Feature Tour

### Pillar 1 — Analyze (score every beat)
Scripts are broken into **beats** (one scene/dialogue chunk each) and scored by a fan-out of
specialist agents, orchestrated by `analyzeEpisode()` ([src/lib/agents/orchestrator.ts](src/lib/agents/orchestrator.ts)):

- **Specialist agents** ([src/lib/agents/specialists.ts](src/lib/agents/specialists.ts)) — Cliffhanger, Pacing, Emotion, and Dialogue scorers (Groq, run in parallel per beat), plus a local (non-LLM) Readability score.
- **Retention prediction** ([src/lib/retention/](src/lib/retention/)) — turns specialist scores into a 0–100 `retentionScore` and a `dropoffRisk` tier per beat, either via a local heuristic or a Databricks ML endpoint (`computeDatabricksRetention`) if `DATABRICKS_RETENTION_MODEL_ENDPOINT` is configured.
- **Cliffhanger Optimizer** — `bingeProbability()` ([src/lib/retention/index.ts](src/lib/retention/index.ts)) blends finish-rate with final-beat hook strength into the "binge probability" stat shown on the heatmap.
- **Retention Heatmap** ([src/components/studio/RetentionHeatmap.tsx](src/components/studio/RetentionHeatmap.tsx)) — visualizes every beat's dropoff risk, with finish-rate/binge-probability headline stats.
- **Plot Hole Hunter** — the Historian agent ([src/lib/agents/historian.ts](src/lib/agents/historian.ts)) finds cross-episode contradictions using beat-embedding similarity clustering (`BeatEmbedding` table) so it stays O(clusters) instead of O(corpus) as a series grows; runs automatically alongside every Analyze pass.
- **Audience Simulator** ([src/lib/simulator/](src/lib/simulator/), [AudienceSimulator.tsx](src/components/studio/AudienceSimulator.tsx)) — Monte Carlo simulation of 1,000 synthetic listeners through the episode's beat scores, showing completion/binge rates and per-beat/per-persona dropoff.
- **Audience Mirror** ([src/lib/agents/audience-mirror.ts](src/lib/agents/audience-mirror.ts), [AudienceMirror.tsx](src/components/studio/AudienceMirror.tsx)) — 4 named listener personas react beat-by-beat with quotes and a comparative retention chart.

### Pillar 2 — Ground (Story Bible & consistency)
- **Story Bible** — `Character`, `WorldRule`, `TimelineEvent`, `Relationship` models, populated by the **Bible-Builder agent** ([src/lib/agents/bible-builder.ts](src/lib/agents/bible-builder.ts)) reading each new episode's script.
- **Consistency Agent** ([src/lib/agents/consistency.ts](src/lib/agents/consistency.ts)) — checks new beats against the Story Bible (batched to one call per episode to respect Gemini's daily quota) and flags contradictions.
- **Continuity Radar** ([src/lib/agents/continuity-radar.ts](src/lib/agents/continuity-radar.ts)) — the live-typing counterpart to Consistency: flags issues as the writer composes a beat, surfaced inline in [BeatComposer.tsx](src/components/studio/BeatComposer.tsx).

### Pillar 3 — Optimize & Direct (rewrite tools)
- **AI Rewrite Engine** — the Editor agent ([src/lib/agents/editor.ts](src/lib/agents/editor.ts)) rewrites a beat based on its own analysis findings via `POST /api/episodes/[id]/rewrite`, then re-runs the whole-episode analysis since retention scores cascade.
- **Director's Control Room** ([src/lib/agents/director.ts](src/lib/agents/director.ts), [DirectorControlRoom.tsx](src/components/studio/DirectorControlRoom.tsx)) — four tone sliders (Suspense/Warmth/Intensity/Pace) drive a live rewrite preview.
- **Genre Transform** ([src/lib/agents/genre-transformer.ts](src/lib/agents/genre-transformer.ts), [GenreTransform.tsx](src/components/studio/GenreTransform.tsx)) — auditions a beat as horror/romance/comedy/thriller/anime, stored alongside (not overwriting) the original as a `GenreVariant`.
- **AI Writers Room** ([src/lib/agents/writers-room.ts](src/lib/agents/writers-room.ts), [WritersRoom.tsx](src/components/studio/WritersRoom.tsx)) — six persona reactions (director, editor, critic, psychologist, historian, audience) to a beat.
- **Hook Copilot** ([src/lib/agents/hook-copilot.ts](src/lib/agents/hook-copilot.ts)) — ghost-text (Tab-to-accept) hook-strength suggestions as you type, in `BeatComposer.tsx`.
- **Sound World** ([src/lib/agents/sound-world.ts](src/lib/agents/sound-world.ts), [SoundWorld.tsx](src/components/studio/SoundWorld.tsx)) — auto-tags each beat with an ambience label (rain, tense-drone, heartbeat, battle-clash, ...) and synthesizes/plays it live via the Web Audio API — no external audio assets.
- **Audio Mood Prototyper** ([ScorePad.tsx](src/components/studio/ScorePad.tsx)) — a keyboard/MIDI-driven chime/bowl/hang-drum synth for sketching a scene's sound mood live (`useChimes` hook, [src/lib/audio/chimesAudioEngine.ts](src/lib/audio/chimesAudioEngine.ts)).

### Pillar 4 — Generate (production pipeline)
- **One-Click Pilot Factory** ([PilotFactory.tsx](src/components/PilotFactory.tsx)) — paste source text, one click runs adapt → build-bible → analyze → render-audio end to end.
- **Adapter Agent** ([src/lib/agents/adapter.ts](src/lib/agents/adapter.ts)) — converts arbitrary source material (novel excerpt, article, story idea) into a cliffhanger-structured, beat-chunked episodic script.
- **Content Safety Guardrails** ([src/lib/safety/moderation.ts](src/lib/safety/moderation.ts)) — every `POST /api/series/adapt` call is screened before generation.
- **Voice Casting Studio** ([VoiceCastingBoard.tsx](src/components/VoiceCastingBoard.tsx), `/series/[id]/casting`) — assigns Groq or ElevenLabs voices to Story Bible characters.
- **TTS Director** ([src/lib/agents/tts-director.ts](src/lib/agents/tts-director.ts)) — casts and renders a full episode's audio (WAV concatenation for Groq Orpheus via [src/lib/audio/wav.ts](src/lib/audio/wav.ts), direct MP3 concatenation for ElevenLabs).

### Pillar 5 — Extended Listener Experiences (`/pulse-and-page` & `/audioverse`)
- **Pulse & Page (`/pulse-and-page`)** — Biometric audiobook listening engine. Maps wearable signals (HR, HRV, SpO2, sleep) into 5 emotional states with adaptive ElevenLabs/Groq TTS tone modulation and curated emotion book folders.
- **Audioverse RPG (`/audioverse`)** — Interactive voice-driven Hinglish audio RPG game powered by a live AI Dungeon Master. Features room creation, real-time action scoring (+10 EPIC, +5 SOLID), dynamic game state tracking (Location, Inventory, NPCs), push-to-talk mic input, and audio streaming.

---

## 🏗️ Architecture

### Multi-LLM Provider Strategy
Chat/JSON completions are split across **Groq** and **Gemini**, with **OpenAI** reserved for embeddings and image generation:

| Provider | Model | Role | Known constraint |
|---|---|---|---|
| Groq | `openai/gpt-oss-120b` | Hot path — specialist agents, most one-shot agents | Free tier: **10 RPM** |
| Gemini | `gemini-flash-latest` | Long-context reasoning (Consistency, Adaptation) & fallback | Free tier: **20 requests/day** |
| OpenAI | `text-embedding-3-small`, `gpt-image-1` | Embeddings for vector search, cover art | No daily cap |

---

## 🗺️ Page Routes Summary

| Route | Purpose | Backend Requirements |
|---|---|---|
| `/` | Landing page — Three.js hero, feature overview | Built-in |
| `/dashboard` | Studio entry point — series list + One-Click Pilot Factory | Built-in |
| `/series/[seriesId]` | Series detail — episodes, Story Bible summary | Built-in |
| `/series/[seriesId]/casting` | Voice Casting Studio | Built-in |
| `/series/[seriesId]/episodes/[episodeId]` | Episode production Studio (main workspace) | Built-in |
| `/listen` | Listener Hub — mood search, concierge, festivals | Built-in |
| `/pulse-and-page` | Biometric audiobooks engine | `cd pulse-and-page-main && uvicorn app:app --reload` (Port 8000) |
| `/audioverse` | AI Dungeon Master Audio RPG Game | `cd audioverse-main/server && node index.js` (Port 3001) |

---

## 🛠️ Installation & Setup

### 1. Install Dependencies
```bash
git clone https://github.com/rohanjain1648/pocket.git
cd pocket
npm install
```

### 2. Configure Environment (.env)
Create `.env` in the root folder:
```env
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
DATABASE_URL="file:./dev.db"
```

### 3. Database Setup & Seed
```bash
npm run db:reset
```

### 4. Run Applications

**Terminal 1 — Main Showrunner Next.js App:**
```bash
npm run dev
```

**Terminal 2 — Pulse & Page Backend:**
```bash
cd pulse-and-page-main
pip install -r requirements.txt
uvicorn app:app --reload
```

**Terminal 3 — Audioverse Socket Server:**
```bash
cd audioverse-main/server
npm install
node index.js
```

---

## 🧪 Verification
Verify code health with:
```bash
npx tsc --noEmit
```
