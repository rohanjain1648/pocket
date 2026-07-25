import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { crossMediaForEpisode } from "@/lib/agents/cross-media";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: episodeId } = await params;
  const links = await db.crossMediaLink.findMany({ where: { episodeId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ok: true, links });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: episodeId } = await params;

  try {
    const episode = await db.episode.findUniqueOrThrow({
      where: { id: episodeId },
      include: { series: true, moodProfile: true },
    });

    const results = await crossMediaForEpisode(
      episode.series.title,
      episode.series.genre,
      episode.series.synopsis,
      episode.moodProfile?.moodSummary ?? null
    );

    await db.$transaction([
      db.crossMediaLink.deleteMany({ where: { episodeId } }),
      ...results.map((r) =>
        db.crossMediaLink.create({
          data: {
            episodeId,
            mediaType: r.mediaType,
            title: r.title,
            creator: r.creator,
            reason: r.reason,
            coverUrl: r.coverUrl,
            externalUrl: r.externalUrl,
            verified: r.verified,
          },
        })
      ),
    ]);

    const links = await db.crossMediaLink.findMany({ where: { episodeId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ ok: true, links });
  } catch (err) {
    console.error("[api/episodes/cross-media]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Cross-Media Discovery failed" }, { status: 500 });
  }
}
