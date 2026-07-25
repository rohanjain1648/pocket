/**
 * OpenAI provider — deliberately NOT used for chat hot paths. Groq
 * (openai/gpt-oss-120b) is faster and already carries the specialist agents.
 * OpenAI earns its place here for two things Groq/Gemini can't do well:
 *
 *  1. Embeddings. Gemini's free tier caps at 20 requests/day/model, which
 *     makes vector search unusable in practice — one Story Bible re-index
 *     exhausts the day's quota. text-embedding-3-small has no daily cap and
 *     costs ~$0.02/1M tokens, so semantic retrieval (Plot Hole Hunter at
 *     scale, Mood-First Search) becomes viable.
 *  2. Image generation for cover art in the Listener Hub.
 *
 * Uses fetch directly rather than the `openai` package — only three
 * endpoints are needed and this avoids another dependency in the tree.
 */

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMS = 1536;
export const IMAGE_MODEL = "gpt-image-1";

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  return key;
}

export function hasOpenAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Same reasoning as the retry in llm/groq.ts and llm/gemini.ts — a transient
// 429/5xx shouldn't take down embeddings (Plot Hole Hunter, Mood-First
// Search) or cover art generation during a demo.
async function openaiFetch<T>(path: string, body: unknown, maxRetries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.openai.com/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.ok) return (await res.json()) as T;

    const detail = await res.text().catch(() => "");
    const transient = res.status === 429 || res.status >= 500;
    if (!transient || attempt >= maxRetries) {
      throw new Error(`OpenAI ${path} failed: ${res.status} ${detail}`.trim());
    }
    await sleep(500 * (attempt + 1));
  }
}

interface EmbeddingResponse {
  data: { embedding: number[]; index: number }[];
}

/**
 * Embeds many strings in ONE request. The embeddings endpoint accepts an
 * array input, so batching keeps a full Story Bible re-index to a single
 * round trip instead of N.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const json = await openaiFetch<EmbeddingResponse>("embeddings", {
    model: EMBEDDING_MODEL,
    input: texts,
  });
  // The API does not guarantee ordering, so reorder by the returned index.
  const ordered = new Array<number[]>(texts.length);
  for (const row of json.data) ordered[row.index] = row.embedding;
  return ordered;
}

export async function embed(text: string): Promise<number[]> {
  const [vec] = await embedBatch([text]);
  return vec;
}

/** Cosine similarity. Shared by every semantic-retrieval path in the app. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

interface ImageResponse {
  data: { b64_json?: string; url?: string }[];
}

/**
 * Generates cover art and returns a data URI. Kept at the smallest square
 * size — these render as ~200px cards, so anything larger is wasted spend
 * and latency.
 */
export async function generateCoverArt(prompt: string): Promise<string> {
  const json = await openaiFetch<ImageResponse>("images/generations", {
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "low",
  });
  const first = json.data[0];
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  if (first?.url) return first.url;
  throw new Error("OpenAI image generation returned no image");
}
