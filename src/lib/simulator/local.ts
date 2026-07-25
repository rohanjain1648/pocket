import { survivalRateFromQuality } from "@/lib/retention/local";
import { bingeProbability } from "@/lib/retention";
import { PERSONAS, type Persona } from "@/lib/agents/audience-mirror";
import type { SimulatorBeatInput, AudienceSimulationResult, BeatDropoff, PersonaBreakdown } from "./types";

const N = 1000;

// Rough population mix across the four Audience Mirror personas — reused
// rather than re-invented, so the simulator and the persona-curve feature
// agree on who these listeners are, they just measure different things
// (expected-value curves vs. a stochastic population).
const POPULATION_SHARE: Record<string, number> = {
  general: 0.4,
  suspense: 0.25,
  romance: 0.2,
  commuter: 0.15,
};

function pickPersona(): Persona {
  const roll = Math.random();
  let acc = 0;
  for (const persona of PERSONAS) {
    acc += POPULATION_SHARE[persona.id] ?? 0;
    if (roll <= acc) return persona;
  }
  return PERSONAS[0];
}

function personaBeatQuality(scores: SimulatorBeatInput["scores"], w: Persona["weights"]): number {
  return (
    scores.cliffhangerScore * w.cliffhanger +
    scores.pacingScore * w.pacing +
    scores.emotionScore * w.emotion +
    scores.dialogueScore * w.dialogue +
    scores.readabilityScore * w.readability
  );
}

/**
 * Audience Simulator — Monte Carlo, not an analytic formula run once. Each
 * of the 1000 synthetic listeners is an independent trial: sample a persona
 * from the real population mix, walk the episode beat by beat, and at each
 * beat roll dice against that beat's survival probability (jittered per
 * listener, since real humans aren't identical). This produces genuine
 * variance in the aggregate — a distribution of where drop-off happens, not
 * just its expected value — which is what "thousands of AI users react
 * before release" means in practice at this scale.
 */
export function simulateAudienceLocal(beats: SimulatorBeatInput[]): AudienceSimulationResult {
  const dropCounts = new Array(beats.length).fill(0) as number[];
  let completed = 0;
  let binged = 0;
  const personaCounts = new Map<string, number>();
  const personaCompletions = new Map<string, number>();

  for (let listener = 0; listener < N; listener++) {
    const persona = pickPersona();
    personaCounts.set(persona.id, (personaCounts.get(persona.id) ?? 0) + 1);

    let reachedFinal = false;
    let finalCliffhanger = 0;

    for (let i = 0; i < beats.length; i++) {
      const beat = beats[i];
      const w = beat.isFinalBeat ? persona.finalBeatWeights : persona.weights;
      const quality = personaBeatQuality(beat.scores, w);
      // Per-listener jitter (+-10 quality points, uniform) models individual
      // variance — the same beat doesn't land identically for every human.
      const jittered = quality + (Math.random() - 0.5) * 20;
      const survivalRate = survivalRateFromQuality(jittered);

      if (Math.random() > survivalRate) {
        dropCounts[i]++;
        reachedFinal = false;
        break;
      }

      if (beat.isFinalBeat) {
        reachedFinal = true;
        finalCliffhanger = beat.scores.cliffhangerScore;
      }
    }

    if (reachedFinal) {
      completed++;
      personaCompletions.set(persona.id, (personaCompletions.get(persona.id) ?? 0) + 1);
      const continueChance = bingeProbability(100, finalCliffhanger) / 100;
      if (Math.random() < continueChance) binged++;
    }
  }

  let stillListening = N;
  const dropoffByBeat: BeatDropoff[] = beats.map((beat, i) => {
    const droppedHere = dropCounts[i];
    stillListening -= droppedHere;
    return { beatId: beat.id, order: beat.order, droppedHere, stillListening };
  });

  const personaBreakdown: PersonaBreakdown[] = PERSONAS.map((p) => {
    const count = personaCounts.get(p.id) ?? 0;
    const completions = personaCompletions.get(p.id) ?? 0;
    return {
      personaId: p.id,
      label: p.label,
      color: p.color,
      count,
      completionRate: count > 0 ? (completions / count) * 100 : 0,
    };
  });

  return {
    totalListeners: N,
    completionRate: (completed / N) * 100,
    bingeRate: (binged / N) * 100,
    dropoffByBeat,
    personaBreakdown,
    modelSource: "local",
  };
}
