import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoListener } from "@/lib/listener";
import { explainWhyYoullLoveThis } from "@/lib/agents/taste-explainer";

export async function POST(req: NextRequest) {
  const { episodeId } = (await req.json()) as { episodeId: string };
  if (!episodeId) {
    return NextResponse.json({ ok: false, error: "episodeId is required" }, { status: 400 });
  }

  try {
    const listener = await getDemoListener();

    const [sessions, candidate] = await Promise.all([
      db.listeningSession.findMany({
        where: { listenerId: listener.id },
        include: { episode: { include: { series: true } } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      db.episode.findUniqueOrThrow({ where: { id: episodeId }, include: { series: true, moodProfile: true } }),
    ]);

    const history = sessions
      .filter((s) => s.episodeId !== episodeId)
      .map((s) => ({
        seriesTitle: s.episode.series.title,
        seriesGenre: s.episode.series.genre,
        episodeTitle: s.episode.title,
        progress: s.progress,
        completed: s.completed,
      }));

    const result = await explainWhyYoullLoveThis(history, {
      seriesTitle: candidate.series.title,
      seriesGenre: candidate.series.genre,
      episodeTitle: candidate.title,
      synopsis: candidate.series.synopsis,
      moodSummary: candidate.moodProfile?.moodSummary ?? null,
    });

    await db.recommendationLog.create({
      data: {
        listenerId: listener.id,
        episodeId,
        surface: "why",
        reason: result.explanation,
        confidence: result.confidence,
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[api/listen/why]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Explanation failed" }, { status: 500 });
  }
}
