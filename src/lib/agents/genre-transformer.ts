import { resilientJSONOrDefault } from "@/lib/llm/resilient";

export type TargetGenre = "horror" | "romance" | "comedy" | "thriller" | "anime";

export const TARGET_GENRES: { id: TargetGenre; label: string; description: string }[] = [
  { id: "horror", label: "Horror", description: "Dread, isolation, the wrongness under the surface" },
  { id: "romance", label: "Romance", description: "Longing, intimacy, the ache of almost" },
  { id: "comedy", label: "Comedy", description: "Timing, absurdity, characters undercutting themselves" },
  { id: "thriller", label: "Thriller", description: "Urgency, stakes, the clock always running" },
  { id: "anime", label: "Anime", description: "Heightened emotion, internal monologue, dramatic declarations" },
];

export interface GenreTransformResult {
  rewrittenText: string;
  warnings: string[];
}

const schemaNote = `Respond ONLY with JSON: { "rewrittenText": string, "warnings": string[] (plot elements from the original that fit this genre poorly or had to be reframed — empty array if none) }.`;

/**
 * Genre Transform Engine — rewrites a beat into a target genre while
 * preserving the core plot events (who does what, what changes as a
 * result). The genre is a lens on tone, imagery, and emphasis, not a
 * license to change what happens — that distinction is what keeps this
 * useful for auditioning a story rather than just generating fan fiction.
 * The result is stored ALONGSIDE the original (GenreVariant), never
 * overwriting it, so a writer can compare and revert.
 */
export async function transformBeatGenre(beatText: string, genre: TargetGenre, speaker: string | null): Promise<GenreTransformResult> {
  const meta = TARGET_GENRES.find((g) => g.id === genre);
  const system = `You are the Genre Transform Engine in a serialized audio drama writing tool. Rewrite the given beat in the ${genre.toUpperCase()} genre (${meta?.description ?? ""}), while preserving the exact same plot events, character actions, and outcome — only tone, word choice, imagery, and emphasis should change to fit the genre. This is audio-only content — write for the ear, not the page. If some part of the original beat genuinely resists this genre (e.g. a comedic beat has no natural horror angle), still produce the best-effort rewrite and note it as a warning rather than inventing new plot. ${schemaNote}`;
  const user = `${speaker ? `SPEAKER: ${speaker}\n` : ""}BEAT:\n${beatText}`;

  // Groq first, Gemini fallback; if both fail, return the original text
  // flagged with a warning rather than throwing, so auditioning a genre
  // never blocks on a single failed provider.
  return resilientJSONOrDefault<GenreTransformResult>(system, user, {
    rewrittenText: beatText,
    warnings: ["Genre transform unavailable right now — showing original text."],
  });
}
