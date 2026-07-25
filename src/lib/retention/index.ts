import type { RetentionInput, RetentionResult } from "./types";
import { computeLocalRetention } from "./local";
import { computeDatabricksRetention } from "./databricks";

export * from "./types";

const useDatabricks = Boolean(
  process.env.DATABRICKS_HOST && process.env.DATABRICKS_TOKEN && process.env.DATABRICKS_RETENTION_MODEL_ENDPOINT
);

export async function computeRetention(inputs: RetentionInput[]): Promise<RetentionResult[]> {
  return useDatabricks ? computeDatabricksRetention(inputs) : computeLocalRetention(inputs);
}

/**
 * Cliffhanger Optimizer's headline number: the probability a listener who
 * reaches the final beat goes on to start the NEXT episode. This is distinct
 * from finish rate (retentionScore on the final beat) — a listener can
 * finish an episode and still not binge if the ending doesn't hook them.
 * Finishing is necessary but not sufficient, so this blends finish
 * probability with the final beat's cliffhanger strength rather than using
 * either alone.
 */
export function bingeProbability(finalRetentionScore: number, finalCliffhangerScore: number): number {
  const finishRate = Math.max(0, Math.min(100, finalRetentionScore)) / 100;
  const hookStrength = Math.max(0, Math.min(100, finalCliffhangerScore)) / 100;
  return finishRate * (0.5 + 0.5 * hookStrength) * 100;
}
