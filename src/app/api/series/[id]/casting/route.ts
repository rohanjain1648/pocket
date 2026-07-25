import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TTS_VOICES } from "@/lib/llm/groq";
import { hasElevenLabs, fetchElevenLabsVoices } from "@/lib/llm/elevenlabs";
import { decodeVoicePref } from "@/lib/voice-pref";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: seriesId } = await params;
  try {
    const characters = await db.character.findMany({ where: { seriesId }, orderBy: { name: "asc" } });
    const elevenLabsVoices = hasElevenLabs() ? await fetchElevenLabsVoices() : [];

    return NextResponse.json({
      ok: true,
      characters: characters.map((c) => ({ id: c.id, name: c.name, description: c.description, preferredVoice: c.preferredVoice })),
      groqVoices: TTS_VOICES,
      elevenLabsVoices,
    });
  } catch (err) {
    console.error("[api/casting GET]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Failed to load casting" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: seriesId } = await params;
  const { characterId, voice } = (await req.json()) as { characterId: string; voice: string | null };

  if (!characterId) {
    return NextResponse.json({ ok: false, error: "characterId is required" }, { status: 400 });
  }

  if (voice !== null) {
    const decoded = decodeVoicePref(voice);
    if (decoded.provider === "groq" && !(TTS_VOICES as readonly string[]).includes(decoded.voiceId)) {
      return NextResponse.json({ ok: false, error: "invalid Groq voice" }, { status: 400 });
    }
    if (decoded.provider === "elevenlabs") {
      if (!hasElevenLabs()) {
        return NextResponse.json({ ok: false, error: "ElevenLabs is not configured" }, { status: 400 });
      }
      const pool = await fetchElevenLabsVoices();
      if (!pool.some((v) => v.id === decoded.voiceId)) {
        return NextResponse.json({ ok: false, error: "invalid ElevenLabs voice" }, { status: 400 });
      }
    }
  }

  try {
    await db.character.updateMany({ where: { id: characterId, seriesId }, data: { preferredVoice: voice } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/casting PATCH]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Failed to update casting" }, { status: 500 });
  }
}
