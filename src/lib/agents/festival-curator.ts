import { resilientJSONOrDefault } from "@/lib/llm/resilient";
import { generateCoverArt, hasOpenAI } from "@/lib/llm/openai";

export interface FestivalCatalogEpisode {
  id: string;
  seriesTitle: string;
  seriesGenre: string;
  episodeTitle: string;
  synopsis: string;
  moodSummary: string | null;
}

export interface FestivalSlotPlan {
  episodeId: string;
  note: string;
}

export interface FestivalPlan {
  title: string;
  theme: string;
  description: string;
  arc: string;
  slots: FestivalSlotPlan[];
  coverUrl: string | null;
}

/**
 * AI Curated Festivals — a themed, ordered running order built ONLY from
 * real episodes in the catalog (ids are validated against it, same guard as
 * the Concierge), with a generated cover image so it reads as a real
 * festival page rather than a bare list.
 */
export async function curateFestival(catalog: FestivalCatalogEpisode[], seedTheme?: string): Promise<FestivalPlan> {
  if (catalog.length === 0) throw new Error("No playable episodes in the catalog yet.");

  const catalogBlock = catalog
    .map((c) => `- id="${c.id}" | ${c.episodeTitle} (${c.seriesTitle}, ${c.seriesGenre})${c.moodSummary ? ` — ${c.moodSummary}` : ""}\n  ${c.synopsis}`)
    .join("\n");

  const system = `You curate a themed listening festival for an audio drama app, choosing ONLY from the CATALOG below by exact id — never invent an id or title. Pick 3-6 episodes and order them so the festival builds emotionally across its running order (the "arc"). Respond ONLY with JSON: { "title": string (max 6 words, evocative festival name), "theme": string (max 6 words), "description": string (max 30 words), "arc": string (max 30 words, how the emotional journey builds across the running order), "slots": [{ "episodeId": string (must be one of the given ids), "note": string (max 18 words, why this episode sits here in the arc) }] }.`;
  const user = `${seedTheme ? `REQUESTED THEME: ${seedTheme}\n` : "No specific theme requested — invent a compelling one from the catalog's mood variety.\n"}CATALOG:\n${catalogBlock}`;

  // Deterministic "Editor's Picks" fallback if every provider fails — still
  // a real, playable festival built from the catalog, just without the
  // generated theme/arc copy.
  const fallback: Omit<FestivalPlan, "coverUrl"> = {
    title: seedTheme ?? "Editor's Picks",
    theme: seedTheme ?? "Handpicked highlights",
    description: "A curated set of episodes worth your time this week.",
    arc: "",
    slots: catalog.slice(0, Math.min(6, catalog.length)).map((c) => ({ episodeId: c.id, note: c.episodeTitle })),
  };

  const parsed = await resilientJSONOrDefault<Omit<FestivalPlan, "coverUrl">>(system, user, fallback);

  const validIds = new Set(catalog.map((c) => c.id));
  const slots = (parsed.slots ?? []).filter((s) => validIds.has(s.episodeId));

  let coverUrl: string | null = null;
  if (hasOpenAI()) {
    try {
      coverUrl = await generateCoverArt(
        `A moody, atmospheric festival poster illustration for an audio drama listening festival titled "${parsed.title}", theme: ${parsed.theme}. No text or letters in the image.`
      );
    } catch (err) {
      console.warn("[festival-curator] cover art generation failed:", err instanceof Error ? err.message : err);
    }
  }

  return { ...parsed, slots, coverUrl };
}
