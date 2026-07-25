import { retrieveRelevantBibleEntriesLocal } from "./local-search";
import { retrieveRelevantBibleEntriesDatabricks } from "./databricks";
import type { RankedBibleEntry } from "./types";

export * from "./types";

const useDatabricks = Boolean(
  process.env.DATABRICKS_HOST && process.env.DATABRICKS_TOKEN && process.env.DATABRICKS_VECTOR_SEARCH_ENDPOINT
);

export async function retrieveRelevantBibleEntries(
  seriesId: string,
  queryText: string,
  topK = 8
): Promise<RankedBibleEntry[]> {
  return useDatabricks
    ? retrieveRelevantBibleEntriesDatabricks(seriesId, queryText, topK)
    : retrieveRelevantBibleEntriesLocal(seriesId, queryText, topK);
}
