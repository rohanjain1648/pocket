import { resilientJSON } from "@/lib/llm/resilient";
import { fetchBibleEntries } from "@/lib/bible";
import type { ConsistencyFlag } from "./consistency";

export interface ContinuityRadarResult {
  flags: ConsistencyFlag[];
  ok: boolean; // true when no contradictions — lets the UI show a green "clear" state
  summary: string;
}

/**
 * Continuity Radar — the streaming version of the Consistency agent. Fires on
 * every debounced typing pause, so it must be fast and quota-safe:
 *
 *  - Runs on Groq (fast, per-minute limits recover) with Gemini only as an
 *    emergency fallback if Groq is down, since Gemini's daily cap makes it
 *    unsuitable as the primary path for something firing this often.
 *  - Skips vector search entirely — at hackathon bible scale (tens of
 *    entries) the whole Story Bible fits in one prompt, so there are zero
 *    embedding calls and zero Gemini calls on the hot path.
 *
 * It flags contradictions against the established bible the instant a line
 * lands, rather than waiting for a full episode Analyze.
 */
export async function continuityRadar(seriesId: string, beatText: string): Promise<ContinuityRadarResult> {
  if (!beatText.trim()) return { flags: [], ok: true, summary: "" };

  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
    return { flags: [], ok: true, summary: "Continuity Radar unavailable (no GROQ_API_KEY/GEMINI_API_KEY set)." };
  }

  const entries = await fetchBibleEntries(seriesId);
  if (entries.length === 0) {
    return { flags: [], ok: true, summary: "No Story Bible yet — nothing to check against." };
  }

  const bibleContext = entries.map((e) => `- [${e.type}] ${e.text}`).join("\n");

  const system = `You are Continuity Radar in a serialized audio drama writing tool. You check the line the writer is composing RIGHT NOW against the show's established Story Bible (below) and flag only genuine contradictions: a character acting against established traits, a broken world rule, a timeline conflict, or a relationship inconsistency. Do NOT flag normal character growth, ambiguity, or new details that don't contradict anything. Respond ONLY with JSON: { "flags": [{ "type": "character"|"worldRule"|"timelineEvent"|"relationship"|"other", "message": string (max 18 words), "relatedEntity": string }] }. Return an empty array if the line is consistent.`;

  const user = `STORY BIBLE:\n${bibleContext}\n\nLINE BEING WRITTEN:\n${beatText}`;

  try {
    const result = await resilientJSON<{ flags: ConsistencyFlag[] }>(system, user);
    const flags = result.flags ?? [];
    return {
      flags,
      ok: flags.length === 0,
      summary: flags.length === 0 ? "No continuity issues." : `${flags.length} continuity issue${flags.length === 1 ? "" : "s"} detected.`,
    };
  } catch (err) {
    console.warn("[continuity-radar] Groq call failed:", err instanceof Error ? err.message : err);
    return { flags: [], ok: true, summary: "Continuity Radar check failed." };
  }
}
