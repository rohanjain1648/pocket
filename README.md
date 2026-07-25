# 🎬 Showrunner

**An AI Production Copilot & Discovery Platform for Serialized Audio**
_Built for the PocketFM × Databricks Hackathon_

Showrunner is two connected products in one Next.js app:

1. **A production copilot** for writers/producers — paste a story idea in, get a beat-by-beat
   analyzed, consistency-checked, voice-cast, fully-rendered audio drama episode out, with a
   suite of AI agents assisting every step from first draft to marketing.
2. **A listener-facing discovery app** ("Listener Hub") — mood-based search, a scheduling
   concierge, curated festivals, cross-media recommendations, and "why you'll love this"
   explanations, all backed by real listening-session data rather than seeded placeholders.

Everything below reflects the actual code in this repo, not aspirational pitch copy — where a
feature is a mock or needs external infrastructure not included here, that's called out
explicitly in [Experimental / standalone features](#-experimental--standalone-features).

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
- **Content Safety Guardrails** ([src/lib/safety/moderation.ts](src/lib/safety/moderation.ts)) — every `POST /api/series/adapt` call is screened before generation: a deterministic keyword gate (primary, always-on) blocks self-harm/suicide, sexually explicit, and dangerous-content themes on sight regardless of narrative framing, backed by an LLM classifier pass for phrasings the keyword list misses. Unlike the rest of the app (which fails *open* — see below), this gate fails *closed*: if both LLM providers are unreachable, content is refused rather than waved through. Blocked requests surface as a dedicated shield-icon refusal card in `PilotFactory.tsx`, not a generic error.
- **Voice Casting Studio** ([VoiceCastingBoard.tsx](src/components/VoiceCastingBoard.tsx), `/series/[id]/casting`) — assigns Groq or ElevenLabs voices to Story Bible characters (`Character.preferredVoice`, encoded via [src/lib/voice-pref.ts](src/lib/voice-pref.ts)).
- **Voice-Director** ([src/lib/agents/voice-director.ts](src/lib/agents/voice-director.ts)) — suggests delivery styling per beat/speaker and renders short preview clips.
- **TTS Director** ([src/lib/agents/tts-director.ts](src/lib/agents/tts-director.ts)) — casts and renders a full episode's audio, merging per-beat clips (WAV concatenation for Groq Orpheus via [src/lib/audio/wav.ts](src/lib/audio/wav.ts), direct MP3 concatenation for ElevenLabs).
- **AI Producer** ([src/lib/agents/marketing-director.ts](src/lib/agents/marketing-director.ts), [MarketingDesk.tsx](src/components/studio/MarketingDesk.tsx)) — social hooks, hashtags, best-clip pick (objectively computed from cliffhanger scores), thumbnail mood, target audience.

### Pillar 5 — Discover (Listener Hub, `/listen`)
- **Mood-First Search** ([src/lib/agents/mood-profiler.ts](src/lib/agents/mood-profiler.ts)) — free-text mood query ("rainy Sunday after heartbreak") matched against OpenAI-embedded episode mood profiles by cosine similarity.
- **AI Entertainment Concierge** ([src/lib/agents/concierge.ts](src/lib/agents/concierge.ts)) — given a mood + hours available, schedules a time-slotted weekend listening plan from real, rendered episodes.
- **AI Curated Festivals** ([src/lib/agents/festival-curator.ts](src/lib/agents/festival-curator.ts)) — generates a themed multi-episode lineup with an emotional arc, persisted as a `Festival` + `FestivalSlot`s, optional AI cover art via `gpt-image-1`.
- **Cross-Media Discovery** ([src/lib/agents/cross-media.ts](src/lib/agents/cross-media.ts)) — LLM-proposed related books/films/music/podcasts, verified/enriched against the real Open Library API (`verified: true` badge) rather than left as unchecked LLM output.
- **"Explain Why I'll Love This"** ([src/lib/agents/taste-explainer.ts](src/lib/agents/taste-explainer.ts)) — a personalized recommendation rationale generated from the listener's actual recent `ListeningSession` history, logged to `RecommendationLog`.
- All of the above run against **real playback data** — `ListeningSession`/`Listener` are genuinely recorded from the [ListenerAudioPlayer.tsx](src/components/listen/ListenerAudioPlayer.tsx) (progress reported every 5s), not seeded fixtures — though listener identity is hardcoded to one demo user for the hackathon.

---

## 🏗️ Architecture

### Multi-LLM provider strategy — "never let the demo see a failure"
Chat/JSON completions are split across **Groq** and **Gemini**, with **OpenAI** reserved for
embeddings and image generation only (never chat):

| Provider | Model | Role | Known constraint |
|---|---|---|---|
| Groq | `openai/gpt-oss-120b` | Hot path — specialist agents, most one-shot agents | Free tier caps at **10 requests/minute** |
| Gemini | `gemini-flash-latest` | Long-context reasoning (Consistency, Adaptation) & fallback | Free tier caps at **20 requests/day/model** |
| OpenAI | `text-embedding-3-small`, `gpt-image-1` | Embeddings for vector search, cover art | No daily cap; not used for chat |

Every client wrapper ([src/lib/llm/groq.ts](src/lib/llm/groq.ts), [gemini.ts](src/lib/llm/gemini.ts), [openai.ts](src/lib/llm/openai.ts)) retries transient 429/5xx errors with backoff. On top of that, [src/lib/llm/resilient.ts](src/lib/llm/resilient.ts) provides:

- **`resilientJSON`** — tries Groq, falls through to Gemini (or vice versa via a `preferred` flag) before throwing.
- **`resilientJSONOrDefault`** — same, but returns a caller-supplied, plausible fallback (a heuristic mood summary, an objectively-computed marketing clip pick, a deterministic "Editor's Picks" festival from the real catalog, ...) instead of ever throwing — so a rate-limited provider degrades a feature's *quality*, not its *availability*, mid-demo.

Two agents (`bible-builder.ts`, `adapter.ts`) deliberately still throw on total failure — there's no sane non-LLM fallback for whole-series generation or bible-fact extraction, and inventing placeholder story content would be worse than a clean error.

The one deliberate exception to "fail open" is the **safety gate** ([src/lib/safety/moderation.ts](src/lib/safety/moderation.ts)): it fails *closed* if both providers are unreachable, refusing rather than silently letting content through.

### Dual-mode: local heuristic vs. Databricks
Three subsystems transparently switch to a Databricks-hosted model/index when its env vars are
present, and fall back to a local implementation otherwise — the app runs fully standalone with
zero Databricks configuration:

| Subsystem | Local implementation | Databricks implementation | Switch |
|---|---|---|---|
| Retention scoring | [retention/local.ts](src/lib/retention/local.ts) | [retention/databricks.ts](src/lib/retention/databricks.ts) | `DATABRICKS_RETENTION_MODEL_ENDPOINT` |
| Audience simulation | [simulator/local.ts](src/lib/simulator/local.ts) | [simulator/databricks.ts](src/lib/simulator/databricks.ts) | `DATABRICKS_AUDIENCE_SIM_ENDPOINT` |
| Story Bible retrieval | [vector/local-search.ts](src/lib/vector/local-search.ts) | [vector/databricks.ts](src/lib/vector/databricks.ts) | `DATABRICKS_VECTOR_SEARCH_ENDPOINT` |

### Dual TTS backends with automatic fallback
Selectable per render (Studio dropdown, or `{ provider: "groq" | "elevenlabs" | "auto" }` on `POST /api/episodes/[id]/render-audio`):

- **Groq Orpheus** (`canopylabs/orpheus-v1-english`) — only accepts `response_format: "wav"`; per-beat WAV clips are merged with `concatWav` ([src/lib/audio/wav.ts](src/lib/audio/wav.ts)) rather than `Buffer.concat`, which would embed extra RIFF headers and corrupt playback past the first beat. Free tier caps at 10 RPM.
- **ElevenLabs** ([src/lib/llm/elevenlabs.ts](src/lib/llm/elevenlabs.ts)) — works with a paid key; a `text_to_speech`-only scoped key (no `voices_read`) is handled by falling back to a curated, verified voice pool. Beats render through bounded-concurrency + 429-retry/backoff (`renderBeatsWithElevenLabs`), never `Promise.all`, since plans cap concurrent requests. MP3 clips concatenate directly (no muxer needed).
- `Character.preferredVoice` encodes the provider inline (`"troy"` = Groq, `"elevenlabs:21m00Tcm4TlvDq8ikWAM"` = ElevenLabs — see [src/lib/voice-pref.ts](src/lib/voice-pref.ts)); a preference only applies on a render using its matching provider and is silently skipped (auto-cast instead) otherwise.

### Semantic retrieval (embeddings)
Three embedding tables back three different features, all using OpenAI `text-embedding-3-small`
(1536 dims, stored as JSON since SQLite has no native vector column):

- `BibleEmbedding` — Story Bible entries, for Consistency-agent retrieval.
- `BeatEmbedding` — beats, for the Historian's Plot Hole Hunter clustering.
- `EpisodeMoodProfile` — episode "feel" summaries, for Mood-First Search.

---

## 🚀 Tech Stack

- **Framework:** [Next.js 15.5.21](https://nextjs.org/) (App Router), React 19.1.0, TypeScript
- **Styling:** Tailwind CSS v4, [Framer Motion](https://www.framer.com/motion/) for animation, [Lenis](https://github.com/darkroomengineering/lenis) for smooth scroll
- **3D:** Three.js via `@react-three/fiber` + `@react-three/drei` (landing-page hero)
- **Database / ORM:** SQLite (dev) via [Prisma 6](https://www.prisma.io/) — config in `prisma.config.ts`, not the deprecated `package.json#prisma` field
- **LLM providers:** [Groq SDK](https://groq.com/) (`openai/gpt-oss-120b`, Orpheus TTS), [Google Generative AI](https://ai.google.dev/) (`gemini-flash-latest`), OpenAI (`text-embedding-3-small`, `gpt-image-1`) via raw `fetch`
- **TTS:** Groq Orpheus (primary) + ElevenLabs (secondary/fallback, paid-tier)
- **Realtime:** `socket.io-client` (Audioverse game client — pairs with the standalone Express/Socket.IO/OpenAI server at `audioverse-main/server`, present on disk but untracked in this repo's git)
- **Validation:** Zod

---

## 📂 Project Structure

```text
├── prisma/
│   ├── schema.prisma        # 20 models: Series/Episode/Beat pipeline, Story Bible,
│   │                        # audio renders, embeddings, Listener Hub, Festivals
│   └── seed.ts               # Dummy data generation script
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── beats/[id]/          # direct, genre, writers-room rewrites + PATCH
│   │   │   ├── copilot/             # continuity, hooks, voice + voice/render
│   │   │   ├── episodes/[id]/       # analyze, build-bible, rewrite, audience-mirror,
│   │   │   │                        # soundscape, marketing, audience-sim, cross-media, render-audio
│   │   │   ├── series/              # adapt (+ safety gate), [id]/casting
│   │   │   ├── listen/              # mood-search, sessions, why, concierge, festivals
│   │   │   └── audioverse/game/     # standalone Hinglish text-adventure endpoint
│   │   ├── dashboard/                # Studio entry point (series list + Pilot Factory)
│   │   ├── series/[seriesId]/        # series detail, casting, episode Studio
│   │   ├── listen/                   # Listener Hub
│   │   ├── voice-room/               # demo-only mock UI (see Experimental section)
│   │   ├── pulse-and-page/           # iframe to an external Python biometric app
│   │   ├── audioverse/               # multiplayer AI RPG client (server: audioverse-main/, untracked)
│   │   └── privacy/ terms/ contact/  # static pages
│   ├── components/
│   │   ├── studio/                   # Studio workspace panels (heatmap, composer, director, ...)
│   │   ├── listen/                   # Listener Hub UI (episode cards, player)
│   │   ├── audio-prototype/          # Score Pad chime instrument UI
│   │   └── ui/                       # Design-system primitives (GlassCard, Reveal, ...)
│   └── lib/
│       ├── agents/                   # 22 agent modules — see Feature Tour above
│       ├── llm/                      # groq.ts, gemini.ts, openai.ts, resilient.ts, elevenlabs.ts
│       ├── safety/                   # moderation.ts — content safety gate
│       ├── retention/  simulator/  vector/   # each: local + Databricks + shared index
│       └── audio/                     # wav.ts (RIFF concat fix), chimesAudioEngine.ts
```

---

## 🗺️ Pages

| Route | Purpose |
|---|---|
| `/` | Landing page — Three.js hero, feature grid, links to every surface below |
| `/dashboard` | Studio entry point — series list + One-Click Pilot Factory |
| `/series/[seriesId]` | Series detail — episodes, Story Bible summary |
| `/series/[seriesId]/casting` | Voice Casting Studio |
| `/series/[seriesId]/episodes/[episodeId]` | Episode production Studio (the main workspace) |
| `/listen` | Listener Hub — mood search, concierge, festivals, catalog |
| `/voice-room` | **Demo-only mock** — simulated voice room + fabricated dashboard stats, not wired to real APIs |
| `/pulse-and-page` | Iframe wrapper for a separate biometric-audiobooks Python backend (`localhost:8000`) |
| `/audioverse` | Multiplayer AI audio-RPG lobby/game client (needs an external Socket.IO server on `localhost:3001`) |
| `/privacy` `/terms` `/contact` | Static pages (`/contact`'s form is `preventDefault`-only, not wired to a backend) |

---

## 🛠️ Getting Started

### Prerequisites
- Node.js v18+
- A Groq API key at minimum (specialist agents + Orpheus TTS); Gemini and OpenAI keys unlock the rest

### 1. Install
```bash
git clone <repository-url>
cd "pocket fm hackathon"
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

| Variable | Required for | Notes |
|---|---|---|
| `GROQ_API_KEY` | Specialist agents, most one-shot agents, Orpheus TTS | Free tier: 10 RPM |
| `GEMINI_API_KEY` | Consistency/Adaptation long-context calls, Groq fallback | Free tier: 20 requests/day/model |
| `OPENAI_API_KEY` | Embeddings (Mood Search, Plot Hole Hunter, Bible retrieval), cover art | No daily cap |
| `DATABASE_URL` | Required | Defaults to local SQLite (`file:./dev.db`) |
| `ELEVENLABS_API_KEY` | Optional secondary TTS | Needs a paid plan for library voices |
| `ELEVENLABS_CONCURRENCY` | Optional | Keep at least 1 below your plan's concurrent-request cap |
| `DATABRICKS_*` | Optional sponsor-bonus integration | App runs fully local without these |

### 3. Database setup & seeding
```bash
npm run db:reset      # prisma db push --force-reset && seed
# or separately:
npm run db:push
npm run db:seed
```

### 4. Run
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). Start at `/dashboard` (production side) or `/listen` (consumer side).

> **Windows/PowerShell users:** never run two `next dev` processes against the same `.next` directory — it causes ChunkLoadErrors. Check first: `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {$_.CommandLine -match "next"}`

### 5. Verify
There's no automated test suite; verify changes with:
```bash
npx tsc --noEmit
```
Note: `/contact` currently fails the production prerender (a client form handler in a Server Component) — a known, pre-existing issue unrelated to most feature work.

---

## 🗄️ Database Management
```bash
npm run db:studio     # Prisma Studio — inspect the local SQLite database
```

---

## 🧪 Experimental / standalone features
These exist in the repo but need infrastructure or context beyond `npm run dev`:

- **`/voice-room`** — entirely client-side mock data (simulated transcript, fabricated dashboard stats); not wired to any real endpoint. Useful as a demo visual, not a working feature.
- **`/pulse-and-page`** — expects a separate Python backend on `localhost:8000`; shows setup instructions if it's not running.
- **`/audioverse`** — a multiplayer AI RPG client expecting a Socket.IO server on `localhost:3001` for room/session state. That server exists in this working directory at **`audioverse-main/`** (a separate Express + Socket.IO + OpenAI backend, `audioverse-main/server`, paired with its own standalone Vite/React client in `audioverse-main/client`) — but it is **not tracked in this repo's git** (confirmed via `git status --porcelain -uall`; it has no commit history here) and is not started by `npm run dev`. Run it separately (`cd audioverse-main/server && npm install && npm start`) if you need real multiplayer state. The in-app `/api/audioverse/game` route is also the one place in the codebase that calls LLM/TTS providers directly via raw `fetch` rather than through `lib/agents`/`lib/llm`.

## 🤝 Contributing
```bash
npx tsc --noEmit   # type-check before submitting a PR
npm run lint       # currently requires an ESLint flat config to run standalone; not set up in this repo
```
