import { geminiEmbed } from "@/lib/llm/gemini";
import { retrieveRelevantBibleEntriesLocal } from "./local-search";
import type { RankedBibleEntry } from "./types";

/**
 * Queries a Databricks Vector Search index built over the Story Bible
 * (see /databricks/notebooks/03_vector_search_index.py). Falls back to the
 * local embedding search on any failure.
 */
export async function retrieveRelevantBibleEntriesDatabricks(
  seriesId: string,
  queryText: string,
  topK = 8
): Promise<RankedBibleEntry[]> {
  const host = process.env.DATABRICKS_HOST;
  const token = process.env.DATABRICKS_TOKEN;
  const endpoint = process.env.DATABRICKS_VECTOR_SEARCH_ENDPOINT;
  const indexName = process.env.DATABRICKS_VECTOR_INDEX_NAME;

  if (!host || !token || !endpoint || !indexName) {
    return retrieveRelevantBibleEntriesLocal(seriesId, queryText, topK);
  }

  try {
    const queryVec = await geminiEmbed(queryText);

    const res = await fetch(`${host}/api/2.0/vector-search/endpoints/${endpoint}/indexes/${indexName}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query_vector: queryVec,
        columns: ["id", "type", "text"],
        filters_json: JSON.stringify({ series_id: seriesId }),
        num_results: topK,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Databricks Vector Search returned ${res.status}`);

    const json = (await res.json()) as {
      result: { data_array: [string, RankedBibleEntry["type"], string, number][] };
    };

    return json.result.data_array.map(([id, type, text, similarity]) => ({ id, type, text, similarity }));
  } catch (err) {
    console.warn("[vector] Databricks Vector Search failed, falling back to local:", err);
    return retrieveRelevantBibleEntriesLocal(seriesId, queryText, topK);
  }
}
