import type { DropoffRisk, RetentionInput, RetentionResult, SpecialistScores } from "./types";

// Weights differ for the final beat of an episode: that's the "unlock next
// episode" moment, so cliffhanger strength dominates the composite score.
const MID_WEIGHTS = { cliffhanger: 0.25, pacing: 0.25, emotion: 0.2, dialogue: 0.2, readability: 0.1 };
const FINAL_WEIGHTS = { cliffhanger: 0.5, pacing: 0.15, emotion: 0.2, dialogue: 0.1, readability: 0.05 };

export function scoreBeatQuality(scores: SpecialistScores, isFinalBeat: boolean): number {
  const w = isFinalBeat ? FINAL_WEIGHTS : MID_WEIGHTS;
  return (
    scores.cliffhangerScore * w.cliffhanger +
    scores.pacingScore * w.pacing +
    scores.emotionScore * w.emotion +
    scores.dialogueScore * w.dialogue +
    scores.readabilityScore * w.readability
  );
}

// Maps beat quality (0-100) to a per-beat survival probability (0.80-0.99).
// Even a perfect beat has some baseline attrition; a terrible beat can lose
// ~1 in 5 listeners on the spot.
export function survivalRateFromQuality(quality: number): number {
  const clamped = Math.max(0, Math.min(100, quality));
  return 0.8 + (clamped / 100) * 0.19;
}

export function riskFromSurvival(survivalRate: number): DropoffRisk {
  if (survivalRate >= 0.97) return "low";
  if (survivalRate >= 0.92) return "medium";
  if (survivalRate >= 0.85) return "high";
  return "critical";
}

/**
 * Local retention predictor: a transparent, tunable formula standing in for
 * the Databricks MLflow model in production. Retention compounds beat over
 * beat (you can't win back a listener you already lost), which is what
 * produces the realistic monotonically-decaying heatmap curve.
 */
export function computeLocalRetention(inputs: RetentionInput[]): RetentionResult[] {
  let cumulative = 100;
  return inputs.map(({ scores, isFinalBeat }) => {
    const beatQuality = scoreBeatQuality(scores, isFinalBeat);
    const survivalRate = survivalRateFromQuality(beatQuality);
    cumulative = cumulative * survivalRate;
    return {
      beatQuality,
      survivalRate,
      retentionScore: cumulative,
      dropoffRisk: riskFromSurvival(survivalRate),
      modelSource: "local",
    };
  });
}
