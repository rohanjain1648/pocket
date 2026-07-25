import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { groqSpeech, TTS_VOICES, type OrpheusVoice } from "@/lib/llm/groq";
import { hasElevenLabs, renderBeatsWithElevenLabs, fetchElevenLabsVoices, curatedVoiceIds } from "@/lib/llm/elevenlabs";
import { concatWav } from "@/lib/audio/wav";
import { decodeVoicePref } from "@/lib/voice-pref";

// Symbolic hints for the browser-TTS fallback (mapped to SpeechSynthesis
// voices client-side, since server has no audio engine without any key).
const LOCAL_VOICE_HINTS = ["narrator", "voice-a", "voice-b", "voice-c", "voice-d", "voice-e"];

export type Provider = "groq" | "elevenlabs" | "local";
export type RequestedProvider = Provider | "auto";

/**
 * Auto priority: Groq first (same key as the specialist agents, free,
 * already the tested default), then ElevenLabs if configured, then local
 * browser-TTS as the last resort so rendering never hard-fails. A caller
 * can still request a specific provider (Voice Casting Studio / the Studio
 * render button) — if that provider isn't configured, this silently falls
 * back to auto priority rather than erroring, so a bad/missing selection
 * never breaks the render.
 */
function resolveProvider(requested?: RequestedProvider): Provider {
  if (requested === "groq" && process.env.GROQ_API_KEY) return "groq";
  if (requested === "elevenlabs" && hasElevenLabs()) return "elevenlabs";

  if (process.env.GROQ_API_KEY) return "groq";
  if (hasElevenLabs()) return "elevenlabs";
  return "local";
}

/**
 * Resolves each speaker to a voice, honoring a per-character preference
 * ONLY when it's tagged for (or, for legacy untagged values, defaults to)
 * the CURRENT render's provider — a saved ElevenLabs pick is silently
 * ignored on a Groq render and vice versa, rather than crashing on a
 * cross-provider id that isn't in this pool. Anyone without a valid
 * preference for this provider gets auto-cast round-robin from the pool.
 */
export function castVoices(
  speakers: (string | null)[],
  pool: string[],
  preferences: Record<string, string> = {},
  provider: Provider = "groq"
): Record<string, string> {
  const uniqueSpeakers = Array.from(new Set(speakers.map((s) => s ?? "Narrator")));

  const map: Record<string, string> = {};
  let castIndex = 0;
  for (const speaker of uniqueSpeakers) {
    const raw = preferences[speaker];
    if (raw) {
      const decoded = decodeVoicePref(raw);
      if (decoded.provider === provider && pool.includes(decoded.voiceId)) {
        map[speaker] = decoded.voiceId;
        continue;
      }
    }
    if (speaker === "Narrator") {
      map[speaker] = pool[0];
    } else {
      map[speaker] = pool[(castIndex % Math.max(1, pool.length - 1)) + (pool.length > 1 ? 1 : 0)];
      castIndex++;
    }
  }
  return map;
}

async function renderWithGroq(
  episodeId: string,
  beats: { text: string; speaker: string | null }[],
  preferences: Record<string, string>
): Promise<{ voiceMap: Record<string, string>; audioUrl: string }> {
  const voiceMap = castVoices(beats.map((b) => b.speaker), [...TTS_VOICES], preferences, "groq");
  const buffers = await Promise.all(
    beats.map((beat) => groqSpeech(beat.text, voiceMap[beat.speaker ?? "Narrator"] as OrpheusVoice))
  );
  // Each beat is a standalone WAV file (Orpheus only supports "wav") — a
  // naive Buffer.concat would embed extra RIFF headers mid-stream and
  // corrupt playback past the first beat, so the chunks are demuxed and
  // remerged into one valid WAV.
  const combined = concatWav(buffers);
  const fileName = `${episodeId}-${Date.now()}.wav`;
  const dir = path.join(process.cwd(), "public", "audio");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), combined);
  return { voiceMap, audioUrl: `/audio/${fileName}` };
}

async function renderWithElevenLabs(
  episodeId: string,
  beats: { text: string; speaker: string | null }[],
  preferences: Record<string, string>
): Promise<{ voiceMap: Record<string, string>; audioUrl: string }> {
  // The account's real voice list needs voices_read, a permission a
  // restricted API key may not have (confirmed: this key returns 401 on
  // /v1/voices but 200 on text-to-speech) — fetchElevenLabsVoices already
  // falls back to a curated, verified-working pool in that case.
  const pool = curatedVoiceIds();
  const voiceMap = castVoices(beats.map((b) => b.speaker), pool, preferences, "elevenlabs");
  // Bounded-concurrency + retry-on-429, not Promise.all — confirmed live
  // that this account's plan caps concurrent ElevenLabs requests at 3, and
  // firing every beat at once trips that immediately on anything past a
  // 3-beat episode.
  const buffers = await renderBeatsWithElevenLabs(
    beats.map((beat) => ({ text: beat.text, voiceId: voiceMap[beat.speaker ?? "Narrator"] }))
  );
  // Sequential ElevenLabs MP3 clips concatenate cleanly in practice (same
  // encoder, consistent bitrate/sample rate per beat) — unlike Orpheus WAV,
  // which needs the RIFF-aware muxer above.
  const combined = Buffer.concat(buffers);
  const fileName = `${episodeId}-${Date.now()}.mp3`;
  const dir = path.join(process.cwd(), "public", "audio");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), combined);
  return { voiceMap, audioUrl: `/audio/${fileName}` };
}

/**
 * TTS Director — casts a voice per character then renders the full episode.
 * Tries the resolved provider first (Groq's Orpheus by default, or an
 * explicit request from the caller), falls back through the remaining
 * configured providers on failure, and as a last resort produces a "ready"
 * AudioRender row with provider "local" and symbolic voice hints — the
 * Studio UI plays that back beat-by-beat via the browser's SpeechSynthesis
 * API so the multi-voice flow still demos end-to-end even with zero keys.
 */
export async function renderEpisodeAudio(episodeId: string, requestedProvider?: RequestedProvider): Promise<string> {
  const episode = await db.episode.findUniqueOrThrow({
    where: { id: episodeId },
    include: { beats: { orderBy: { order: "asc" } } },
  });

  const cast = await db.character.findMany({
    where: { seriesId: episode.seriesId, preferredVoice: { not: null } },
    select: { name: true, preferredVoice: true },
  });
  const preferences = Object.fromEntries(cast.map((c) => [c.name, c.preferredVoice as string]));

  let provider = resolveProvider(requestedProvider);
  const render = await db.audioRender.create({
    data: { episodeId, status: "rendering", voiceMap: "{}", provider },
  });

  try {
    if (provider === "groq") {
      try {
        const { voiceMap, audioUrl } = await renderWithGroq(episodeId, episode.beats, preferences);
        await db.audioRender.update({ where: { id: render.id }, data: { status: "ready", audioUrl, voiceMap: JSON.stringify(voiceMap) } });
        return render.id;
      } catch (err) {
        console.warn("[tts-director] Groq TTS failed:", err instanceof Error ? err.message : err);
        if (!hasElevenLabs()) throw err;
        provider = "elevenlabs";
      }
    }

    if (provider === "elevenlabs") {
      try {
        const { voiceMap, audioUrl } = await renderWithElevenLabs(episodeId, episode.beats, preferences);
        await db.audioRender.update({ where: { id: render.id }, data: { status: "ready", audioUrl, voiceMap: JSON.stringify(voiceMap), provider: "elevenlabs" } });
        return render.id;
      } catch (err) {
        console.warn("[tts-director] ElevenLabs TTS failed:", err instanceof Error ? err.message : err);
      }
    }

    const voiceMap = castVoices(episode.beats.map((b) => b.speaker), LOCAL_VOICE_HINTS, {}, "local" as Provider);
    await db.audioRender.update({ where: { id: render.id }, data: { status: "ready", audioUrl: null, voiceMap: JSON.stringify(voiceMap), provider: "local" } });
    return render.id;
  } catch (err) {
    console.warn("[tts-director] render failed:", err instanceof Error ? err.message : err);
    await db.audioRender.update({ where: { id: render.id }, data: { status: "failed" } });
    throw err;
  }
}

export { fetchElevenLabsVoices };
