import { GoogleGenerativeAI } from "@google/generative-ai";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not set");
  }
  if (!client) {
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return client;
}

// Long-context reasoning: orchestrator, consistency checks against the
// Story Bible, novel/article adaptation — anywhere the whole series
// context needs to fit in one call. "-latest" aliases auto-follow Google's
// current GA release so this doesn't go stale as dated model IDs get
// deprecated (e.g. gemini-2.0-flash was shut down June 2026).
export const ORCHESTRATOR_MODEL = "gemini-flash-latest";
export const EMBEDDING_MODEL = "gemini-embedding-001";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mirrors the retry in llm/groq.ts. A 429 here is usually the free tier's
// 20 requests/day/model cap (not recoverable by retrying) rather than a
// per-minute limit, but transient network/5xx errors do benefit — and this
// costs nothing when there's genuinely nothing to retry into.
function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : "";
  return status === 429 || (typeof status === "number" && status >= 500) || /\[(429|5\d\d)\s/.test(message);
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isTransient(err) || attempt >= maxRetries) throw err;
      await sleep(600 * (attempt + 1));
    }
  }
}

export async function geminiJSON<T>(system: string, user: string): Promise<T> {
  return withRetry(async () => {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: ORCHESTRATOR_MODEL,
      systemInstruction: system,
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
    });
    const result = await model.generateContent(user);
    const raw = result.response.text();
    if (!raw) throw new Error("Gemini returned empty response");
    return JSON.parse(raw) as T;
  });
}

export async function geminiText(system: string, user: string): Promise<string> {
  return withRetry(async () => {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: ORCHESTRATOR_MODEL,
      systemInstruction: system,
      generationConfig: { temperature: 0.6 },
    });
    const result = await model.generateContent(user);
    return result.response.text();
  });
}

export async function geminiEmbed(text: string): Promise<number[]> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}
