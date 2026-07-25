import { NextRequest, NextResponse } from "next/server";
import { writersRoomForBeat, type WritersRoomContext } from "@/lib/agents/writers-room";

export async function POST(req: NextRequest) {
  const { text, context } = (await req.json()) as { text: string; context: WritersRoomContext };

  if (!text || !context) {
    return NextResponse.json({ ok: false, error: "text and context are required" }, { status: 400 });
  }

  try {
    const result = await writersRoomForBeat(text, context);
    return NextResponse.json({ ok: true, voices: result.voices });
  } catch (err) {
    console.error("[api/beats/writers-room]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Writers Room failed" }, { status: 500 });
  }
}
