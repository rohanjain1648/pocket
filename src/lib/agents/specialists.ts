import { groqJSON } from "@/lib/llm/groq";

export interface AgentScore {
  score: number; // 0-100
  summary: string; // one-sentence diagnosis, shown in the UI as this agent's finding
  source: "llm" | "heuristic"; // heuristic = Groq unavailable, degraded local fallback used
}

export interface EmotionAgentScore extends AgentScore {
  label: string; // e.g. "dread", "longing", "triumph", "flat"
}

const scoreSchemaNote = `Respond ONLY with JSON: { "score": number (0-100), "summary": string (max 20 words) }.`;

const CLIFFHANGER_WORDS = ["suddenly", "but then", "no one knew", "little did", "before he could", "scream", "gasped", "froze", "vanished", "— and then"];
const EMOTION_LEXICON: Record<string, string[]> = {
  dread: ["fear", "terror", "dread", "afraid", "trembl", "dark"],
  triumph: ["victory", "triumph", "won", "finally", "success"],
  longing: ["missed", "longed", "yearned", "wished", "ached for"],
  grief: ["wept", "cried", "loss", "grief", "mourn"],
  anger: ["rage", "furious", "anger", "shouted", "snapped"],
};

async function withHeuristicFallback<T extends { source: "llm" | "heuristic" }>(
  llmCall: () => Promise<Omit<T, "source">>,
  fallback: () => Omit<T, "source">
): Promise<T> {
  try {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");
    const result = await llmCall();
    return { ...result, source: "llm" } as T;
  } catch (err) {
    console.warn("[specialists] Groq call failed, using heuristic fallback:", err instanceof Error ? err.message : err);
    return { ...fallback(), source: "heuristic" } as T;
  }
}

/**
 * Cliffhanger Agent — how strongly does this beat compel the listener to
 * start the next episode / unlock the next one? Weighted heaviest on the
 * final beat of an episode since that's the coin-unlock moment.
 */
export async function cliffhangerAgent(beatText: string, isFinalBeat: boolean): Promise<AgentScore> {
  return withHeuristicFallback<AgentScore>(
    async () => {
      const system = `You are the Cliffhanger Agent in a serialized audio drama production pipeline. You score how strongly a story beat creates unresolved tension that compels the listener to continue.${
        isFinalBeat ? " This is the FINAL beat of the episode — it is the moment that must drive a next-episode unlock, so judge it accordingly." : ""
      } ${scoreSchemaNote}`;
      return groqJSON<Omit<AgentScore, "source">>(system, `BEAT:\n${beatText}`);
    },
    () => {
      const lower = beatText.toLowerCase();
      const hits = CLIFFHANGER_WORDS.filter((w) => lower.includes(w)).length;
      const endsUnresolved = /[?—]\s*$/.test(beatText.trim()) || beatText.trim().endsWith("...");
      const score = Math.min(95, 30 + hits * 12 + (endsUnresolved ? 20 : 0) + (isFinalBeat ? 10 : 0));
      return { score, summary: "Heuristic estimate from tension-word density (Groq unavailable)." };
    }
  );
}

/**
 * Pacing Agent — is this beat too slow (overwritten description, stalling)
 * or too fast (rushed, confusing) relative to a serialized audio format
 * where listeners can't re-read a line?
 */
export async function pacingAgent(beatText: string): Promise<AgentScore> {
  return withHeuristicFallback<AgentScore>(
    async () => {
      const system = `You are the Pacing Agent for a serialized audio drama. Score whether this beat's pace suits audio-only consumption: too much static description drags, too much crammed action confuses a listener who can't rewind easily. ${scoreSchemaNote}`;
      return groqJSON<Omit<AgentScore, "source">>(system, `BEAT:\n${beatText}`);
    },
    () => {
      const words = beatText.trim().split(/\s+/).filter(Boolean).length;
      // Sweet spot ~15-45 words per beat for audio; penalize far outside it.
      const distance = words < 15 ? 15 - words : words > 45 ? words - 45 : 0;
      const score = Math.max(20, 90 - distance * 3);
      return { score, summary: "Heuristic estimate from beat length (Groq unavailable)." };
    }
  );
}

/**
 * Emotion Agent — the dominant emotional charge of the beat and how
 * strongly it lands. A "flat" label with a high score is a contradiction
 * the orchestrator should flag.
 */
export async function emotionAgent(beatText: string): Promise<EmotionAgentScore> {
  return withHeuristicFallback<EmotionAgentScore>(
    async () => {
      const system = `You are the Emotion Agent for a serialized audio drama. Identify the dominant emotion this beat evokes in a listener and how strongly it lands. Respond ONLY with JSON: { "score": number (0-100, intensity), "label": string (one word, e.g. dread/longing/triumph/flat), "summary": string (max 20 words) }.`;
      return groqJSON<Omit<EmotionAgentScore, "source">>(system, `BEAT:\n${beatText}`);
    },
    () => {
      const lower = beatText.toLowerCase();
      let bestLabel = "flat";
      let bestHits = 0;
      for (const [label, words] of Object.entries(EMOTION_LEXICON)) {
        const hits = words.filter((w) => lower.includes(w)).length;
        if (hits > bestHits) {
          bestHits = hits;
          bestLabel = label;
        }
      }
      const score = bestHits === 0 ? 35 : Math.min(90, 40 + bestHits * 20);
      return { score, label: bestLabel, summary: "Heuristic estimate from emotion-word lexicon (Groq unavailable)." };
    }
  );
}

/**
 * Dialogue Agent — naturalness and distinctiveness of character voice.
 * Only meaningfully applies to beats with a speaker; narration beats still
 * get scored (on prose quality) but the summary reflects that.
 */
export async function dialogueAgent(beatText: string, speaker: string | null): Promise<AgentScore> {
  return withHeuristicFallback<AgentScore>(
    async () => {
      const system = `You are the Dialogue Agent for a serialized audio drama. ${
        speaker
          ? `Score this line spoken by "${speaker}" for naturalness and distinctive character voice (does it sound like a real, specific person and not generic filler?).`
          : `This is narration with no speaker. Score its prose quality for audio narration (clarity, rhythm, economy).`
      } ${scoreSchemaNote}`;
      return groqJSON<Omit<AgentScore, "source">>(system, `BEAT:\n${beatText}`);
    },
    () => {
      const sentences = beatText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      const avgLen = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / Math.max(1, sentences.length);
      const variety = new Set(sentences.map((s) => s.trim().split(/\s+/).length)).size;
      const score = Math.min(85, 40 + variety * 8 + (avgLen > 3 && avgLen < 20 ? 15 : 0));
      return { score, summary: "Heuristic estimate from sentence-length variety (Groq unavailable)." };
    }
  );
}

// --- Readability: deterministic, no LLM call needed ---

/**
 * Flesch Reading Ease, remapped to a 0-100 "listenability" score. Audio
 * drama tolerates more literary complexity than plain web copy, so the
 * remap is gentler than the textbook scale — it flags genuinely dense or
 * run-on prose rather than penalizing all elevated language.
 */
export function computeReadability(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  if (words.length === 0 || sentences.length === 0) return 50;

  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = syllables / words.length;

  const flesch = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  // Remap textbook 0-100 (often skews low for literary prose) into a
  // gentler 20-100 band centered on "spoken narrative" norms.
  const remapped = 20 + (Math.max(0, Math.min(100, flesch)) / 100) * 80;
  return Math.round(remapped);
}

function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length === 0) return 1;
  const matches = clean.match(/[aeiouy]+/g);
  let count = matches ? matches.length : 1;
  if (clean.endsWith("e") && count > 1) count -= 1;
  return Math.max(1, count);
}
