import { resilientJSONOrDefault } from "@/lib/llm/resilient";

export interface DirectorParams {
  suspense: number; // 0-100: 0 = resolved/calm, 100 = maximum unresolved tension
  warmth: number; // 0-100: 0 = cold/detached, 100 = intimate/tender
  intensity: number; // 0-100: 0 = understated, 100 = visceral/heightened
  pace: number; // 0-100: 0 = slow, lingering, descriptive; 100 = rapid, urgent, clipped
}

export interface DirectorResult {
  rewrittenText: string;
}

/**
 * Director's Control Room — re-directs a beat's TONE along four dials
 * without changing its plot events. This is a live-slider feature (fires
 * on drag-release), so Groq-first for latency, Gemini as a fallback.
 */
export async function directBeat(beatText: string, params: DirectorParams): Promise<DirectorResult> {
  const system = `You are the Director in a serialized audio drama writing tool. Rewrite the given beat to match these directorial dials, each 0-100:
- Suspense ${Math.round(params.suspense)} (0 = fully resolved and calm, 100 = maximum unresolved tension)
- Warmth ${Math.round(params.warmth)} (0 = cold and detached, 100 = intimate and tender)
- Intensity ${Math.round(params.intensity)} (0 = understated, 100 = visceral and heightened)
- Pace ${Math.round(params.pace)} (0 = slow, lingering, descriptive sentences; 100 = rapid, urgent, clipped sentences)
Keep the same core events, characters, and roughly the same length — this is a tonal re-direction, not a plot change. This is audio-only content — write for the ear, not the page. Respond ONLY with JSON: { "rewrittenText": string }.`;

  const user = `BEAT:\n${beatText}`;

  // Groq first, Gemini fallback, and if both fail the beat comes back
  // unchanged rather than throwing — a live-slider feature erroring mid-drag
  // is worse than the dial silently not doing anything for one release.
  return resilientJSONOrDefault<DirectorResult>(system, user, { rewrittenText: beatText });
}
