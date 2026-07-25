import type { RetentionInput, RetentionResult } from "./types";
import { computeLocalRetention } from "./local";

/**
 * Calls the Databricks Model Serving endpoint for the retention/hook model
 * (trained + tracked via MLflow on the Delta-Lake beat/engagement tables —
 * see /databricks/notebooks). Same input/output contract as the local
 * formula so this is a drop-in swap, not a rewrite.
 *
 * Falls back to the local scorer on any failure so a flaky endpoint never
 * breaks the demo.
 */
export async function computeDatabricksRetention(inputs: RetentionInput[]): Promise<RetentionResult[]> {
  const host = process.env.DATABRICKS_HOST;
  const token = process.env.DATABRICKS_TOKEN;
  const endpoint = process.env.DATABRICKS_RETENTION_MODEL_ENDPOINT;

  if (!host || !token || !endpoint) {
    return computeLocalRetention(inputs);
  }

  try {
    const res = await fetch(`${host}/serving-endpoints/${endpoint}/invocations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dataframe_records: inputs.map((i) => ({
          cliffhanger_score: i.scores.cliffhangerScore,
          pacing_score: i.scores.pacingScore,
          emotion_score: i.scores.emotionScore,
          dialogue_score: i.scores.dialogueScore,
          readability_score: i.scores.readabilityScore,
          is_final_beat: i.isFinalBeat,
        })),
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Databricks endpoint returned ${res.status}`);

    const json = (await res.json()) as {
      predictions: { beat_quality: number; survival_rate: number; retention_score: number; dropoff_risk: RetentionResult["dropoffRisk"] }[];
    };

    return json.predictions.map((p) => ({
      beatQuality: p.beat_quality,
      survivalRate: p.survival_rate,
      retentionScore: p.retention_score,
      dropoffRisk: p.dropoff_risk,
      modelSource: "databricks" as const,
    }));
  } catch (err) {
    console.warn("[retention] Databricks endpoint failed, falling back to local model:", err);
    return computeLocalRetention(inputs);
  }
}
