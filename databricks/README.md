# Showrunner on Databricks

These three notebooks are the production backend for two things the app can
also run entirely locally:

| App component | Local (default) | Databricks (this folder) |
|---|---|---|
| Retention prediction | `src/lib/retention/local.ts` — hand-tuned weighted formula | `02_train_retention_model_mlflow.py` — GBM trained on Delta, served via Model Serving |
| Story Bible search | `src/lib/vector/local-search.ts` — in-memory cosine similarity | `03_vector_search_index.py` — Delta Sync Vector Search index, Databricks-managed embeddings |
| Data landing | SQLite via Prisma | `01_ingest_beats_delta.py` — bronze/silver Delta tables in Unity Catalog |

## Why both exist

A hackathon demo can't depend on live infrastructure staying up mid-pitch.
Every call site (`src/lib/retention/index.ts`, `src/lib/vector/index.ts`)
checks for the relevant `DATABRICKS_*` env vars and transparently falls back
to the local implementation on missing config *or* a runtime failure. The
Databricks path is strictly additive — same input/output contract, so
turning it on is a config change, not a code change.

## Run order

1. `01_ingest_beats_delta.py` — creates the `showrunner.production` schema
   and lands `bronze_beats` / `silver_beat_engagement`.
2. `02_train_retention_model_mlflow.py` — trains and registers the retention
   model, prints the Serving endpoint creation snippet.
3. `03_vector_search_index.py` — creates the Vector Search endpoint + Delta
   Sync index over the Story Bible.

Then point the app at them:

```
DATABRICKS_HOST=https://<workspace>.cloud.databricks.com
DATABRICKS_TOKEN=<personal access token>
DATABRICKS_RETENTION_MODEL_ENDPOINT=showrunner-retention-model
DATABRICKS_VECTOR_SEARCH_ENDPOINT=showrunner-vector-search
DATABRICKS_VECTOR_INDEX_NAME=showrunner.production.story_bible_index
```

## What's simulated vs real

Real listener engagement telemetry from PocketFM wasn't available for this
build (see project scope: public/synthetic data only), so
`01_ingest_beats_delta.py` simulates per-beat survival labels correlated
with the same specialist-agent scores the app already computes, with noise.
The training pipeline, MLflow tracking, model registry, and serving contract
are all real and unchanged by swapping in real telemetry — only the label
source in notebook 01 would need to change.
