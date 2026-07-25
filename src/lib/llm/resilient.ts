import { groqJSON } from "./groq";
import { geminiJSON } from "./gemini";

/**
 * Shared "don't fail the demo" wrapper for the many one-shot JSON agents
 * that previously called groqJSON directly with no fallback at all (Hook
 * Copilot, Mood Profiler, Marketing Director, Voice-Director, Cross-Media,
 * Concierge, Taste Explainer, Festival Curator). groqJSON/geminiJSON already
 * retry transient 429/5xx internally (see llm/groq.ts, llm/gemini.ts) — this
 * adds the next layer: if Groq is unconfigured/rate-limited/erroring, try
 * Gemini with the same prompt before giving up.
 *
 * `preferred` picks which provider goes first — Groq by default (fast, no
 * daily cap), but Consistency intentionally prefers Gemini (its prompt is
 * built for one big batched call) and falls back to Groq if Gemini's 20
 * requests/day cap is already spent.
 */
export async function resilientJSON<T>(
  system: string,
  user: string,
  preferred: "groq" | "gemini" = "groq"
): Promise<T> {
  const providers =
    preferred === "groq"
      ? ([
          ["groq", () => groqJSON<T>(system, user)],
          ["gemini", () => geminiJSON<T>(system, user)],
        ] as const)
      : ([
          ["gemini", () => geminiJSON<T>(system, user)],
          ["groq", () => groqJSON<T>(system, user)],
        ] as const);

  let lastErr: unknown;
  for (const [name, call] of providers) {
    const configured = name === "groq" ? Boolean(process.env.GROQ_API_KEY) : Boolean(process.env.GEMINI_API_KEY);
    if (!configured) continue;
    try {
      return await call();
    } catch (err) {
      lastErr = err;
      console.warn(`[resilient] ${name} call failed, trying next provider:`, err instanceof Error ? err.message : err);
    }
  }
  throw lastErr ?? new Error("No LLM provider configured (set GROQ_API_KEY or GEMINI_API_KEY).");
}

/**
 * Same as resilientJSON, but never throws — returns `fallback` if every
 * configured provider fails. Use this at call sites where a degraded-but-
 * valid result (empty suggestions, a generic blurb, an unranked list) is
 * strictly better than surfacing an error mid-demo.
 */
export async function resilientJSONOrDefault<T>(
  system: string,
  user: string,
  fallback: T,
  preferred: "groq" | "gemini" = "groq"
): Promise<T> {
  try {
    return await resilientJSON<T>(system, user, preferred);
  } catch (err) {
    console.warn("[resilient] all providers failed, using fallback:", err instanceof Error ? err.message : err);
    return fallback;
  }
}
