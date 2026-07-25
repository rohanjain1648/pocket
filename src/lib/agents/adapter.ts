import { resilientJSON } from "@/lib/llm/resilient";
import { db } from "@/lib/db";

interface AdaptedBeat {
  text: string;
  speaker: string | null;
}

interface AdaptedEpisode {
  number: number;
  title: string;
  beats: AdaptedBeat[];
}

export interface AdaptationResult {
  title: string;
  genre: string;
  synopsis: string;
  episodes: AdaptedEpisode[];
}

const MAX_SOURCE_CHARS = 15000;

/**
 * Adapter Agent — the "Generate" pillar. Takes raw source material (a
 * public-domain novel excerpt, an article, any long-form text) and
 * serializes it into a cliffhanger-optimized episodic script: each episode
 * ends on unresolved tension, and content is pre-chunked into beats so it
 * flows straight into the same analysis/rewrite/audio pipeline as an
 * originally-authored script.
 *
 * Tries Groq first, Gemini second — Gemini's free tier caps at 20
 * generateContent requests/day/model, which the Consistency agent alone
 * can exhaust; Groq's per-minute token limit recovers in under a minute.
 */
export async function adapterAgent(sourceText: string, targetEpisodes = 3): Promise<AdaptationResult> {
  const system = `You are the Adapter Agent in a serialized audio drama production pipeline. Convert the given source material into a serialized audio drama script broken into exactly ${targetEpisodes} episodes. Split each episode into beats: short scene or dialogue chunks (1-3 sentences each). Tag each beat's "speaker" with the character name if it's dialogue, or null if it's narration. End every episode on a strong, unresolved cliffhanger — that is the moment that drives a listener to unlock the next episode. Preserve the source's plot and characters faithfully; adapt only the form (prose to audio-drama beats), not the content. Respond ONLY with JSON: { "title": string, "genre": string, "synopsis": string, "episodes": [{ "number": number, "title": string, "beats": [{ "text": string, "speaker": string|null }] }] }.`;

  const user = `SOURCE MATERIAL:\n${sourceText.slice(0, MAX_SOURCE_CHARS)}`;

  return normalizeAdaptation(await resilientJSON<AdaptationResult>(system, user));
}

/**
 * LLM JSON output is structurally unreliable at the edges — an episode can
 * come back without its `beats` array, or with a beat that has no text, and
 * the persistence step below would then blow up on `ep.beats.map` with an
 * opaque "Cannot read properties of undefined" that surfaces to the user as
 * a generic red error. Coerce to a known-good shape here so a partially
 * malformed response still produces a usable pilot instead of a hard failure.
 */
function normalizeAdaptation(raw: AdaptationResult): AdaptationResult {
  const episodes = (Array.isArray(raw?.episodes) ? raw.episodes : [])
    .map((ep, i) => ({
      number: typeof ep?.number === "number" ? ep.number : i + 1,
      title: ep?.title?.trim() || `Episode ${i + 1}`,
      beats: (Array.isArray(ep?.beats) ? ep.beats : [])
        .filter((b) => typeof b?.text === "string" && b.text.trim().length > 0)
        .map((b) => ({ text: b.text.trim(), speaker: b.speaker?.trim() || null })),
    }))
    .filter((ep) => ep.beats.length > 0);

  if (episodes.length === 0) {
    throw new Error("Adaptation produced no usable episodes — try a longer or more narrative source text.");
  }

  return {
    title: raw?.title?.trim() || "Untitled Series",
    genre: raw?.genre?.trim() || "Drama",
    synopsis: raw?.synopsis?.trim() || "",
    episodes,
  };
}

/**
 * Persists an AdaptationResult as a new Series with its Episodes and Beats,
 * ready for the same analyze/rewrite/render flow as any other series.
 */
export async function createSeriesFromAdaptation(result: AdaptationResult, sourceRef: string): Promise<string> {
  const series = await db.series.create({
    data: {
      title: result.title,
      genre: result.genre,
      synopsis: result.synopsis,
      sourceType: "adapted",
      sourceRef,
    },
  });

  for (const ep of result.episodes) {
    await db.episode.create({
      data: {
        seriesId: series.id,
        number: ep.number,
        title: ep.title,
        rawScript: ep.beats.map((b) => (b.speaker ? `${b.speaker}: ${b.text}` : b.text)).join("\n\n"),
        beats: {
          create: ep.beats.map((b, i) => ({ order: i, text: b.text, speaker: b.speaker })),
        },
      },
    });
  }

  return series.id;
}
