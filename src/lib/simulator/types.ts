import type { SpecialistScores } from "@/lib/retention/types";

export interface SimulatorBeatInput {
  id: string;
  order: number;
  scores: SpecialistScores;
  isFinalBeat: boolean;
}

export interface BeatDropoff {
  beatId: string;
  order: number;
  droppedHere: number; // count of simulated listeners whose journey ended at this beat
  stillListening: number; // count who survived past this beat
}

export interface PersonaBreakdown {
  personaId: string;
  label: string;
  color: string;
  count: number; // how many of the N simulated listeners were assigned this persona
  completionRate: number; // 0-100, % of that persona's listeners who reached the final beat
}

export interface AudienceSimulationResult {
  totalListeners: number;
  completionRate: number; // 0-100, % who reached the final beat
  bingeRate: number; // 0-100, % of ALL simulated listeners who both finished AND rolled to continue to the next episode
  dropoffByBeat: BeatDropoff[];
  personaBreakdown: PersonaBreakdown[];
  modelSource: "local" | "databricks";
}
