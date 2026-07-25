import { NextRequest, NextResponse } from "next/server";
import { renderEpisodeAudio, type RequestedProvider } from "@/lib/agents/tts-director";
import { db } from "@/lib/db";

const VALID_PROVIDERS: RequestedProvider[] = ["auto", "groq", "elevenlabs"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const requested = body?.provider as RequestedProvider | undefined;
  const provider = requested && VALID_PROVIDERS.includes(requested) ? requested : "auto";

  try {
    const renderId = await renderEpisodeAudio(id, provider);
    const render = await db.audioRender.findUniqueOrThrow({ where: { id: renderId } });
    return NextResponse.json({
      ok: true,
      render: {
        id: render.id,
        status: render.status,
        audioUrl: render.audioUrl,
        provider: render.provider,
        voiceMap: JSON.parse(render.voiceMap) as Record<string, string>,
      },
    });
  } catch (err) {
    console.error("[api/render-audio]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Render failed" }, { status: 500 });
  }
}
