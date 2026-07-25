import { resilientJSONOrDefault } from "@/lib/llm/resilient";

export interface ConciergeCatalogEpisode {
  id: string;
  seriesTitle: string;
  seriesGenre: string;
  episodeTitle: string;
  synopsis: string;
  moodSummary: string | null;
}

export interface ConciergePlanSlot {
  slot: string; // e.g. "Friday night", "Saturday morning"
  episodeId: string;
  reason: string;
}

export interface ConciergePlan {
  planTitle: string;
  slots: ConciergePlanSlot[];
}

/**
 * Entertainment Concierge — plans a listening weekend around a stated mood
 * and time budget. The model may ONLY pick episodeIds from the catalog it's
 * given (enforced below, not just requested) — this keeps the plan a real
 * itinerary through our own content, not a hallucinated one.
 */
export async function planWeekend(
  mood: string,
  hoursAvailable: number,
  catalog: ConciergeCatalogEpisode[],
  historySummary: string
): Promise<ConciergePlan> {
  if (catalog.length === 0) throw new Error("No playable episodes in the catalog yet.");

  const catalogBlock = catalog
    .map((c) => `- id="${c.id}" | ${c.episodeTitle} (${c.seriesTitle}, ${c.seriesGenre})${c.moodSummary ? ` — ${c.moodSummary}` : ""}\n  ${c.synopsis}`)
    .join("\n");

  const system = `You are the Entertainment Concierge for an audio drama app, planning a listener's weekend. You may ONLY select episodes from the CATALOG below, by their exact id — never invent an id or title. Build a short itinerary (2-4 slots, e.g. "Friday night", "Saturday morning", "Sunday afternoon") that fits within roughly ${hoursAvailable} hours total, matching the requested mood. Respond ONLY with JSON: { "planTitle": string (max 8 words), "slots": [{ "slot": string, "episodeId": string (must be one of the given ids), "reason": string (max 20 words) }] }.`;
  const user = `MOOD REQUESTED: ${mood}\nHOURS AVAILABLE: ${hoursAvailable}\n${historySummary ? `LISTENER HISTORY: ${historySummary}\n` : ""}\nCATALOG:\n${catalogBlock}`;

  // Deterministic fallback if every provider fails: a plain itinerary
  // through the first few catalog episodes, so the Concierge still returns
  // a real, playable plan instead of an error mid-demo.
  const fallbackSlotLabels = ["Friday night", "Saturday morning", "Saturday night", "Sunday afternoon"];
  const fallbackPlan: ConciergePlan = {
    planTitle: "Your weekend plan",
    slots: catalog.slice(0, 4).map((c, i) => ({
      slot: fallbackSlotLabels[i] ?? `Slot ${i + 1}`,
      episodeId: c.id,
      reason: c.moodSummary ?? `Fits your ${mood} mood.`,
    })),
  };

  const parsed = await resilientJSONOrDefault<ConciergePlan>(system, user, fallbackPlan);

  const validIds = new Set(catalog.map((c) => c.id));
  const slots = (parsed.slots ?? []).filter((s) => validIds.has(s.episodeId));

  return { planTitle: parsed.planTitle || "Your weekend plan", slots };
}
