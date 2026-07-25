export interface ElevenLabsVoiceInfo {
  id: string;
  name: string;
  gender: string;
  vibe: string;
}

// Well-known ElevenLabs "premade" voices, confirmed working via direct TTS
// calls against this account's key. Used as the voice catalog whenever the
// key can't list its own voices (see fetchElevenLabsVoices) — which is the
// common case for a key scoped to text_to_speech only, since ElevenLabs API
// keys are permission-scoped and voices_read is a separate grant from
// text_to_speech.
const CURATED_VOICES: ElevenLabsVoiceInfo[] = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", gender: "female", vibe: "warm, narrator-default" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", gender: "female", vibe: "strong, confident" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", gender: "female", vibe: "soft, gentle" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", gender: "male", vibe: "well-rounded, warm" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", gender: "female", vibe: "emotional, youthful" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", gender: "male", vibe: "deep, resonant" },
];

export function hasElevenLabs(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

/**
 * Tries the real /v1/voices endpoint first (full account library, real
 * names). Falls back to the curated pool above on ANY failure — missing
 * key, a voices_read-less restricted key (401 missing_permissions, the
 * common case), rate limit, network error — so casting UI and rendering
 * always have a usable, name-labeled voice list.
 */
export async function fetchElevenLabsVoices(): Promise<ElevenLabsVoiceInfo[]> {
  if (!process.env.ELEVENLABS_API_KEY) return CURATED_VOICES;

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[elevenlabs] could not list voices (${res.status}), using curated pool`);
      return CURATED_VOICES;
    }
    const json = (await res.json()) as { voices: { voice_id: string; name: string; labels?: Record<string, string> }[] };
    if (!json.voices || json.voices.length === 0) return CURATED_VOICES;
    return json.voices.map((v) => ({
      id: v.voice_id,
      name: v.name,
      gender: v.labels?.gender ?? "",
      vibe: v.labels?.description ?? v.labels?.accent ?? "",
    }));
  } catch (err) {
    console.warn("[elevenlabs] voice list fetch failed, using curated pool:", err instanceof Error ? err.message : err);
    return CURATED_VOICES;
  }
}

export function curatedVoiceIds(): string[] {
  return CURATED_VOICES.map((v) => v.id);
}

export async function elevenLabsSpeech(text: string, voiceId: string): Promise<Buffer> {
  if (!process.env.ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not set");

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.4, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`ElevenLabs TTS failed: ${res.status} ${body}`.trim()) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return Buffer.from(await res.arrayBuffer());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ElevenLabs plans cap CONCURRENT requests (confirmed live: this account's
 * plan allows 3 in flight — a 429 concurrent_limit_exceeded, not a
 * rate-limit-over-time error, and carries no Retry-After header). A per-beat
 * Promise.all fires every beat at once and blows straight through that, so
 * one retry with backoff is a real-world necessity here, not defensive
 * boilerplate.
 */
async function elevenLabsSpeechWithRetry(text: string, voiceId: string, maxRetries = 3): Promise<Buffer> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await elevenLabsSpeech(text, voiceId);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 429 && attempt < maxRetries) {
        await sleep(700 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Runs ElevenLabs synthesis across all beats with bounded concurrency
 * (default 2, one below the confirmed 3-concurrent cap so a stray in-flight
 * request elsewhere on the same key doesn't still trip the limit) instead
 * of Promise.all-ing every beat at once. Order of the input is preserved in
 * the output regardless of completion order.
 */
export async function renderBeatsWithElevenLabs(
  beats: { text: string; voiceId: string }[]
): Promise<Buffer[]> {
  const concurrency = Math.max(1, Number(process.env.ELEVENLABS_CONCURRENCY) || 2);
  const results = new Array<Buffer>(beats.length);
  let next = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= beats.length) return;
      results[i] = await elevenLabsSpeechWithRetry(beats[i].text, beats[i].voiceId);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, beats.length) }, worker));
  return results;
}
