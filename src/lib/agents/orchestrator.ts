import { db } from "@/lib/db";
import { cliffhangerAgent, pacingAgent, emotionAgent, dialogueAgent, computeReadability } from "./specialists";
import { consistencyAgentForEpisode, type ConsistencyResult } from "./consistency";
import { plotHoleHunterForEpisode, type PlotHoleResult } from "./historian";
import { computeRetention, type SpecialistScores } from "@/lib/retention";

export interface Finding {
  agent: string;
  summary: string;
  severity: "low" | "medium" | "high";
}

function severityFromScore(score: number): Finding["severity"] {
  if (score < 40) return "high";
  if (score < 65) return "medium";
  return "low";
}

/**
 * Showrunner Orchestrator — fans out the specialist agents (Groq) and the
 * Consistency agent (Gemini + Story Bible RAG) across every beat of an
 * episode in parallel, folds the scores into the cumulative retention
 * curve, and persists one Analysis row per beat.
 *
 * This is the entry point the "Analyze" button in the Studio UI calls.
 */
export async function analyzeEpisode(episodeId: string): Promise<void> {
  const episode = await db.episode.findUniqueOrThrow({
    where: { id: episodeId },
    include: { beats: { orderBy: { order: "asc" } } },
  });

  // One Gemini call for the whole episode's consistency check (Gemini's
  // free tier caps at 20 generateContent requests/day/model — a per-beat
  // design would exhaust that in a single Analyze click), run alongside the
  // Historian's cross-episode Plot Hole Hunter pass (Groq, no daily cap).
  const [consistencyByBeat, plotHolesByBeat] = await Promise.all([
    consistencyAgentForEpisode(
      episode.seriesId,
      episode.beats.map((b) => ({ id: b.id, text: b.text }))
    ),
    plotHoleHunterForEpisode(episodeId),
  ]);

  const beatAgentResults = await Promise.all(
    episode.beats.map(async (beat) => {
      const isFinalBeat = beat.order === episode.beats[episode.beats.length - 1].order;

      const [cliffhanger, pacing, emotion, dialogue] = await Promise.all([
        cliffhangerAgent(beat.text, isFinalBeat),
        pacingAgent(beat.text),
        emotionAgent(beat.text),
        dialogueAgent(beat.text, beat.speaker),
      ]);
      const consistency: ConsistencyResult = consistencyByBeat.get(beat.id) ?? { flags: [], summary: "No consistency issues found." };
      const plotHoles: PlotHoleResult = plotHolesByBeat.get(beat.id) ?? { flags: [], summary: "No cross-episode contradictions found." };
      const allFlags = [...consistency.flags, ...plotHoles.flags];

      const readability = computeReadability(beat.text);

      const scores: SpecialistScores = {
        cliffhangerScore: cliffhanger.score,
        pacingScore: pacing.score,
        emotionScore: emotion.score,
        dialogueScore: dialogue.score,
        readabilityScore: readability,
      };

      const findings: Finding[] = [
        { agent: "Cliffhanger", summary: cliffhanger.summary, severity: severityFromScore(cliffhanger.score) },
        { agent: "Pacing", summary: pacing.summary, severity: severityFromScore(pacing.score) },
        { agent: "Emotion", summary: `${emotion.summary} (${emotion.label})`, severity: severityFromScore(emotion.score) },
        { agent: "Dialogue", summary: dialogue.summary, severity: severityFromScore(dialogue.score) },
        ...consistency.flags.map((f) => ({ agent: "Consistency", summary: `${f.message} [${f.relatedEntity}]`, severity: "high" as const })),
        ...plotHoles.flags.map((f) => ({ agent: "Plot Hole Hunter", summary: `${f.message} [${f.relatedEntity}]`, severity: "high" as const })),
      ];

      return { beat, isFinalBeat, scores, emotionLabel: emotion.label, consistency: { flags: allFlags, summary: consistency.summary }, findings };
    })
  );

  const retentionResults = await computeRetention(
    beatAgentResults.map((r) => ({ scores: r.scores, isFinalBeat: r.isFinalBeat }))
  );

  await db.$transaction(
    beatAgentResults.map((r, i) => {
      const retention = retentionResults[i];
      return db.analysis.upsert({
        where: { beatId: r.beat.id },
        create: {
          beatId: r.beat.id,
          retentionScore: retention.retentionScore,
          dropoffRisk: retention.dropoffRisk,
          cliffhangerScore: r.scores.cliffhangerScore,
          pacingScore: r.scores.pacingScore,
          emotionScore: r.scores.emotionScore,
          emotionLabel: r.emotionLabel,
          dialogueScore: r.scores.dialogueScore,
          readabilityScore: r.scores.readabilityScore,
          consistencyFlags: JSON.stringify(r.consistency.flags),
          findings: JSON.stringify(r.findings),
          modelSource: retention.modelSource,
        },
        update: {
          retentionScore: retention.retentionScore,
          dropoffRisk: retention.dropoffRisk,
          cliffhangerScore: r.scores.cliffhangerScore,
          pacingScore: r.scores.pacingScore,
          emotionScore: r.scores.emotionScore,
          emotionLabel: r.emotionLabel,
          dialogueScore: r.scores.dialogueScore,
          readabilityScore: r.scores.readabilityScore,
          consistencyFlags: JSON.stringify(r.consistency.flags),
          findings: JSON.stringify(r.findings),
          modelSource: retention.modelSource,
          suggestedFix: null,
        },
      });
    })
  );
}
