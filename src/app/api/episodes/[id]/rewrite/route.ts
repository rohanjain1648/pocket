import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { editorAgent } from "@/lib/agents/editor";
import { analyzeEpisode } from "@/lib/agents/orchestrator";
import type { Finding } from "@/lib/agents/orchestrator";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: episodeId } = await params;
  const { beatId } = (await req.json()) as { beatId: string };

  if (!beatId) {
    return NextResponse.json({ ok: false, error: "beatId is required" }, { status: 400 });
  }

  try {
    const beat = await db.beat.findUniqueOrThrow({ where: { id: beatId }, include: { analysis: true } });
    const findings: Finding[] = beat.analysis ? JSON.parse(beat.analysis.findings) : [];

    const { rewrittenText, rationale } = await editorAgent(beat.text, findings);

    await db.beat.update({ where: { id: beatId }, data: { text: rewrittenText } });

    // Retention compounds across beats, so a rewrite can shift every
    // downstream beat's score too — re-run the whole episode, not just this beat.
    await analyzeEpisode(episodeId);

    await db.analysis.update({ where: { beatId }, data: { suggestedFix: rationale } });

    return NextResponse.json({ ok: true, rationale });
  } catch (err) {
    console.error("[api/rewrite]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Rewrite failed" }, { status: 500 });
  }
}
