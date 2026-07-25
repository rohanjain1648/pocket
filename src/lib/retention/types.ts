export interface SpecialistScores {
  cliffhangerScore: number;
  pacingScore: number;
  emotionScore: number;
  dialogueScore: number;
  readabilityScore: number;
}

export type DropoffRisk = "low" | "medium" | "high" | "critical";

export interface RetentionResult {
  beatQuality: number; // 0-100, weighted composite of specialist scores
  survivalRate: number; // 0-1, probability a listener who reached this beat continues past it
  retentionScore: number; // 0-100, cumulative probability a listener from beat 0 is still listening
  dropoffRisk: DropoffRisk;
  modelSource: "local" | "databricks";
}

export interface RetentionInput {
  scores: SpecialistScores;
  isFinalBeat: boolean;
}
