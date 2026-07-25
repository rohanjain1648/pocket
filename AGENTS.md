# Agent notes — Showrunner

## Stack facts that matter
- **Next.js 15.5.21** (App Router), React 19.1.0, Tailwind CSS v4, TypeScript.
  A Next 16 scaffold was merged into `main` from a parallel branch; this repo
  deliberately stays on 15.x because the whole app is built and tested against
  it. Do not assume Next 16 APIs.
- **Prisma + SQLite** (`dev.db`). Config lives in `prisma.config.ts`, not the
  deprecated `package.json#prisma` field.
- **Chat LLM providers are Groq and Gemini.** Not Anthropic.
  - Groq `openai/gpt-oss-120b` — specialist agents (low latency, fans out in
    parallel). Earlier `llama-3.3-70b-versatile` was deprecated 2026-06-17.
  - Gemini `gemini-flash-latest` + `gemini-embedding-001` — used sparingly;
    the free tier caps at 20 requests/day/model, so Gemini is a fallback, not
    a hot path.
  - OpenAI (`text-embedding-3-small`, `gpt-image-1`) — embeddings for vector
    search (no daily cap, unlike Gemini's) and cover art. Not used for chat.
- **TTS has two real backends, selectable per render (Studio dropdown, or
  `{ provider: "groq" | "elevenlabs" | "auto" }` on `POST
  /api/episodes/[id]/render-audio`), with automatic fallback on failure:**
  - **Groq Orpheus** (`canopylabs/orpheus-v1-english`), same key as the
    specialist agents. Only accepts `response_format: "wav"` — `"mp3"` gets a
    400. Per-beat clips are standalone WAV files merged with `concatWav`
    (`src/lib/audio/wav.ts`); a plain `Buffer.concat` embeds extra RIFF
    headers and corrupts playback past the first beat. Free tier is capped at
    10 RPM — bursts of renders can 429.
  - **ElevenLabs** — works with a paid key, confirmed live. A key restricted
    to the `text_to_speech` scope (no `voices_read`) is common and handled:
    `fetchElevenLabsVoices()` falls back to a curated, verified pool. Plans
    also cap CONCURRENT requests (confirmed: 3 on this account) — beats are
    rendered through `renderBeatsWithElevenLabs` (bounded concurrency +
    429 retry/backoff, `src/lib/llm/elevenlabs.ts`), never `Promise.all`.
    MP3 clips concatenate directly (no muxer needed, unlike Orpheus WAV).
  - `Character.preferredVoice` encodes the provider inline (`"troy"` = Groq,
    `"elevenlabs:21m00Tcm4TlvDq8ikWAM"` = ElevenLabs, see
    `src/lib/voice-pref.ts`); a preference only applies on a render using its
    matching provider, and is silently skipped (auto-cast instead) otherwise
    — never a hard error.

## Working in this repo
- Shell is **PowerShell**. The Bash tool is unreliable here (corrupted
  `.bashrc`).
- Never run two Next processes against the same `.next` directory — it causes
  ChunkLoadErrors and empty chunk dirs. Check first:
  `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {$_.CommandLine -match "next"}`
- Verify with `npx tsc --noEmit`. Note `/contact` currently fails the
  production prerender (client form handler in a Server Component) — a known,
  pre-existing issue unrelated to most work.
