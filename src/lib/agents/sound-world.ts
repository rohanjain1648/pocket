import { resilientJSON } from "@/lib/llm/resilient";

// Fixed palette so the client can map each label to a deterministic
// procedural Web Audio recipe (noise shaping / oscillator drones) — no
// external sound assets to source, license, or ship.
export const AMBIENCE_PALETTE = [
  "silence",
  "tense-drone",
  "rain",
  "wind",
  "fire-crackle",
  "market-crowd",
  "footsteps-stone",
  "night-crickets",
  "battle-clash",
  "heartbeat",
] as const;

export type AmbienceLabel = (typeof AMBIENCE_PALETTE)[number];

export interface AmbienceTag {
  beatId: string;
  label: AmbienceLabel;
  intensity: number; // 0-100
  rationale: string; // short why, shown on hover
}

function coerceLabel(label: string): AmbienceLabel {
  return (AMBIENCE_PALETTE as readonly string[]).includes(label) ? (label as AmbienceLabel) : "silence";
}

/**
 * Sound World tagger — the "Ground" for the Sound World lite feature.
 * Reads each beat and picks the best-fit ambience bed from a fixed palette,
 * so the client can render a real (if synthetic) soundscape without any
 * external audio assets.
 */
export async function tagAmbience(beats: { id: string; text: string }[]): Promise<AmbienceTag[]> {
  if ((!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) || beats.length === 0) {
    return beats.map((b) => ({ beatId: b.id, label: "silence" as AmbienceLabel, intensity: 30, rationale: "LLM unavailable" }));
  }

  const beatsBlock = beats.map((b, i) => `BEAT ${i + 1} (id="${b.id}"):\n${b.text}`).join("\n\n");

  const system = `You are the Sound World agent for a serialized audio drama. For each beat, pick the single best-fit ambience bed from this fixed palette ONLY: ${AMBIENCE_PALETTE.join(", ")}. Also give an intensity 0-100 for how loud/present that ambience should sit under the narration, and a short rationale (max 8 words). Respond ONLY with JSON: { "tags": [{ "beatId": string, "label": string, "intensity": number, "rationale": string }] }. Use "silence" when no ambience fits.`;

  try {
    const result = await resilientJSON<{ tags: AmbienceTag[] }>(system, beatsBlock);
    const byId = new Map(result.tags.map((t) => [t.beatId, { ...t, label: coerceLabel(t.label) }]));
    return beats.map((b) => byId.get(b.id) ?? { beatId: b.id, label: "silence" as AmbienceLabel, intensity: 20, rationale: "no tag returned" });
  } catch (err) {
    console.warn("[sound-world] tagging failed:", err instanceof Error ? err.message : err);
    return beats.map((b) => ({ beatId: b.id, label: "silence" as AmbienceLabel, intensity: 20, rationale: "tagging failed" }));
  }
}
