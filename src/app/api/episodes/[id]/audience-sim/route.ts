import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { simulateAudience, type SimulatorBeatInput } from "@/lib/simulator";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: episodeId } = await params;

  try {
    const episode = await db.episode.findUniqueOrThrow({
      where: { id: episodeId },
      include: { beats: { orderBy: { order: "asc" }, include: { analysis: true } } },
    });

    const analyzed = episode.beats.filter((b) => b.analysis);
    if (analyzed.length === 0) {
      return NextResponse.json({ ok: false, error: "Run Analyze Episode first — Audience Simulator needs beat scores." }, { status: 400 });
    }

    const lastOrder = episode.beats[episode.beats.length - 1].order;
    const beatInputs: SimulatorBeatInput[] = analyzed.map((b) => ({
      id: b.id,
      order: b.order,
      isFinalBeat: b.order === lastOrder,
      scores: {
        cliffhangerScore: b.analysis!.cliffhangerScore,
        pacingScore: b.analysis!.pacingScore,
        emotionScore: b.analysis!.emotionScore,
        dialogueScore: b.analysis!.dialogueScore,
        readabilityScore: b.analysis!.readabilityScore,
      },
    }));

    const result = await simulateAudience(beatInputs);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[api/audience-sim]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Audience Simulator failed" }, { status: 500 });
  }
}
