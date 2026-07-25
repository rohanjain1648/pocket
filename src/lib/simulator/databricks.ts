import { simulateAudienceLocal } from "./local";
import type { SimulatorBeatInput, AudienceSimulationResult } from "./types";

/**
 * Calls a Databricks Model Serving endpoint that runs the same Monte Carlo
 * population simulation at scale (trained/calibrated against real listening
 * telemetry in Delta Lake, rather than the hand-tuned local weights). Same
 * input/output contract as the local simulator, so this is a drop-in swap.
 *
 * Falls back to the local simulator on any failure or missing config so a
 * flaky endpoint never breaks the demo.
 */
export async function simulateAudienceDatabricks(beats: SimulatorBeatInput[]): Promise<AudienceSimulationResult> {
  const host = process.env.DATABRICKS_HOST;
  const token = process.env.DATABRICKS_TOKEN;
  const endpoint = process.env.DATABRICKS_AUDIENCE_SIM_ENDPOINT;

  if (!host || !token || !endpoint) {
    return simulateAudienceLocal(beats);
  }

  try {
    const res = await fetch(`${host}/serving-endpoints/${endpoint}/invocations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dataframe_records: beats.map((b) => ({
          beat_id: b.id,
          order: b.order,
          cliffhanger_score: b.scores.cliffhangerScore,
          pacing_score: b.scores.pacingScore,
          emotion_score: b.scores.emotionScore,
          dialogue_score: b.scores.dialogueScore,
          readability_score: b.scores.readabilityScore,
          is_final_beat: b.isFinalBeat,
        })),
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`Databricks endpoint returned ${res.status}`);

    const json = (await res.json()) as { predictions: Omit<AudienceSimulationResult, "modelSource"> };
    return { ...json.predictions, modelSource: "databricks" };
  } catch (err) {
    console.warn("[simulator] Databricks endpoint failed, falling back to local simulator:", err);
    return simulateAudienceLocal(beats);
  }
}
