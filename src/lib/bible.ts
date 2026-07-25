import { db } from "@/lib/db";
import type { BibleEntryRef } from "@/lib/vector/types";

/**
 * Flattens the Story Bible (characters, world rules, timeline, relationships)
 * for a series into uniform text refs — the shared representation used both
 * for embedding into the vector index and for direct display/RAG context.
 */
export async function fetchBibleEntries(seriesId: string): Promise<BibleEntryRef[]> {
  const [characters, worldRules, timeline, relationships] = await Promise.all([
    db.character.findMany({ where: { seriesId } }),
    db.worldRule.findMany({ where: { seriesId } }),
    db.timelineEvent.findMany({ where: { seriesId } }),
    db.relationship.findMany({ where: { seriesId } }),
  ]);

  const entries: BibleEntryRef[] = [];

  for (const c of characters) {
    const traits = JSON.parse(c.traits) as string[];
    entries.push({
      id: c.id,
      type: "character",
      text: `Character "${c.name}": ${c.description}. Traits: ${traits.join(", ")}.${
        c.firstAppearedEpisode ? ` First appeared in episode ${c.firstAppearedEpisode}.` : ""
      }`,
    });
  }

  for (const w of worldRules) {
    entries.push({
      id: w.id,
      type: "worldRule",
      text: `World rule (${w.category}): ${w.rule}`,
    });
  }

  for (const t of timeline) {
    entries.push({
      id: t.id,
      type: "timelineEvent",
      text: `Timeline event (episode ${t.episodeNumber}): ${t.description}`,
    });
  }

  for (const r of relationships) {
    entries.push({
      id: r.id,
      type: "relationship",
      text: `Relationship: ${r.characterA} and ${r.characterB} are ${r.type}. ${r.description}`,
    });
  }

  return entries;
}
