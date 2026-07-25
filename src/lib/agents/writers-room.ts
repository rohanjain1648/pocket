import { resilientJSON } from "@/lib/llm/resilient";
import type { Finding } from "./orchestrator";
import type { ConsistencyFlag } from "./consistency";

export type WritersRoomRole = "director" | "editor" | "critic" | "psychologist" | "historian" | "audience";

export interface WritersRoomVoice {
  role: WritersRoomRole;
  comment: string;
}

export interface WritersRoomResult {
  voices: WritersRoomVoice[];
}

export interface WritersRoomContext {
  scores: {
    cliffhangerScore: number;
    pacingScore: number;
    emotionScore: number;
    emotionLabel: string;
    dialogueScore: number;
    readabilityScore: number;
  };
  findings: Finding[];
  consistencyFlags: ConsistencyFlag[];
}

const ROLES: { role: WritersRoomRole; persona: string }[] = [
  { role: "director", persona: "cares about pacing, tension, and how this beat will SOUND when performed" },
  { role: "editor", persona: "cares about structure and tightness — whether every line earns its place" },
  { role: "critic", persona: "judges craft bluntly — dialogue quality, cliché, originality" },
  { role: "psychologist", persona: "reads character motivation and whether the emotion here is earned" },
  { role: "historian", persona: "checks this beat against the show's established facts and past episodes" },
  { role: "audience", persona: "reacts the way a real listener would, in the moment, no jargon" },
];

const UNAVAILABLE: WritersRoomResult = {
  voices: ROLES.map((r) => ({ role: r.role, comment: "Writers Room unavailable (no GROQ_API_KEY/GEMINI_API_KEY set)." })),
};
const CALL_FAILED: WritersRoomResult = {
  voices: ROLES.map((r) => ({ role: r.role, comment: "Writers Room check failed." })),
};

/**
 * Writers Room — six named expert roles (director, editor, critic,
 * psychologist, historian, audience) react to the SAME beat simultaneously,
 * per the hackathon spec. Rather than six separate agent calls inventing six
 * separate opinions, this is one Groq call grounded in the real signals
 * already computed for this beat (specialist scores, findings, consistency/
 * plot-hole flags) — every voice has to react to the same facts, so the
 * panel reads as one room disagreeing over real evidence, not six
 * disconnected guesses.
 */
export async function writersRoomForBeat(beatText: string, context: WritersRoomContext): Promise<WritersRoomResult> {
  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) return UNAVAILABLE;

  const findingsBlock =
    context.findings.length > 0
      ? context.findings.map((f) => `- [${f.agent}, ${f.severity}] ${f.summary}`).join("\n")
      : "- No findings recorded yet for this beat.";
  const flagsBlock =
    context.consistencyFlags.length > 0
      ? context.consistencyFlags.map((f) => `- [${f.type}] ${f.message} (${f.relatedEntity})`).join("\n")
      : "- No continuity or plot-hole flags.";

  const system = `You are running a Writers Room for a serialized audio drama production: six expert roles react to ONE beat simultaneously, each from their own lens. Ground every comment in the real computed signals given below — do not invent facts about the story that aren't in the beat text or signals. Roles:\n${ROLES.map((r) => `- ${r.role}: ${r.persona}`).join("\n")}\nRespond ONLY with JSON: { "voices": [{ "role": "director"|"editor"|"critic"|"psychologist"|"historian"|"audience", "comment": string (max 22 words, first-person, in character) }] }. Include exactly one entry per role listed, in that order.`;

  const user = `BEAT:\n${beatText}\n\nCOMPUTED SIGNALS FOR THIS BEAT:\n- Cliffhanger score: ${context.scores.cliffhangerScore.toFixed(0)}/100\n- Pacing score: ${context.scores.pacingScore.toFixed(0)}/100\n- Emotion: ${context.scores.emotionLabel} (${context.scores.emotionScore.toFixed(0)}/100)\n- Dialogue score: ${context.scores.dialogueScore.toFixed(0)}/100\n- Readability score: ${context.scores.readabilityScore.toFixed(0)}/100\n\nAGENT FINDINGS:\n${findingsBlock}\n\nCONTINUITY / PLOT HOLE FLAGS:\n${flagsBlock}`;

  try {
    const parsed = await resilientJSON<WritersRoomResult>(system, user);
    if (!parsed.voices || parsed.voices.length === 0) throw new Error("empty voices array");
    return parsed;
  } catch (err) {
    console.warn("[writers-room] Groq call failed:", err instanceof Error ? err.message : err);
    return CALL_FAILED;
  }
}
