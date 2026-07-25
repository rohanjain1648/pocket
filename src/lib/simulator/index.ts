import type { SimulatorBeatInput, AudienceSimulationResult } from "./types";
import { simulateAudienceLocal } from "./local";
import { simulateAudienceDatabricks } from "./databricks";

export * from "./types";

const useDatabricks = Boolean(
  process.env.DATABRICKS_HOST && process.env.DATABRICKS_TOKEN && process.env.DATABRICKS_AUDIENCE_SIM_ENDPOINT
);

export async function simulateAudience(beats: SimulatorBeatInput[]): Promise<AudienceSimulationResult> {
  return useDatabricks ? simulateAudienceDatabricks(beats) : simulateAudienceLocal(beats);
}
