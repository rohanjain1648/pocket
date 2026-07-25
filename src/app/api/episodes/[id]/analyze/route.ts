import { NextRequest, NextResponse } from "next/server";
import { analyzeEpisode } from "@/lib/agents/orchestrator";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await analyzeEpisode(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/analyze]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Analysis failed" }, { status: 500 });
  }
}
