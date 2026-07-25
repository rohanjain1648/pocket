import { resilientJSON } from "@/lib/llm/resilient";
import { survivalRateFromQuality, riskFromSurvival } from "@/lib/retention/local";
import type { DropoffRisk, SpecialistScores } from "@/lib/retention/types";

export interface PersonaWeights {
  cliffhanger: number;
  pacing: number;
  emotion: number;
  dialogue: number;
  readability: number;
}

export interface Persona {
  id: string;
  label: string;
  description: string;
  color: string; // CSS color for the curve/tab
  weights: PersonaWeights;
  finalBeatWeights: PersonaWeights;
}

/**
 * Audience Mirror personas — the SAME retention formula as the general
 * model (src/lib/retention/local.ts), just re-weighted per persona. This
 * reuses validated math instead of inventing separate numbers, so when two
 * personas' curves diverge it's a real statement about which story
 * dimensions each persona is sensitive to, not an LLM guess.
 */
export const PERSONAS: Persona[] = [
  {
    id: "general",
    label: "General Listener",
    description: "A typical PocketFM listener with no strong genre bias.",
    color: "#9aa1b2",
    weights: { cliffhanger: 0.25, pacing: 0.25, emotion: 0.2, dialogue: 0.2, readability: 0.1 },
    finalBeatWeights: { cliffhanger: 0.5, pacing: 0.15, emotion: 0.2, dialogue: 0.1, readability: 0.05 },
  },
  {
    id: "suspense",
    label: "Suspense Fan",
    description: "Craves tension and unresolved danger; bores quickly at slow, descriptive beats.",
    color: "#f0453a",
    weights: { cliffhanger: 0.45, pacing: 0.3, emotion: 0.15, dialogue: 0.05, readability: 0.05 },
    finalBeatWeights: { cliffhanger: 0.65, pacing: 0.2, emotion: 0.1, dialogue: 0.03, readability: 0.02 },
  },
  {
    id: "romance",
    label: "Romance Devotee",
    description: "Listens for emotional intimacy and voice; tolerates slower pacing if the feelings are real.",
    color: "#f5c542",
    weights: { cliffhanger: 0.15, pacing: 0.15, emotion: 0.4, dialogue: 0.25, readability: 0.05 },
    finalBeatWeights: { cliffhanger: 0.3, pacing: 0.1, emotion: 0.4, dialogue: 0.15, readability: 0.05 },
  },
  {
    id: "commuter",
    label: "Commuter (short attention)",
    description: "Half-listening on a train; only truly slow or confusing beats lose them, cliffhangers matter less mid-episode.",
    color: "#34d399",
    weights: { cliffhanger: 0.2, pacing: 0.45, emotion: 0.15, dialogue: 0.1, readability: 0.1 },
    finalBeatWeights: { cliffhanger: 0.45, pacing: 0.3, emotion: 0.15, dialogue: 0.05, readability: 0.05 },
  },
];

export interface AudienceMirrorBeatInput {
  id: string;
  text: string;
  isFinalBeat: boolean;
  scores: SpecialistScores;
}

export interface PersonaBeatResult {
  beatId: string;
  retentionScore: number;
  survivalRate: number;
  dropoffRisk: DropoffRisk;
  reaction: string;
}

export interface AudienceMirrorResult {
  personaId: string;
  finalRetention: number;
  beats: PersonaBeatResult[];
}

function personaBeatQuality(scores: SpecialistScores, w: PersonaWeights): number {
  return (
    scores.cliffhangerScore * w.cliffhanger +
    scores.pacingScore * w.pacing +
    scores.emotionScore * w.emotion +
    scores.dialogueScore * w.dialogue +
    scores.readabilityScore * w.readability
  );
}

async function generateReactions(
  persona: Persona,
  beats: AudienceMirrorBeatInput[],
  risks: DropoffRisk[]
): Promise<Map<string, string>> {
  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) return new Map();

  const beatsBlock = beats
    .map((b, i) => `BEAT ${i + 1} (id="${b.id}", predicted_risk_for_this_persona=${risks[i]}):\n${b.text}`)
    .join("\n\n");

  const system = `You are simulating how a specific listener persona reacts to a serialized audio drama, beat by beat. PERSONA: ${persona.label} — ${persona.description}. For each beat you are given its predicted drop-off risk for THIS persona (low/medium/high/critical) — your reaction line must be consistent with that risk: "critical" should read as real boredom/annoyance/confusion, "low" should read as hooked/engaged, "medium"/"high" somewhere between. Write ONE short first-person reaction (max 12 words) per beat. Respond ONLY with JSON: { "reactions": [{ "beatId": string, "reaction": string }] }.`;

  try {
    const result = await resilientJSON<{ reactions: { beatId: string; reaction: string }[] }>(system, beatsBlock);
    return new Map(result.reactions.map((r) => [r.beatId, r.reaction]));
  } catch (err) {
    console.warn("[audience-mirror] reaction generation failed:", err instanceof Error ? err.message : err);
    return new Map();
  }
}

export async function computeAudienceMirror(persona: Persona, beats: AudienceMirrorBeatInput[]): Promise<AudienceMirrorResult> {
  let cumulative = 100;
  const math = beats.map((b) => {
    const w = b.isFinalBeat ? persona.finalBeatWeights : persona.weights;
    const quality = personaBeatQuality(b.scores, w);
    const survivalRate = survivalRateFromQuality(quality);
    cumulative *= survivalRate;
    return { beatId: b.id, retentionScore: cumulative, survivalRate, dropoffRisk: riskFromSurvival(survivalRate) };
  });

  const reactions = await generateReactions(persona, beats, math.map((m) => m.dropoffRisk));

  const beatResults: PersonaBeatResult[] = math.map((m) => ({
    ...m,
    reaction: reactions.get(m.beatId) ?? "…",
  }));

  return {
    personaId: persona.id,
    finalRetention: beatResults[beatResults.length - 1]?.retentionScore ?? 100,
    beats: beatResults,
  };
}

export async function computeAllPersonas(beats: AudienceMirrorBeatInput[]): Promise<AudienceMirrorResult[]> {
  return Promise.all(PERSONAS.map((p) => computeAudienceMirror(p, beats)));
}
