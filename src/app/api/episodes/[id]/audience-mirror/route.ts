import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeAllPersonas, PERSONAS } from "@/lib/agents/audience-mirror";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: episodeId } = await params;

  try {
    const episode = await db.episode.findUniqueOrThrow({
      where: { id: episodeId },
      include: { beats: { orderBy: { order: "asc" }, include: { analysis: true } } },
    });

    const analyzed = episode.beats.filter((b) => b.analysis);
    if (analyzed.length === 0) {
      return NextResponse.json({ ok: false, error: "Run Analyze Episode first — Audience Mirror needs beat scores." }, { status: 400 });
    }

    const lastOrder = episode.beats[episode.beats.length - 1].order;
    const beatInputs = analyzed.map((b) => ({
      id: b.id,
      text: b.text,
      isFinalBeat: b.order === lastOrder,
      scores: {
        cliffhangerScore: b.analysis!.cliffhangerScore,
        pacingScore: b.analysis!.pacingScore,
        emotionScore: b.analysis!.emotionScore,
        dialogueScore: b.analysis!.dialogueScore,
        readabilityScore: b.analysis!.readabilityScore,
      },
    }));

    const results = await computeAllPersonas(beatInputs);
    return NextResponse.json({ ok: true, personas: PERSONAS.map((p) => ({ id: p.id, label: p.label, description: p.description, color: p.color })), results });
  } catch (err) {
    console.error("[api/audience-mirror]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Audience Mirror failed" }, { status: 500 });
  }
}
