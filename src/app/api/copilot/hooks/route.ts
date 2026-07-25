import { NextRequest, NextResponse } from "next/server";
import { hookCopilot } from "@/lib/agents/hook-copilot";

export async function POST(req: NextRequest) {
  const { beatText, isEpisodeEnding } = (await req.json()) as { beatText: string; isEpisodeEnding?: boolean };
  if (!beatText || beatText.trim().length < 8) {
    return NextResponse.json({ ok: true, result: { currentHookScore: 0, suggestions: [], predictedLift: 0 } });
  }
  try {
    const result = await hookCopilot(beatText, Boolean(isEpisodeEnding));
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[api/copilot/hooks]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Hook Copilot failed" }, { status: 500 });
  }
}
