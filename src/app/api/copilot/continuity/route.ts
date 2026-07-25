import { NextRequest, NextResponse } from "next/server";
import { continuityRadar } from "@/lib/agents/continuity-radar";

export async function POST(req: NextRequest) {
  const { seriesId, beatText } = (await req.json()) as { seriesId: string; beatText: string };
  if (!seriesId) {
    return NextResponse.json({ ok: false, error: "seriesId is required" }, { status: 400 });
  }
  try {
    const result = await continuityRadar(seriesId, beatText);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[api/copilot/continuity]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Continuity Radar failed" }, { status: 500 });
  }
}
