import { resilientJSONOrDefault } from "@/lib/llm/resilient";
import { survivalRateFromQuality } from "@/lib/retention/local";

export interface HookSuggestion {
  text: string; // the suggested next line / stronger ending
  hookScore: number; // 0-100, self-predicted cliffhanger/hook strength of the suggestion
  rationale: string; // short why, e.g. "adds an unanswered question"
}

export interface HookCopilotResult {
  currentHookScore: number; // 0-100, the model's read on how the beat currently ends
  suggestions: HookSuggestion[]; // ranked best-first
  predictedLift: number; // percentage-point survival lift of the top suggestion vs current
}

/**
 * Hook Copilot — the inline "ghost-text" assist. Given the beat the writer is
 * composing, proposes stronger ways to end it (or the next line), each with a
 * self-predicted hook score, and ranks them by predicted unlock lift.
 *
 * Runs on Groq first (fast, per-minute limits that recover) since it fires
 * on every debounced typing pause, falling back to Gemini if Groq is
 * unconfigured or erroring; if BOTH fail, returns zero suggestions rather
 * than throwing — the ghost-text panel just stays empty for that keystroke
 * instead of surfacing an error while the writer is mid-sentence.
 */
export async function hookCopilot(beatText: string, isEpisodeEnding: boolean): Promise<HookCopilotResult> {
  const system = `You are Hook Copilot in a serialized audio drama writing tool. The writer is composing a story beat${
    isEpisodeEnding ? " that ENDS the episode — this is the moment that must drive a next-episode unlock, so weight cliffhanger strength heavily" : ""
  }. First rate how strongly the beat currently ends (currentHookScore, 0-100). Then propose 3 stronger continuations or endings — each a single sentence or two that could be appended to or replace the beat's ending, written for the ear (audio-only). Rank them best-first. Respond ONLY with JSON: { "currentHookScore": number, "suggestions": [{ "text": string, "hookScore": number, "rationale": string (max 12 words) }] }.`;

  const result = await resilientJSONOrDefault<{ currentHookScore: number; suggestions: HookSuggestion[] }>(
    system,
    `BEAT BEING COMPOSED:\n${beatText}`,
    { currentHookScore: 50, suggestions: [] }
  );

  const suggestions = (result.suggestions ?? []).sort((a, b) => b.hookScore - a.hookScore);
  const top = suggestions[0];

  // Translate the hook-score delta into the same survival-rate space the
  // retention heatmap uses, so "predicted lift" is expressed in the same
  // units the writer already sees on the curve.
  const predictedLift = top
    ? Math.max(0, (survivalRateFromQuality(top.hookScore) - survivalRateFromQuality(result.currentHookScore)) * 100)
    : 0;

  return {
    currentHookScore: result.currentHookScore,
    suggestions,
    predictedLift: Number(predictedLift.toFixed(1)),
  };
}
