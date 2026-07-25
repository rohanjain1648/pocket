import { NextRequest, NextResponse } from "next/server";
import { adapterAgent, createSeriesFromAdaptation } from "@/lib/agents/adapter";
import { classifyContent } from "@/lib/safety/moderation";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { sourceText, sourceRef, targetEpisodes } = (await req.json()) as {
    sourceText: string;
    sourceRef?: string;
    targetEpisodes?: number;
  };

  if (!sourceText || sourceText.trim().length < 200) {
    return NextResponse.json({ ok: false, error: "sourceText must be at least 200 characters" }, { status: 400 });
  }

  const moderation = await classifyContent(sourceText);
  if (moderation.blocked) {
    return NextResponse.json({
      ok: false,
      blocked: true,
      reason: "This source material can't be produced — please refrain from self-harm, sexually explicit, or other disallowed content.",
      categories: moderation.categories.filter((c) => c.violated).map((c) => c.name),
    });
  }

  try {
    const result = await adapterAgent(sourceText, targetEpisodes ?? 3);
    const seriesId = await createSeriesFromAdaptation(result, sourceRef ?? "pasted-text");
    const firstEpisode = await db.episode.findFirst({ where: { seriesId }, orderBy: { number: "asc" }, select: { id: true } });
    return NextResponse.json({ ok: true, seriesId, firstEpisodeId: firstEpisode?.id ?? null });
  } catch (err) {
    console.error("[api/series/adapt]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Adaptation failed" }, { status: 500 });
  }
}
