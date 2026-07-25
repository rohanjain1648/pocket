import { resilientJSON } from "@/lib/llm/resilient";
import { db } from "@/lib/db";

interface ExtractedBible {
  characters: { name: string; description: string; traits: string[] }[];
  worldRules: { rule: string; category: string }[];
  timelineEvents: { description: string; order: number }[];
  relationships: { characterA: string; characterB: string; type: string; description: string }[];
}

/**
 * Bible-Builder Agent — the "Ground" pillar's ingestion side. Reads a new
 * episode's script and extracts new/updated Story Bible entities, then
 * upserts them into the graph so later episodes can be checked for
 * consistency against them.
 *
 * Tries Groq first, Gemini second — same reasoning as the Adapter agent:
 * Gemini's free tier caps at 20 generateContent requests/day/model.
 *
 * Runs additively: it doesn't try to resolve conflicts with existing bible
 * entries here — that's the Consistency Agent's job at analysis time. This
 * agent's job is just to keep the bible populated as new episodes land.
 */
export async function bibleBuilderAgent(seriesId: string, episodeNumber: number, scriptText: string): Promise<void> {
  const system = `You are the Bible-Builder Agent in a serialized audio drama production pipeline. Extract new story-world facts introduced in this episode script: characters (with traits), world rules (setting, magic/tech systems, society), timeline events, and character relationships. Only extract what is actually stated or clearly shown in the text — do not invent facts. Respond ONLY with JSON: { "characters": [{ "name": string, "description": string, "traits": string[] }], "worldRules": [{ "rule": string, "category": "setting"|"magic-system"|"technology"|"society"|"other" }], "timelineEvents": [{ "description": string, "order": number }], "relationships": [{ "characterA": string, "characterB": string, "type": string, "description": string }] }. Return empty arrays for categories with nothing new.`;

  const user = `EPISODE ${episodeNumber} SCRIPT:\n${scriptText}`;
  const extracted = await resilientJSON<ExtractedBible>(system, user);

  await db.$transaction([
    ...extracted.characters.map((c) =>
      db.character.create({
        data: {
          seriesId,
          name: c.name,
          description: c.description,
          traits: JSON.stringify(c.traits),
          firstAppearedEpisode: episodeNumber,
        },
      })
    ),
    ...extracted.worldRules.map((w) =>
      db.worldRule.create({ data: { seriesId, rule: w.rule, category: w.category } })
    ),
    ...extracted.timelineEvents.map((t) =>
      db.timelineEvent.create({
        data: { seriesId, episodeNumber, description: t.description, order: t.order },
      })
    ),
    ...extracted.relationships.map((r) =>
      db.relationship.create({
        data: { seriesId, characterA: r.characterA, characterB: r.characterB, type: r.type, description: r.description },
      })
    ),
  ]);
}
