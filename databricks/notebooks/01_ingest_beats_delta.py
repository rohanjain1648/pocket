# Databricks notebook source
# MAGIC %md
# MAGIC # 01 — Ingest Beats & Engagement into Delta Lake
# MAGIC
# MAGIC Showrunner's local dev mode runs on SQLite with a transparent heuristic
# MAGIC retention formula (see `src/lib/retention/local.ts`). This notebook builds
# MAGIC the Delta Lake tables that back the **production** path: a real
# MAGIC MLflow-tracked retention model (notebook 02) served to the app via
# MAGIC Databricks Model Serving, and a Vector Search index over the Story Bible
# MAGIC (notebook 03).
# MAGIC
# MAGIC Beat/analysis rows are exported from the app's Postgres/SQLite database
# MAGIC (via the Prisma schema in `prisma/schema.prisma`) as Parquet/JSON and
# MAGIC landed here. Engagement is simulated from beat quality for demo purposes,
# MAGIC standing in for PocketFM's real listener drop-off telemetry — the schema
# MAGIC below is what a real telemetry export would need to match.

# COMMAND ----------

# MAGIC %pip install faker

# COMMAND ----------

from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, BooleanType, IntegerType

CATALOG = "showrunner"
SCHEMA = "production"
spark.sql(f"CREATE CATALOG IF NOT EXISTS {CATALOG}")
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{SCHEMA}")
spark.sql(f"USE CATALOG {CATALOG}")
spark.sql(f"USE SCHEMA {SCHEMA}")

# COMMAND ----------

# MAGIC %md ## Bronze: raw beat exports
# MAGIC Exported from the app via `prisma db pull`-compatible JSON dump, or a
# MAGIC direct Postgres Foreign Data Wrapper / JDBC read in production. Landed
# MAGIC as-is (bronze = untransformed source of truth).

# COMMAND ----------

beats_schema = StructType([
    StructField("beat_id", StringType()),
    StructField("episode_id", StringType()),
    StructField("series_id", StringType()),
    StructField("beat_order", IntegerType()),
    StructField("is_final_beat", BooleanType()),
    StructField("text", StringType()),
    StructField("speaker", StringType()),
    StructField("cliffhanger_score", DoubleType()),
    StructField("pacing_score", DoubleType()),
    StructField("emotion_score", DoubleType()),
    StructField("dialogue_score", DoubleType()),
    StructField("readability_score", DoubleType()),
])

# In production: spark.read.json("/Volumes/showrunner/production/raw_exports/beats/")
# For this notebook, seed a small illustrative sample matching the app's seed data.
sample_beats = [
    ("b1", "ep2", "series1", 0, False, "The stranger arrives at midday...", None, 78, 82, 74, 88, 80),
    ("b2", "ep2", "series1", 1, False, "Give me the ring. Now.", "Kabir", 55, 70, 68, 75, 85),
    ("b3", "ep2", "series1", 2, False, "The market square was busy that day...", None, 20, 25, 22, 30, 45),
    ("b4", "ep2", "series1", 3, False, "Your sister's visions are not gifts...", "Stranger", 72, 68, 71, 80, 78),
    ("b5", "ep2", "series1", 4, False, "Kabir's hand closes around a fire-iron...", None, 88, 74, 85, 82, 76),
    ("b6", "ep2", "series1", 5, False, "Kabir stares at his own palm...", None, 65, 78, 60, 79, 82),
    ("b7", "ep2", "series1", 6, True, "Meera watches from the well...", None, 91, 70, 88, 76, 74),
]

bronze_beats = spark.createDataFrame(sample_beats, schema=beats_schema)
bronze_beats.write.mode("overwrite").saveAsTable("bronze_beats")
display(bronze_beats)

# COMMAND ----------

# MAGIC %md ## Silver: simulated engagement telemetry
# MAGIC
# MAGIC PocketFM's real signal here is per-beat listener drop-off from playback
# MAGIC telemetry. We don't have access to that, so — per the project's public/
# MAGIC synthetic data plan — we simulate plausible engagement labels correlated
# MAGIC with beat quality (with noise), which is enough to demonstrate the
# MAGIC training pipeline end-to-end. Swap this cell for a real telemetry read
# MAGIC the moment production data is available; nothing downstream changes.

# COMMAND ----------

import numpy as np

pdf = bronze_beats.toPandas()
np.random.seed(7)

def simulate_survival(row):
    weights = (
        {"cliffhanger": 0.5, "pacing": 0.15, "emotion": 0.2, "dialogue": 0.1, "readability": 0.05}
        if row["is_final_beat"]
        else {"cliffhanger": 0.25, "pacing": 0.25, "emotion": 0.2, "dialogue": 0.2, "readability": 0.1}
    )
    quality = (
        row["cliffhanger_score"] * weights["cliffhanger"]
        + row["pacing_score"] * weights["pacing"]
        + row["emotion_score"] * weights["emotion"]
        + row["dialogue_score"] * weights["dialogue"]
        + row["readability_score"] * weights["readability"]
    )
    base_survival = 0.8 + (quality / 100) * 0.19
    noisy = np.clip(base_survival + np.random.normal(0, 0.015), 0.5, 0.999)
    return float(noisy), float(quality)

survivals, qualities = zip(*pdf.apply(simulate_survival, axis=1))
pdf["survival_rate"] = survivals
pdf["beat_quality"] = qualities

silver_engagement = spark.createDataFrame(pdf)
silver_engagement.write.mode("overwrite").saveAsTable("silver_beat_engagement")
display(silver_engagement.select("beat_id", "beat_quality", "survival_rate", "is_final_beat"))

# COMMAND ----------

# MAGIC %md
# MAGIC `showrunner.production.silver_beat_engagement` is now the training table
# MAGIC consumed by `02_train_retention_model_mlflow.py`.
