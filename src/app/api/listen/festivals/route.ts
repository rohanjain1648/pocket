import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { curateFestival } from "@/lib/agents/festival-curator";

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${Date.now().toString(36)}`;
}

export async function GET() {
  const festivals = await db.festival.findMany({
    orderBy: { createdAt: "desc" },
    include: { slots: { orderBy: { order: "asc" }, include: { episode: { include: { series: true } } } } },
  });
  return NextResponse.json({
    ok: true,
    festivals: festivals.map((f) => ({
      id: f.id,
      slug: f.slug,
      title: f.title,
      theme: f.theme,
      description: f.description,
      arc: f.arc,
      coverUrl: f.coverUrl,
      slots: f.slots.map((s) => ({
        order: s.order,
        note: s.note,
        episodeId: s.episodeId,
        episodeTitle: s.episode.title,
        seriesTitle: s.episode.series.title,
      })),
    })),
  });
}

export async function POST(req: NextRequest) {
  const { theme } = (await req.json().catch(() => ({}))) as { theme?: string };

  try {
    const episodes = await db.episode.findMany({
      include: { series: true, moodProfile: true, audioRenders: { where: { status: "ready" }, take: 1 } },
    });
    const playable = episodes.filter((e) => e.audioRenders.length > 0);
    const catalog = playable.map((e) => ({
      id: e.id,
      seriesTitle: e.series.title,
      seriesGenre: e.series.genre,
      episodeTitle: e.title,
      synopsis: e.series.synopsis,
      moodSummary: e.moodProfile?.moodSummary ?? null,
    }));

    const plan = await curateFestival(catalog, theme);

    const festival = await db.festival.create({
      data: {
        slug: slugify(plan.title),
        title: plan.title,
        theme: plan.theme,
        description: plan.description,
        arc: plan.arc,
        coverUrl: plan.coverUrl,
        personalized: false,
        slots: {
          create: plan.slots.map((s, i) => ({ episodeId: s.episodeId, order: i, note: s.note })),
        },
      },
      include: { slots: { include: { episode: { include: { series: true } } } } },
    });

    return NextResponse.json({
      ok: true,
      festival: {
        id: festival.id,
        slug: festival.slug,
        title: festival.title,
        theme: festival.theme,
        description: festival.description,
        arc: festival.arc,
        coverUrl: festival.coverUrl,
        slots: festival.slots.map((s) => ({
          order: s.order,
          note: s.note,
          episodeId: s.episodeId,
          episodeTitle: s.episode.title,
          seriesTitle: s.episode.series.title,
        })),
      },
    });
  } catch (err) {
    console.error("[api/listen/festivals]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Festival curation failed" }, { status: 500 });
  }
}
