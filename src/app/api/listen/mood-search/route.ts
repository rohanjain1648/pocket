import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildMoodProfile } from "@/lib/agents/mood-profiler";
import { embed, embedBatch, cosineSimilarity, hasOpenAI, EMBEDDING_MODEL } from "@/lib/llm/openai";

async function ensureMoodProfiles(): Promise<void> {
  const episodes = await db.episode.findMany({
    where: { moodProfile: null },
    include: { beats: { include: { analysis: true } } },
  });

  for (const episode of episodes) {
    const analyzed = episode.beats.filter((b) => b.analysis);
    if (analyzed.length === 0) continue;

    try {
      const profile = await buildMoodProfile(
        analyzed.map((b) => ({
          text: b.text,
          emotionLabel: b.analysis!.emotionLabel,
          scores: {
            cliffhangerScore: b.analysis!.cliffhangerScore,
            pacingScore: b.analysis!.pacingScore,
            emotionScore: b.analysis!.emotionScore,
            dialogueScore: b.analysis!.dialogueScore,
            readabilityScore: b.analysis!.readabilityScore,
          },
        }))
      );

      const vector = hasOpenAI() ? await embed(profile.moodSummary) : [];

      await db.episodeMoodProfile.upsert({
        where: { episodeId: episode.id },
        create: {
          episodeId: episode.id,
          moodSummary: profile.moodSummary,
          vector: JSON.stringify(vector),
          energy: profile.energy,
          tension: profile.tension,
          intimacy: profile.intimacy,
          warmth: profile.warmth,
        },
        update: {
          moodSummary: profile.moodSummary,
          vector: JSON.stringify(vector),
          energy: profile.energy,
          tension: profile.tension,
          intimacy: profile.intimacy,
          warmth: profile.warmth,
        },
      });
    } catch (err) {
      console.warn(`[mood-search] failed to profile episode ${episode.id}:`, err instanceof Error ? err.message : err);
    }
  }
}

export async function POST(req: NextRequest) {
  const { query } = (await req.json()) as { query: string };
  if (!query || !query.trim()) {
    return NextResponse.json({ ok: false, error: "query is required" }, { status: 400 });
  }
  if (!hasOpenAI()) {
    return NextResponse.json({ ok: false, error: "Mood Search requires OPENAI_API_KEY (for embeddings)." }, { status: 400 });
  }

  try {
    await ensureMoodProfiles();

    const profiles = await db.episodeMoodProfile.findMany({
      include: { episode: { include: { series: true } } },
    });

    const withVectors = profiles.filter((p) => p.vector && p.vector !== "[]");
    if (withVectors.length === 0) {
      return NextResponse.json({ ok: true, results: [] });
    }

    // Re-embed any profile stuck on a stale model (should be rare — mainly
    // covers a mid-demo provider swap).
    const stale = withVectors.filter((p) => p.model !== EMBEDDING_MODEL);
    if (stale.length > 0) {
      const vectors = await embedBatch(stale.map((p) => p.moodSummary));
      await Promise.all(
        stale.map((p, i) =>
          db.episodeMoodProfile.update({ where: { id: p.id }, data: { vector: JSON.stringify(vectors[i]), model: EMBEDDING_MODEL } })
        )
      );
      stale.forEach((p, i) => (p.vector = JSON.stringify(vectors[i])));
    }

    const queryVec = await embed(query);

    const ranked = withVectors
      .map((p) => ({
        episodeId: p.episodeId,
        seriesTitle: p.episode.series.title,
        episodeTitle: p.episode.title,
        episodeNumber: p.episode.number,
        moodSummary: p.moodSummary,
        energy: p.energy,
        tension: p.tension,
        intimacy: p.intimacy,
        warmth: p.warmth,
        similarity: cosineSimilarity(queryVec, JSON.parse(p.vector) as number[]),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 6);

    return NextResponse.json({ ok: true, results: ranked });
  } catch (err) {
    console.error("[api/listen/mood-search]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Mood Search failed" }, { status: 500 });
  }
}
