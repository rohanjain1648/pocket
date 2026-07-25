# Databricks notebook source
# MAGIC %md
# MAGIC # 02 — Train & Serve the Retention Model (MLflow)
# MAGIC
# MAGIC This is the production replacement for `src/lib/retention/local.ts`'s
# MAGIC hand-tuned formula. Same contract, different engine: instead of a fixed
# MAGIC weighted average mapped through a hand-picked curve, a GBM learns the
# MAGIC mapping from the five specialist-agent scores to actual observed
# MAGIC per-beat listener survival, trained on `silver_beat_engagement`.
# MAGIC
# MAGIC The interpretable weighted "beat quality" score is kept alongside the
# MAGIC model's prediction — the score pills in the Studio UI stay meaningful,
# MAGIC while `survival_rate` becomes a genuine learned probability instead of a
# MAGIC formula. Cumulative retention compounding and risk-bucketing happen
# MAGIC inside the served model, so the app's HTTP contract never changes,
# MAGIC whether it's talking to `local.ts` or this endpoint.

# COMMAND ----------

# MAGIC %pip install mlflow scikit-learn pandas
# MAGIC dbutils.library.restartPython()

# COMMAND ----------

import mlflow
import mlflow.pyfunc
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split

mlflow.set_registry_uri("databricks-uc")
CATALOG, SCHEMA = "showrunner", "production"
MODEL_NAME = f"{CATALOG}.{SCHEMA}.retention_model"

FEATURE_COLS = [
    "cliffhanger_score",
    "pacing_score",
    "emotion_score",
    "dialogue_score",
    "readability_score",
    "is_final_beat",
]

MID_WEIGHTS = {"cliffhanger": 0.25, "pacing": 0.25, "emotion": 0.20, "dialogue": 0.20, "readability": 0.10}
FINAL_WEIGHTS = {"cliffhanger": 0.50, "pacing": 0.15, "emotion": 0.20, "dialogue": 0.10, "readability": 0.05}

# COMMAND ----------

# MAGIC %md ## Load training data

# COMMAND ----------

df = spark.table(f"{CATALOG}.{SCHEMA}.silver_beat_engagement").toPandas()
df["is_final_beat"] = df["is_final_beat"].astype(int)

X = df[FEATURE_COLS]
y = df["survival_rate"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=7)

# COMMAND ----------

# MAGIC %md ## Train

# COMMAND ----------

with mlflow.start_run(run_name="retention-gbm") as run:
    model = GradientBoostingRegressor(
        n_estimators=150,
        max_depth=3,
        learning_rate=0.05,
        random_state=7,
    )
    model.fit(X_train, y_train)

    test_mae = float(np.mean(np.abs(model.predict(X_test) - y_test)))
    mlflow.log_params({"n_estimators": 150, "max_depth": 3, "learning_rate": 0.05})
    mlflow.log_metric("test_mae", test_mae)
    print(f"Test MAE (survival_rate, 0-1 scale): {test_mae:.4f}")

    run_id = run.info.run_id

# COMMAND ----------

# MAGIC %md
# MAGIC ## Wrap as a pyfunc model
# MAGIC
# MAGIC The served model receives one HTTP call per **episode** (see
# MAGIC `src/lib/retention/databricks.ts` — it batches all beats of an episode
# MAGIC into a single `dataframe_records` payload, in beat order). That lets the
# MAGIC pyfunc do the same beat-to-beat retention compounding that
# MAGIC `computeLocalRetention` does client-side, but with a learned
# MAGIC `survival_rate` per beat instead of a formula.

# COMMAND ----------

class RetentionModel(mlflow.pyfunc.PythonModel):
    def load_context(self, context):
        import joblib
        self.gbm = joblib.load(context.artifacts["gbm"])

    @staticmethod
    def _beat_quality(row) -> float:
        weights = FINAL_WEIGHTS if row["is_final_beat"] else MID_WEIGHTS
        return (
            row["cliffhanger_score"] * weights["cliffhanger"]
            + row["pacing_score"] * weights["pacing"]
            + row["emotion_score"] * weights["emotion"]
            + row["dialogue_score"] * weights["dialogue"]
            + row["readability_score"] * weights["readability"]
        )

    @staticmethod
    def _risk(survival_rate: float) -> str:
        if survival_rate >= 0.97:
            return "low"
        if survival_rate >= 0.92:
            return "medium"
        if survival_rate >= 0.85:
            return "high"
        return "critical"

    def predict(self, context, model_input: pd.DataFrame):
        features = model_input[FEATURE_COLS].copy()
        features["is_final_beat"] = features["is_final_beat"].astype(int)

        raw_survival = self.gbm.predict(features)
        predictions = []
        cumulative = 100.0

        for i, row in model_input.reset_index(drop=True).iterrows():
            survival_rate = float(np.clip(raw_survival[i], 0.5, 0.999))
            cumulative *= survival_rate
            predictions.append(
                {
                    "beat_quality": self._beat_quality(row),
                    "survival_rate": survival_rate,
                    "retention_score": cumulative,
                    "dropoff_risk": self._risk(survival_rate),
                }
            )
        return predictions

# COMMAND ----------

# MAGIC %md ## Log, register, and (illustratively) serve

# COMMAND ----------

import joblib
import tempfile
import os

with tempfile.TemporaryDirectory() as tmp:
    gbm_path = os.path.join(tmp, "gbm.joblib")
    joblib.dump(model, gbm_path)

    with mlflow.start_run(run_id=run_id):
        mlflow.pyfunc.log_model(
            artifact_path="retention_model",
            python_model=RetentionModel(),
            artifacts={"gbm": gbm_path},
            registered_model_name=MODEL_NAME,
            pip_requirements=["scikit-learn", "pandas", "joblib"],
        )

# COMMAND ----------

# MAGIC %md
# MAGIC ### Serving endpoint
# MAGIC
# MAGIC Create (once) via the UI or:
# MAGIC ```python
# MAGIC from databricks.sdk import WorkspaceClient
# MAGIC from databricks.sdk.service.serving import EndpointCoreConfigInput, ServedEntityInput
# MAGIC
# MAGIC w = WorkspaceClient()
# MAGIC w.serving_endpoints.create(
# MAGIC     name="showrunner-retention-model",
# MAGIC     config=EndpointCoreConfigInput(
# MAGIC         served_entities=[
# MAGIC             ServedEntityInput(
# MAGIC                 entity_name=MODEL_NAME,
# MAGIC                 entity_version="1",
# MAGIC                 workload_size="Small",
# MAGIC                 scale_to_zero_enabled=True,
# MAGIC             )
# MAGIC         ]
# MAGIC     ),
# MAGIC )
# MAGIC ```
# MAGIC Then set in the app's `.env`:
# MAGIC ```
# MAGIC DATABRICKS_HOST=https://<workspace>.cloud.databricks.com
# MAGIC DATABRICKS_TOKEN=<PAT>
# MAGIC DATABRICKS_RETENTION_MODEL_ENDPOINT=showrunner-retention-model
# MAGIC ```
# MAGIC `src/lib/retention/databricks.ts` will start routing there automatically —
# MAGIC no app code changes required, and it falls back to the local formula if
# MAGIC the endpoint is ever unreachable.
