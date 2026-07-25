import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tagAmbience } from "@/lib/agents/sound-world";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: episodeId } = await params;
  try {
    const episode = await db.episode.findUniqueOrThrow({
      where: { id: episodeId },
      include: { beats: { orderBy: { order: "asc" } } },
    });
    const tags = await tagAmbience(episode.beats.map((b) => ({ id: b.id, text: b.text })));
    return NextResponse.json({ ok: true, tags });
  } catch (err) {
    console.error("[api/soundscape]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Soundscape tagging failed" }, { status: 500 });
  }
}
