import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transformBeatGenre, type TargetGenre } from "@/lib/agents/genre-transformer";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: beatId } = await params;
  const variants = await db.genreVariant.findMany({ where: { beatId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    ok: true,
    variants: variants.map((v) => ({ genre: v.genre, text: v.text, warnings: JSON.parse(v.warnings) as string[] })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: beatId } = await params;
  const { genre } = (await req.json()) as { genre: TargetGenre };

  if (!genre) {
    return NextResponse.json({ ok: false, error: "genre is required" }, { status: 400 });
  }

  try {
    const beat = await db.beat.findUniqueOrThrow({ where: { id: beatId } });
    const result = await transformBeatGenre(beat.text, genre, beat.speaker);

    const saved = await db.genreVariant.upsert({
      where: { beatId_genre: { beatId, genre } },
      create: { beatId, genre, text: result.rewrittenText, warnings: JSON.stringify(result.warnings) },
      update: { text: result.rewrittenText, warnings: JSON.stringify(result.warnings) },
    });

    return NextResponse.json({ ok: true, text: saved.text, warnings: JSON.parse(saved.warnings) as string[] });
  } catch (err) {
    console.error("[api/beats/genre]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Genre transform failed" }, { status: 500 });
  }
}
