import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { marketingDirectorForEpisode } from "@/lib/agents/marketing-director";

function serialize(plan: {
  hooks: string;
  hashtags: string;
  clipBeatId: string | null;
  clipRationale: string | null;
  thumbnailMood: string;
  targetAudience: string;
}) {
  return {
    hooks: JSON.parse(plan.hooks) as string[],
    hashtags: JSON.parse(plan.hashtags) as string[],
    clipBeatId: plan.clipBeatId,
    clipRationale: plan.clipRationale,
    thumbnailMood: plan.thumbnailMood,
    targetAudience: plan.targetAudience,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: episodeId } = await params;
  const plan = await db.marketingPlan.findUnique({ where: { episodeId } });
  return NextResponse.json({ ok: true, plan: plan ? serialize(plan) : null });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: episodeId } = await params;
  try {
    const episode = await db.episode.findUniqueOrThrow({
      where: { id: episodeId },
      include: { series: true, beats: { orderBy: { order: "asc" }, include: { analysis: true } } },
    });

    const beats = episode.beats
      .filter((b) => b.analysis)
      .map((b) => ({
        id: b.id,
        order: b.order,
        text: b.text,
        cliffhangerScore: b.analysis!.cliffhangerScore,
        emotionLabel: b.analysis!.emotionLabel,
      }));

    const result = await marketingDirectorForEpisode(episode.series.title, episode.series.genre, episode.title, beats);

    const saved = await db.marketingPlan.upsert({
      where: { episodeId },
      create: {
        episodeId,
        hooks: JSON.stringify(result.hooks),
        hashtags: JSON.stringify(result.hashtags),
        clipBeatId: result.clipBeatId,
        clipRationale: result.clipRationale,
        thumbnailMood: result.thumbnailMood,
        targetAudience: result.targetAudience,
      },
      update: {
        hooks: JSON.stringify(result.hooks),
        hashtags: JSON.stringify(result.hashtags),
        clipBeatId: result.clipBeatId,
        clipRationale: result.clipRationale,
        thumbnailMood: result.thumbnailMood,
        targetAudience: result.targetAudience,
      },
    });

    return NextResponse.json({ ok: true, plan: serialize(saved) });
  } catch (err) {
    console.error("[api/episodes/marketing]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Marketing Director failed" }, { status: 500 });
  }
}
