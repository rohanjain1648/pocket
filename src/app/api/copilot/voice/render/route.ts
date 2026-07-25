import { NextRequest, NextResponse } from "next/server";
import { renderDeliveryPreview } from "@/lib/agents/voice-director";
import { TTS_VOICES, type OrpheusVoice } from "@/lib/llm/groq";

export async function POST(req: NextRequest) {
  const { styledText, voice } = (await req.json()) as { styledText: string; voice: string };
  if (!styledText) {
    return NextResponse.json({ ok: false, error: "styledText is required" }, { status: 400 });
  }
  const safeVoice: OrpheusVoice = (TTS_VOICES as readonly string[]).includes(voice) ? (voice as OrpheusVoice) : "hannah";
  try {
    const audioUrl = await renderDeliveryPreview(styledText, safeVoice);
    return NextResponse.json({ ok: true, audioUrl });
  } catch (err) {
    console.error("[api/copilot/voice/render]", err);
    // Surface the real provider message (e.g. Orpheus model-terms-required)
    // so the UI can tell the writer exactly what to do.
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Preview render failed" }, { status: 500 });
  }
}
