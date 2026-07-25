import { resilientJSONOrDefault } from "@/lib/llm/resilient";
import type { SpecialistScores } from "@/lib/retention/types";

export interface MoodProfileResult {
  moodSummary: string;
  energy: number;
  tension: number;
  intimacy: number;
  warmth: number;
}

interface MoodBeatInput {
  text: string;
  scores: SpecialistScores;
  emotionLabel: string;
}

/**
 * Mood Profiler — powers Mood-First Search. energy/tension/intimacy/warmth
 * are derived from the SAME specialist scores already computed by Analyze
 * (not re-invented), averaged across the episode; moodSummary is the one
 * piece that genuinely needs an LLM — a sentence capturing the episode's
 * emotional texture in the kind of language a listener would actually use
 * ("a rainy Sunday after heartbreak"), which is what gets embedded for
 * semantic search against free-text mood queries.
 */
export async function buildMoodProfile(beats: MoodBeatInput[]): Promise<MoodProfileResult> {
  if (beats.length === 0) throw new Error("Cannot build a mood profile with no analyzed beats.");

  const avg = (f: (s: SpecialistScores) => number) => beats.reduce((sum, b) => sum + f(b.scores), 0) / beats.length;
  const energy = avg((s) => (s.pacingScore + s.cliffhangerScore) / 2);
  const tension = avg((s) => s.cliffhangerScore);
  const intimacy = avg((s) => (s.emotionScore + s.dialogueScore) / 2);
  const warmEmotionShare =
    beats.filter((b) => /warm|tender|joy|hope|love|comfort/i.test(b.emotionLabel)).length / beats.length;
  const warmth = warmEmotionShare * 100;

  const excerpt = beats
    .slice(0, Math.min(beats.length, 6))
    .map((b) => b.text)
    .join("\n");

  const system = `You write one evocative sentence describing the emotional TEXTURE of a serialized audio drama episode — the kind of free-text mood a listener might search for, like "a rainy Sunday after heartbreak" or "the last day of summer before everything changes". Base it on the beats given and these measured signals (0-100): energy ${energy.toFixed(0)}, tension ${tension.toFixed(0)}, intimacy ${intimacy.toFixed(0)}, warmth ${warmth.toFixed(0)}. Respond ONLY with JSON: { "moodSummary": string (max 25 words, no genre names, evoke a feeling not a plot) }.`;
  const user = `EPISODE EXCERPT:\n${excerpt}`;

  // Heuristic fallback if every LLM provider fails: pick a canned phrase off
  // the already-computed axes rather than an LLM guess, so mood profiling
  // (and therefore Mood-First Search, which depends on every episode having
  // a profile) still degrades to *something* embeddable instead of failing.
  const fallbackSummary =
    tension > 65 ? "A tense, edge-of-your-seat episode that keeps you leaning in."
    : warmth > 55 ? "A warm, tender episode that sits with you afterward."
    : energy > 65 ? "A fast-moving, urgent episode that pulls you forward."
    : "A quieter, reflective episode with room to breathe.";

  const { moodSummary } = await resilientJSONOrDefault<{ moodSummary: string }>(system, user, { moodSummary: fallbackSummary });

  return { moodSummary, energy, tension, intimacy, warmth };
}
