import { resilientJSONOrDefault } from "@/lib/llm/resilient";
import type { Finding } from "./orchestrator";

export interface RewriteResult {
  rewrittenText: string;
  rationale: string;
}

const schemaNote = `Respond ONLY with JSON: { "rewrittenText": string, "rationale": string (max 30 words, what you changed and why) }.`;

/**
 * Editor Agent — takes a beat and its weak-scoring findings and rewrites it
 * to address them, preserving character voice, continuity, and roughly the
 * original length. Tries Groq first, Gemini second (Gemini's free tier caps
 * at 20 generateContent requests/day/model, already spent by the per-episode
 * Consistency check, so it's a quality enhancement when quota allows rather
 * than the primary path). If both fail, returns the beat unchanged with a
 * rationale saying so — a rewrite button doing nothing beats erroring out
 * mid-demo.
 */
export async function editorAgent(beatText: string, findings: Finding[]): Promise<RewriteResult> {
  const weakFindings = findings.filter((f) => f.severity !== "low");
  const focusList = weakFindings.length > 0
    ? weakFindings.map((f) => `- [${f.agent}] ${f.summary}`).join("\n")
    : "- No critical weaknesses flagged; tighten and polish overall.";

  const system = `You are the Editor Agent in a serialized audio drama production pipeline. Rewrite the given story beat to address the weak points listed below, while preserving character voice, continuity with the surrounding story, and roughly the original length. This is audio-only content — write for the ear, not the page. ${schemaNote}`;
  const user = `ORIGINAL BEAT:\n${beatText}\n\nWEAK POINTS TO FIX:\n${focusList}`;

  return resilientJSONOrDefault<RewriteResult>(system, user, {
    rewrittenText: beatText,
    rationale: "Rewrite unavailable right now — original beat left unchanged.",
  });
}
