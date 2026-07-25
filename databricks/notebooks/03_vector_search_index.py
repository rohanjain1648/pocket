# Databricks notebook source
# MAGIC %md
# MAGIC # 03 — Story Bible Vector Search Index
# MAGIC
# MAGIC Production replacement for `src/lib/vector/local-search.ts`'s in-memory
# MAGIC cosine-similarity search: a real Databricks Vector Search index over the
# MAGIC Story Bible (characters, world rules, timeline events, relationships),
# MAGIC using Databricks' managed embedding model so there's no separate
# MAGIC embedding service to operate. The Consistency Agent
# MAGIC (`src/lib/agents/consistency.ts`) queries this transparently through
# MAGIC `src/lib/vector/databricks.ts` once the endpoint env vars are set —
# MAGIC same `retrieveRelevantBibleEntries()` call site either way.

# COMMAND ----------

# MAGIC %pip install databricks-vectorsearch
# MAGIC dbutils.library.restartPython()

# COMMAND ----------

CATALOG, SCHEMA = "showrunner", "production"
SOURCE_TABLE = f"{CATALOG}.{SCHEMA}.story_bible_entries"
ENDPOINT_NAME = "showrunner-vector-search"
INDEX_NAME = f"{CATALOG}.{SCHEMA}.story_bible_index"

spark.sql(f"USE CATALOG {CATALOG}")
spark.sql(f"USE SCHEMA {SCHEMA}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Source table
# MAGIC Flattened the same way `src/lib/bible.ts#fetchBibleEntries` flattens
# MAGIC Characters / WorldRules / TimelineEvents / Relationships into uniform
# MAGIC `{ id, type, text }` rows for embedding — this table just adds
# MAGIC `series_id` so the index can be filtered per-series at query time.
# MAGIC
# MAGIC Change Data Feed is required for a Delta Sync index to stay live as the
# MAGIC Bible-Builder Agent (`src/lib/agents/bible-builder.ts`) appends new
# MAGIC entities after every episode.

# COMMAND ----------

spark.sql(f"""
CREATE TABLE IF NOT EXISTS {SOURCE_TABLE} (
    id STRING NOT NULL,
    series_id STRING NOT NULL,
    type STRING NOT NULL,   -- character | worldRule | timelineEvent | relationship
    text STRING NOT NULL
)
USING DELTA
TBLPROPERTIES (delta.enableChangeDataFeed = true)
""")

# Illustrative seed matching the app's demo series ("The Ember Oracle").
sample_rows = [
    ("char-meera", "series1", "character", 'Character "Meera": A reluctant oracle who lost her voice as a child and speaks only through ember-scried visions. Traits: mute, clairvoyant, guarded.'),
    ("char-kabir", "series1", "character", 'Character "Kabir": Meera\'s older brother, a blacksmith who publicly renounced all magic after their mother\'s death. Traits: skeptical, protective, forsworn against magic.'),
    ("rule-dusk", "series1", "worldRule", "World rule (magic-system): Ember-scrying can only be performed at dusk, when embers glow but do not burn."),
    ("rule-scar", "series1", "worldRule", "World rule (magic-system): Anyone who breaks a forsworn oath against magic is marked by a burn scar that never heals."),
    ("rel-meera-kabir", "series1", "relationship", "Relationship: Meera and Kabir are family. Siblings bound by grief and a shared secret about their mother's death."),
]
spark.createDataFrame(sample_rows, schema="id STRING, series_id STRING, type STRING, text STRING") \
    .write.mode("overwrite").saveAsTable(SOURCE_TABLE)

display(spark.table(SOURCE_TABLE))

# COMMAND ----------

# MAGIC %md ## Create the endpoint (one-time) and a Delta Sync index
# MAGIC
# MAGIC Uses `databricks-bge-large-en` — a Databricks Foundation Model API
# MAGIC embedding endpoint — as `embedding_model_endpoint_name`, so Databricks
# MAGIC computes and maintains embeddings automatically as the source table
# MAGIC changes. No separate embedding pipeline to run or pay for outside the
# MAGIC platform.

# COMMAND ----------

from databricks.vector_search.client import VectorSearchClient

vsc = VectorSearchClient()

existing_endpoints = [e["name"] for e in vsc.list_endpoints().get("endpoints", [])]
if ENDPOINT_NAME not in existing_endpoints:
    vsc.create_endpoint(name=ENDPOINT_NAME, endpoint_type="STANDARD")

vsc.create_delta_sync_index(
    endpoint_name=ENDPOINT_NAME,
    source_table_name=SOURCE_TABLE,
    index_name=INDEX_NAME,
    pipeline_type="TRIGGERED",
    primary_key="id",
    embedding_source_column="text",
    embedding_model_endpoint_name="databricks-bge-large-en",
)

# COMMAND ----------

# MAGIC %md ## Query it (notebook-side sanity check)

# COMMAND ----------

index = vsc.get_index(endpoint_name=ENDPOINT_NAME, index_name=INDEX_NAME)

results = index.similarity_search(
    query_text="Kabir hurls a bolt of raw ember-light without any binding-chant",
    columns=["id", "type", "text"],
    filters={"series_id": "series1"},
    num_results=5,
)
display(results)

# COMMAND ----------

# MAGIC %md
# MAGIC ## App-side query contract
# MAGIC
# MAGIC `src/lib/vector/databricks.ts` calls the equivalent REST endpoint
# MAGIC directly (so the Next.js server has no Python dependency):
# MAGIC
# MAGIC ```
# MAGIC POST {DATABRICKS_HOST}/api/2.0/vector-search/endpoints/{endpoint}/indexes/{index}/query
# MAGIC { "query_vector": [...], "columns": ["id","type","text"],
# MAGIC   "filters_json": "{\"series_id\": \"...\"}", "num_results": 8 }
# MAGIC ```
# MAGIC
# MAGIC Set in the app's `.env` to switch it on:
# MAGIC ```
# MAGIC DATABRICKS_HOST=https://<workspace>.cloud.databricks.com
# MAGIC DATABRICKS_TOKEN=<PAT>
# MAGIC DATABRICKS_VECTOR_SEARCH_ENDPOINT=showrunner-vector-search
# MAGIC DATABRICKS_VECTOR_INDEX_NAME=showrunner.production.story_bible_index
# MAGIC ```
# MAGIC It falls back to the local embedding search (`local-search.ts`) if the
# MAGIC endpoint is ever unreachable, same as the retention model.
