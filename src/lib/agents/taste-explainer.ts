import { resilientJSONOrDefault } from "@/lib/llm/resilient";

export interface ListeningHistoryItem {
  seriesTitle: string;
  seriesGenre: string;
  episodeTitle: string;
  progress: number;
  completed: boolean;
}

export interface CandidateEpisode {
  seriesTitle: string;
  seriesGenre: string;
  episodeTitle: string;
  synopsis: string;
  moodSummary: string | null;
}

export interface TasteExplanation {
  explanation: string;
  confidence: number; // 0-1
}

/**
 * "Explain Why I'll Love This" — grounded in the listener's REAL persisted
 * ListeningSession rows, not a generic "because you like drama" template.
 * With no history yet, says so honestly rather than inventing a rationale;
 * a cold-start user gets a synopsis-based reason and a low confidence
 * score instead of a fabricated personalization claim.
 */
export async function explainWhyYoullLoveThis(
  history: ListeningHistoryItem[],
  candidate: CandidateEpisode
): Promise<TasteExplanation> {
  if (history.length === 0) {
    const system = `You are a taste-explanation engine for an audio drama app. This listener has no listening history yet. Write one honest sentence recommending the given episode based only on its synopsis/mood — do not claim personalization you don't have. Respond ONLY with JSON: { "explanation": string (max 30 words), "confidence": number (0-0.4, since there's no history to ground this in) }.`;
    const user = `CANDIDATE: ${candidate.episodeTitle} — ${candidate.seriesTitle} (${candidate.seriesGenre})\nSYNOPSIS: ${candidate.synopsis}\n${candidate.moodSummary ? `MOOD: ${candidate.moodSummary}` : ""}`;
    return resilientJSONOrDefault<TasteExplanation>(system, user, {
      explanation: `A ${candidate.seriesGenre.toLowerCase()} pick worth trying: ${candidate.synopsis.slice(0, 80)}`,
      confidence: 0.2,
    });
  }

  const historyBlock = history
    .map((h) => `- ${h.episodeTitle} (${h.seriesTitle}, ${h.seriesGenre}) — ${h.completed ? "finished" : `${Math.round(h.progress * 100)}% in`}`)
    .join("\n");

  const system = `You are a taste-explanation engine for an audio drama app. Explain why THIS specific listener, based on their real listening history below, will likely love the candidate episode. Reference specific past titles or genres from their history — be concrete, not generic. If the candidate doesn't clearly connect to their history, say so honestly with lower confidence rather than forcing a connection. Respond ONLY with JSON: { "explanation": string (max 35 words, first sentence should reference their actual history), "confidence": number (0-1) }.`;
  const user = `LISTENING HISTORY:\n${historyBlock}\n\nCANDIDATE: ${candidate.episodeTitle} — ${candidate.seriesTitle} (${candidate.seriesGenre})\nSYNOPSIS: ${candidate.synopsis}\n${candidate.moodSummary ? `MOOD: ${candidate.moodSummary}` : ""}`;

  const mostRecent = history[0];
  return resilientJSONOrDefault<TasteExplanation>(system, user, {
    explanation: `Given your time with ${mostRecent.episodeTitle}, this ${candidate.seriesGenre.toLowerCase()} episode is a natural next listen.`,
    confidence: 0.35,
  });
}
