import { resilientJSONOrDefault } from "@/lib/llm/resilient";

export interface CrossMediaCandidate {
  mediaType: "book" | "film" | "music" | "podcast";
  title: string;
  creator: string;
  reason: string;
}

export interface CrossMediaLinkResult extends CrossMediaCandidate {
  coverUrl: string | null;
  externalUrl: string | null;
  verified: boolean;
}

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
}

/**
 * Cross-Media Discovery. The LLM proposes real, existing titles it actually
 * knows (not invented ones) that share the episode's emotional arc rather
 * than just its genre label. Book candidates are then checked against the
 * Open Library Search API — a real external lookup, not a static list — so
 * a matched cover/link is only shown when a real record exists; unmatched
 * suggestions are still shown but marked unverified rather than dropped,
 * since Open Library only covers books.
 */
export async function crossMediaForEpisode(
  seriesTitle: string,
  genre: string,
  synopsis: string,
  moodSummary: string | null
): Promise<CrossMediaLinkResult[]> {
  const system = `You recommend cross-media content (real, existing books, films, music albums, or podcasts — never invent titles) for someone who just listened to a serialized audio drama. Match the EMOTIONAL ARC and feeling, not just the genre label. Suggest exactly 4 items, at least one book. Respond ONLY with JSON: { "candidates": [{ "mediaType": "book"|"film"|"music"|"podcast", "title": string, "creator": string (author/director/artist/host), "reason": string (max 20 words, the shared emotional arc, not generic genre similarity) }] }.`;
  const user = `SERIES: ${seriesTitle} (${genre})\nSYNOPSIS: ${synopsis}\n${moodSummary ? `MOOD: ${moodSummary}\n` : ""}`;

  // Empty candidates on total provider failure — the panel just shows
  // "nothing found" rather than an error, and nothing downstream (Open
  // Library verification) has anything invalid to choke on.
  const { candidates } = await resilientJSONOrDefault<{ candidates: CrossMediaCandidate[] }>(system, user, { candidates: [] });

  return Promise.all(candidates.map(verifyCandidate));
}

async function verifyCandidate(candidate: CrossMediaCandidate): Promise<CrossMediaLinkResult> {
  if (candidate.mediaType !== "book") {
    return { ...candidate, coverUrl: null, externalUrl: null, verified: false };
  }

  try {
    const res = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(candidate.title)}&limit=1`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`Open Library returned ${res.status}`);
    const json = (await res.json()) as { docs: OpenLibraryDoc[] };
    const doc = json.docs?.[0];
    if (!doc) return { ...candidate, coverUrl: null, externalUrl: null, verified: false };

    return {
      ...candidate,
      title: doc.title,
      creator: doc.author_name?.[0] ?? candidate.creator,
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      externalUrl: `https://openlibrary.org${doc.key}`,
      verified: true,
    };
  } catch (err) {
    console.warn("[cross-media] Open Library lookup failed:", err instanceof Error ? err.message : err);
    return { ...candidate, coverUrl: null, externalUrl: null, verified: false };
  }
}
