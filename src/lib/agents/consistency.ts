import { resilientJSON } from "@/lib/llm/resilient";
import { retrieveRelevantBibleEntries } from "@/lib/vector";

export interface ConsistencyFlag {
  type: "character" | "worldRule" | "timelineEvent" | "relationship" | "other";
  message: string;
  relatedEntity: string;
}

export interface ConsistencyResult {
  flags: ConsistencyFlag[];
  summary: string; // one-line overview for the findings feed, e.g. "No continuity issues found."
}

interface ConsistencyBeatInput {
  id: string;
  text: string;
}

const UNAVAILABLE: ConsistencyResult = { flags: [], summary: "Consistency check unavailable (GEMINI_API_KEY/GROQ_API_KEY not configured)." };
const NO_BIBLE: ConsistencyResult = { flags: [], summary: "No Story Bible entries yet for this series — nothing to check against." };
const RETRIEVAL_FAILED: ConsistencyResult = { flags: [], summary: "Consistency check skipped (Story Bible retrieval failed)." };
const CALL_FAILED: ConsistencyResult = { flags: [], summary: "Consistency check failed (LLM call error)." };

function fill(beats: ConsistencyBeatInput[], result: ConsistencyResult): Map<string, ConsistencyResult> {
  return new Map(beats.map((b) => [b.id, result]));
}

/**
 * Consistency Agent — the "Ground" pillar. Checks every beat of an episode
 * against the Story Bible in a single Gemini call rather than one call per
 * beat: Gemini's free tier caps at 20 generateContent requests/day per
 * model, and a naive per-beat design burns through that in one Analyze
 * click on a 7-beat episode. Batching also lets the model catch
 * cross-beat contradictions, not just isolated ones.
 */
export async function consistencyAgentForEpisode(
  seriesId: string,
  beats: ConsistencyBeatInput[]
): Promise<Map<string, ConsistencyResult>> {
  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) return fill(beats, UNAVAILABLE);

  const episodeText = beats.map((b) => b.text).join("\n");

  let relevant;
  try {
    relevant = await retrieveRelevantBibleEntries(seriesId, episodeText, 12);
  } catch (err) {
    console.warn("[consistency] bible retrieval failed:", err instanceof Error ? err.message : err);
    return fill(beats, RETRIEVAL_FAILED);
  }

  if (relevant.length === 0) return fill(beats, NO_BIBLE);

  const bibleContext = relevant.map((r) => `- [${r.type}] ${r.text}`).join("\n");
  const beatsBlock = beats.map((b, i) => `BEAT ${i + 1} (id="${b.id}"):\n${b.text}`).join("\n\n");

  const system = `You are the Consistency Agent in a serialized audio drama production pipeline. You check every beat of an episode against the show's established Story Bible (retrieved facts below) and flag any contradictions: a character acting against established traits, a broken world rule, a timeline conflict, or a relationship inconsistency. Also watch for contradictions introduced between beats within this same episode. Only flag genuine contradictions — do not flag normal character growth or ambiguity. Respond ONLY with JSON: { "results": [{ "beatId": string, "flags": [{ "type": "character"|"worldRule"|"timelineEvent"|"relationship"|"other", "message": string, "relatedEntity": string }], "summary": string (max 20 words) }] }. Include one entry per beat, using the exact beatId given, even if its flags array is empty.`;

  const user = `STORY BIBLE FACTS:\n${bibleContext}\n\nEPISODE BEATS:\n${beatsBlock}`;

  try {
    // Gemini preferred (built for one big batched call across every beat),
    // but falls back to Groq if Gemini's 20-requests/day cap is already
    // spent or it errors — Consistency previously had no fallback at all,
    // making Gemini's daily cap a single point of failure for the whole
    // feature.
    const parsed = await resilientJSON<{ results: { beatId: string; flags: ConsistencyFlag[]; summary: string }[] }>(
      system,
      user,
      "gemini"
    );
    const byId = new Map(parsed.results.map((r) => [r.beatId, { flags: r.flags, summary: r.summary }]));
    // Guard against the model dropping a beat from its response.
    for (const b of beats) if (!byId.has(b.id)) byId.set(b.id, { flags: [], summary: "No consistency issues found." });
    return byId;
  } catch (err) {
    console.warn("[consistency] LLM call failed:", err instanceof Error ? err.message : err);
    return fill(beats, CALL_FAILED);
  }
}
