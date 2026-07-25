import { NextRequest, NextResponse } from "next/server";
import { suggestDeliveries } from "@/lib/agents/voice-director";

export async function POST(req: NextRequest) {
  const { beatText, speaker } = (await req.json()) as { beatText: string; speaker: string | null };
  if (!beatText || beatText.trim().length < 3) {
    return NextResponse.json({ ok: false, error: "beatText is required" }, { status: 400 });
  }
  try {
    const result = await suggestDeliveries(beatText, speaker ?? null);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[api/copilot/voice]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Voice-Director failed" }, { status: 500 });
  }
}
