import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bibleBuilderAgent } from "@/lib/agents/bible-builder";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: episodeId } = await params;
  try {
    const episode = await db.episode.findUniqueOrThrow({ where: { id: episodeId } });
    await bibleBuilderAgent(episode.seriesId, episode.number, episode.rawScript);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/build-bible]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Bible build failed" }, { status: 500 });
  }
}
