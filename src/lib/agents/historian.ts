import { db } from "@/lib/db";
import { resilientJSON } from "@/lib/llm/resilient";
import { embedBatch, cosineSimilarity, hasOpenAI, EMBEDDING_MODEL } from "@/lib/llm/openai";
import type { ConsistencyFlag } from "./consistency";

export interface PlotHoleResult {
  flags: ConsistencyFlag[];
  summary: string;
}

interface HistorianBeatInput {
  id: string;
  text: string;
}

const UNAVAILABLE: PlotHoleResult = { flags: [], summary: "Plot Hole Hunter unavailable (OPENAI_API_KEY not configured, or no GROQ_API_KEY/GEMINI_API_KEY)." };
const NO_HISTORY: PlotHoleResult = { flags: [], summary: "No prior episodes yet — nothing to cross-check." };
const NO_RELATED: PlotHoleResult = { flags: [], summary: "No related prior beats found." };

function fill(beats: HistorianBeatInput[], result: PlotHoleResult): Map<string, PlotHoleResult> {
  return new Map(beats.map((b) => [b.id, result]));
}

/**
 * Persists an embedding per beat, re-embedding only beats whose text changed
 * since the last index. This is what lets Plot Hole Hunter check a beat
 * against a whole series' history without re-embedding the series on every
 * Analyze click.
 */
async function indexBeats(seriesId: string, episodeId: string, beats: HistorianBeatInput[]): Promise<void> {
  const existing = await db.beatEmbedding.findMany({ where: { beatId: { in: beats.map((b) => b.id) } } });
  const byId = new Map(existing.map((row) => [row.beatId, row]));

  const stale = beats.filter((b) => {
    const row = byId.get(b.id);
    return !row || row.text !== b.text || row.model !== EMBEDDING_MODEL;
  });
  if (stale.length === 0) return;

  const vectors = await embedBatch(stale.map((b) => b.text));
  await Promise.all(
    stale.map((b, i) =>
      db.beatEmbedding.upsert({
        where: { beatId: b.id },
        create: { beatId: b.id, seriesId, episodeId, text: b.text, vector: JSON.stringify(vectors[i]), model: EMBEDDING_MODEL },
        update: { text: b.text, vector: JSON.stringify(vectors[i]), model: EMBEDDING_MODEL },
      })
    )
  );
}

/**
 * Historian agent — the cross-episode Plot Hole Hunter. Unlike the
 * Consistency agent (checks beats against curated Story Bible facts within
 * one episode), this checks new beats against the raw text of every PRIOR
 * beat in the series, which is where contradictions the writer never wrote
 * down as a bible rule actually hide (e.g. "he said his mother died" in
 * episode 2, then a phone call with her in episode 9).
 *
 * Scaling to "thousands of pages" is the whole design constraint here:
 *  1. Beat embeddings are persisted (BeatEmbedding), so a series is only
 *     ever re-embedded incrementally, not on every check.
 *  2. Candidate prior beats are narrowed to the top handful by cosine
 *     similarity BEFORE anything touches an LLM — only that small cluster
 *     goes in the prompt, so cost/latency stay O(clusters) not O(corpus).
 *  3. The actual contradiction call runs on Groq (no daily quota, unlike
 *     Gemini's 20 req/day) since this fires once per beat, with Gemini as
 *     an automatic fallback if Groq is unconfigured or erroring.
 */
export async function plotHoleHunterForEpisode(episodeId: string): Promise<Map<string, PlotHoleResult>> {
  const episode = await db.episode.findUniqueOrThrow({
    where: { id: episodeId },
    include: { beats: { orderBy: { order: "asc" } } },
  });
  const beats: HistorianBeatInput[] = episode.beats.map((b) => ({ id: b.id, text: b.text }));
  if (beats.length === 0) return new Map();

  if (!hasOpenAI() || (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY)) return fill(beats, UNAVAILABLE);

  await indexBeats(episode.seriesId, episodeId, beats);

  const [priorRows, thisEpisodeRows] = await Promise.all([
    db.beatEmbedding.findMany({ where: { seriesId: episode.seriesId, episodeId: { not: episodeId } } }),
    db.beatEmbedding.findMany({ where: { beatId: { in: beats.map((b) => b.id) } } }),
  ]);

  if (priorRows.length === 0) return fill(beats, NO_HISTORY);

  const priorVectors = priorRows.map((row) => ({ ...row, vec: JSON.parse(row.vector) as number[] }));
  const vecByBeatId = new Map(thisEpisodeRows.map((row) => [row.beatId, JSON.parse(row.vector) as number[]]));

  const results = new Map<string, PlotHoleResult>();

  await Promise.all(
    beats.map(async (beat) => {
      const vec = vecByBeatId.get(beat.id);
      if (!vec) {
        results.set(beat.id, NO_RELATED);
        return;
      }

      const ranked = priorVectors
        .map((p) => ({ episodeId: p.episodeId, text: p.text, similarity: cosineSimilarity(vec, p.vec) }))
        .sort((a, b) => b.similarity - a.similarity)
        .filter((p) => p.similarity > 0.3)
        .slice(0, 6);

      if (ranked.length === 0) {
        results.set(beat.id, NO_RELATED);
        return;
      }

      const context = ranked.map((r, i) => `PRIOR BEAT ${i + 1} (from an earlier episode):\n${r.text}`).join("\n\n");
      const system = `You are the Historian agent in a serialized audio drama production pipeline. You check ONE new beat against a small set of semantically related beats pulled from earlier episodes of the same series, looking for genuine contradictions: a fact restated differently, a character who should be dead/absent, a timeline conflict, or a reversed relationship. Only flag real contradictions, not natural plot development. Respond ONLY with JSON: { "flags": [{ "type": "character"|"worldRule"|"timelineEvent"|"relationship"|"other", "message": string (max 20 words), "relatedEntity": string }], "summary": string (max 15 words) }. Return an empty flags array if there's no contradiction.`;
      const user = `PRIOR BEATS FROM EARLIER EPISODES:\n${context}\n\nNEW BEAT TO CHECK:\n${beat.text}`;

      try {
        const parsed = await resilientJSON<{ flags: ConsistencyFlag[]; summary: string }>(system, user);
        const flags = parsed.flags ?? [];
        results.set(beat.id, {
          flags,
          summary: parsed.summary || (flags.length === 0 ? "No cross-episode contradictions found." : `${flags.length} cross-episode issue${flags.length === 1 ? "" : "s"}.`),
        });
      } catch (err) {
        console.warn("[historian] Groq call failed:", err instanceof Error ? err.message : err);
        results.set(beat.id, { flags: [], summary: "Plot Hole Hunter check failed." });
      }
    })
  );

  return results;
}
