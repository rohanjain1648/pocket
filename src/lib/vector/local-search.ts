import { db } from "@/lib/db";
import { embedBatch, embed, cosineSimilarity, hasOpenAI, EMBEDDING_MODEL } from "@/lib/llm/openai";
import { fetchBibleEntries } from "@/lib/bible";
import type { BibleEntryRef, RankedBibleEntry } from "./types";

/**
 * Local stand-in for Databricks Vector Search.
 *
 * Two things make this scale past the earlier implementation, which
 * re-embedded the entire Story Bible on every single call and therefore
 * capped out at a few dozen entries:
 *
 *  1. Embeddings are PERSISTED (BibleEmbedding table), keyed by entry id +
 *     text. An entry is only re-embedded when its text actually changes, so
 *     steady-state cost is one embedding call for the query alone.
 *  2. Embedding runs through OpenAI text-embedding-3-small rather than
 *     Gemini. Gemini's free tier allows 20 requests/day/model — a single
 *     bible re-index exhausted it, which is why semantic retrieval was
 *     previously bypassed entirely on the hot path.
 *
 * Ranking itself is in-process cosine similarity, which is fine well into
 * the thousands of entries; Databricks Vector Search takes over beyond that
 * (see ./databricks.ts) via the same interface.
 */

interface StoredVector {
  entryId: string;
  vector: number[];
}

async function loadOrCreateVectors(seriesId: string, entries: BibleEntryRef[]): Promise<StoredVector[]> {
  const existing = await db.bibleEmbedding.findMany({
    where: { seriesId, entryId: { in: entries.map((e) => e.id) } },
  });
  const byEntryId = new Map(existing.map((row) => [row.entryId, row]));

  // Only embed entries that are new or whose text changed since last index.
  const stale = entries.filter((e) => {
    const row = byEntryId.get(e.id);
    return !row || row.text !== e.text || row.model !== EMBEDDING_MODEL;
  });

  if (stale.length > 0) {
    const vectors = await embedBatch(stale.map((e) => e.text));
    await Promise.all(
      stale.map((entry, i) =>
        db.bibleEmbedding.upsert({
          where: { entryType_entryId: { entryType: entry.type, entryId: entry.id } },
          create: {
            seriesId,
            entryType: entry.type,
            entryId: entry.id,
            text: entry.text,
            vector: JSON.stringify(vectors[i]),
            model: EMBEDDING_MODEL,
          },
          update: { text: entry.text, vector: JSON.stringify(vectors[i]), model: EMBEDDING_MODEL },
        })
      )
    );
    for (let i = 0; i < stale.length; i++) {
      byEntryId.set(stale[i].id, {
        id: "",
        seriesId,
        entryType: stale[i].type,
        entryId: stale[i].id,
        text: stale[i].text,
        vector: JSON.stringify(vectors[i]),
        model: EMBEDDING_MODEL,
        createdAt: new Date(),
      });
    }
  }

  return entries
    .map((e) => {
      const row = byEntryId.get(e.id);
      return row ? { entryId: e.id, vector: JSON.parse(row.vector) as number[] } : null;
    })
    .filter((v): v is StoredVector => v !== null);
}

export async function retrieveRelevantBibleEntriesLocal(
  seriesId: string,
  queryText: string,
  topK = 8
): Promise<RankedBibleEntry[]> {
  const entries: BibleEntryRef[] = await fetchBibleEntries(seriesId);
  if (entries.length === 0) return [];

  // Without an embedding provider, degrade to returning the bible unranked
  // rather than failing — callers treat this as "no semantic narrowing".
  if (!hasOpenAI()) {
    return entries.slice(0, topK).map((e) => ({ ...e, similarity: 0 }));
  }

  const [queryVec, stored] = await Promise.all([
    embed(queryText),
    loadOrCreateVectors(seriesId, entries),
  ]);

  const vectorByEntryId = new Map(stored.map((s) => [s.entryId, s.vector]));

  return entries
    .map((entry) => {
      const vec = vectorByEntryId.get(entry.id);
      return { ...entry, similarity: vec ? cosineSimilarity(queryVec, vec) : 0 };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
