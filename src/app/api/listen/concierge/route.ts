import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoListener } from "@/lib/listener";
import { planWeekend } from "@/lib/agents/concierge";

export async function POST(req: NextRequest) {
  const { mood, hoursAvailable } = (await req.json()) as { mood: string; hoursAvailable: number };
  if (!mood || !mood.trim()) {
    return NextResponse.json({ ok: false, error: "mood is required" }, { status: 400 });
  }

  try {
    const listener = await getDemoListener();

    const [episodes, sessions] = await Promise.all([
      db.episode.findMany({
        include: { series: true, moodProfile: true, audioRenders: { where: { status: "ready" }, take: 1 } },
      }),
      db.listeningSession.findMany({
        where: { listenerId: listener.id },
        include: { episode: { include: { series: true } } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    const playable = episodes.filter((e) => e.audioRenders.length > 0);
    const catalog = playable.map((e) => ({
      id: e.id,
      seriesTitle: e.series.title,
      seriesGenre: e.series.genre,
      episodeTitle: e.title,
      synopsis: e.series.synopsis,
      moodSummary: e.moodProfile?.moodSummary ?? null,
    }));

    const historySummary = sessions
      .map((s) => `${s.episode.title} (${s.episode.series.genre}${s.completed ? ", finished" : ""})`)
      .join("; ");

    const plan = await planWeekend(mood, hoursAvailable || 4, catalog, historySummary);

    await Promise.all(
      plan.slots.map((s) =>
        db.recommendationLog.create({
          data: { listenerId: listener.id, episodeId: s.episodeId, surface: "concierge", reason: s.reason, confidence: 0.7 },
        })
      )
    );

    const byId = new Map(catalog.map((c) => [c.id, c]));
    const enriched = plan.slots.map((s) => ({ ...s, episode: byId.get(s.episodeId) ?? null }));

    return NextResponse.json({ ok: true, planTitle: plan.planTitle, slots: enriched });
  } catch (err) {
    console.error("[api/listen/concierge]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Concierge planning failed" }, { status: 500 });
  }
}
