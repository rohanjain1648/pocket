import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { directBeat, type DirectorParams } from "@/lib/agents/director";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: beatId } = await params;
  const { text, directorParams, apply } = (await req.json()) as {
    text: string;
    directorParams: DirectorParams;
    apply?: boolean;
  };

  if (!text || !directorParams) {
    return NextResponse.json({ ok: false, error: "text and directorParams are required" }, { status: 400 });
  }

  try {
    const result = await directBeat(text, directorParams);

    if (apply) {
      await db.$transaction([
        db.analysis.deleteMany({ where: { beatId } }),
        db.beat.update({ where: { id: beatId }, data: { text: result.rewrittenText } }),
      ]);
    }

    return NextResponse.json({ ok: true, rewrittenText: result.rewrittenText });
  } catch (err) {
    console.error("[api/beats/direct]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Director rewrite failed" }, { status: 500 });
  }
}
