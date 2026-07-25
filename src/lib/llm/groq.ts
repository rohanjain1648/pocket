import Groq from "groq-sdk";

let client: Groq | null = null;

export function getGroq(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set");
  }
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

// llama-3.3-70b-versatile was deprecated by Groq on 2026-06-17;
// openai/gpt-oss-120b is their recommended replacement in that weight class.
export const SPECIALIST_MODEL = "openai/gpt-oss-120b";

// Orpheus TTS (Canopy Labs, hosted on GroqCloud) — real multi-voice audio on
// the same key already used for the specialist agents, no separate account.
export const TTS_MODEL = "canopylabs/orpheus-v1-english";
export const TTS_VOICES = ["hannah", "autumn", "diana", "austin", "daniel", "troy"] as const;
export type OrpheusVoice = (typeof TTS_VOICES)[number];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Groq's free tier is confirmed (live, during testing) to cap specialist-agent
// traffic at 10 RPM — a burst of renders/analyses easily trips a transient
// 429 that has nothing to do with the request itself. A short retry here
// means every one of the ~20 call sites downstream gets automatic recovery
// from that specific, already-observed failure mode for free.
function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 429 || (typeof status === "number" && status >= 500);
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isTransient(err) || attempt >= maxRetries) throw err;
      await sleep(500 * (attempt + 1));
    }
  }
}

/**
 * Fast, cheap JSON-mode completion — used by the specialist agents
 * (Cliffhanger, Pacing, Dialogue) that each score one narrow dimension
 * of a beat and need low latency since they run fanned-out in parallel.
 */
export async function groqJSON<T>(system: string, user: string): Promise<T> {
  return withRetry(async () => {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: SPECIALIST_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("Groq returned empty response");
    return JSON.parse(raw) as T;
  });
}

export async function groqSpeech(text: string, voice: OrpheusVoice): Promise<Buffer> {
  return withRetry(async () => {
    const groq = getGroq();
    const speech = await groq.audio.speech.create({
      model: TTS_MODEL,
      voice,
      input: text,
      // Orpheus only accepts "wav" — "mp3" is rejected with a 400.
      response_format: "wav",
    });
    return Buffer.from(await speech.arrayBuffer());
  });
}
