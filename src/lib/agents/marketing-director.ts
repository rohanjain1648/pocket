import { resilientJSONOrDefault } from "@/lib/llm/resilient";

export interface MarketingPlanResult {
  hooks: string[];
  hashtags: string[];
  clipBeatId: string | null;
  clipRationale: string;
  thumbnailMood: string;
  targetAudience: string;
}

export interface MarketingBeatInput {
  id: string;
  order: number;
  text: string;
  cliffhangerScore: number;
  emotionLabel: string;
}

interface MarketingLLMResult {
  hooks: string[];
  hashtags: string[];
  clipRationale: string;
  thumbnailMood: string;
  targetAudience: string;
}

/**
 * Marketing Director — the last leg of the AI Producer pillar (voice casting
 * and sound design are handled elsewhere; this owns marketing strategy).
 * The promo clip is picked by the REAL computed cliffhanger score rather
 * than asked of the LLM as a guess, so "which beat sells this episode" is
 * grounded in the same retention math driving the rest of the app; the LLM
 * only writes the campaign copy around that objectively-chosen beat.
 */
export async function marketingDirectorForEpisode(
  seriesTitle: string,
  seriesGenre: string,
  episodeTitle: string,
  beats: MarketingBeatInput[]
): Promise<MarketingPlanResult> {
  if (beats.length === 0) {
    throw new Error("Episode has no analyzed beats yet — run Analyze first.");
  }

  const bestBeat = beats.reduce((best, b) => (b.cliffhangerScore > best.cliffhangerScore ? b : best), beats[0]);

  const beatsBlock = beats
    .map((b) => `BEAT ${b.order + 1} (id="${b.id}", cliffhanger=${b.cliffhangerScore.toFixed(0)}, emotion=${b.emotionLabel}):\n${b.text}`)
    .join("\n\n");

  const system = `You are the Marketing Director for a serialized audio drama app — part of the AI Producer role. Given an episode's beats (each with a computed cliffhanger score and emotion label) and the strongest-hook beat already selected for the promo clip, write a marketing plan. Respond ONLY with JSON: { "hooks": string[] (3-5 short punchy social teaser lines, no hashtags inside them), "hashtags": string[] (5-8 lowercase tags, no # symbol), "clipRationale": string (max 25 words, why the selected beat makes the best 30-second clip), "thumbnailMood": string (max 8 words, visual mood/description for a cover thumbnail), "targetAudience": string (max 15 words, who this episode is for) }.`;

  const user = `SERIES: ${seriesTitle} (${seriesGenre})\nEPISODE: ${episodeTitle}\n\nBEATS:\n${beatsBlock}\n\nSELECTED CLIP BEAT: BEAT ${bestBeat.order + 1} (id="${bestBeat.id}")`;

  // Clip selection is already objective math (bestBeat, above) — only the
  // copywriting needs an LLM, so on total provider failure this still
  // returns a usable (if generic) plan instead of erroring the whole panel.
  const parsed = await resilientJSONOrDefault<MarketingLLMResult>(system, user, {
    hooks: [`Episode ${episodeTitle} just dropped.`],
    hashtags: [seriesGenre.toLowerCase().replace(/\s+/g, ""), "audiodrama"],
    clipRationale: "Highest-scoring cliffhanger beat in this episode.",
    thumbnailMood: bestBeat.emotionLabel,
    targetAudience: `Fans of ${seriesGenre}`,
  });

  return {
    hooks: parsed.hooks ?? [],
    hashtags: parsed.hashtags ?? [],
    clipBeatId: bestBeat.id,
    clipRationale: parsed.clipRationale ?? "",
    thumbnailMood: parsed.thumbnailMood ?? "",
    targetAudience: parsed.targetAudience ?? "",
  };
}
