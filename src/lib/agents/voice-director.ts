import { groqSpeech, TTS_VOICES, type OrpheusVoice } from "@/lib/llm/groq";
import { resilientJSONOrDefault } from "@/lib/llm/resilient";
import { hasElevenLabs, elevenLabsSpeech, curatedVoiceIds } from "@/lib/llm/elevenlabs";

export interface DeliveryVariant {
  label: string; // e.g. "Hushed dread", "Defiant", "Weary resignation"
  direction: string; // short vocal-direction cue, e.g. "whisper, trembling"
  styledText: string; // the line lightly annotated for that delivery (fed to TTS)
  voice: OrpheusVoice; // which Orpheus voice suits this reading
}

export interface VoiceDirectorResult {
  variants: DeliveryVariant[]; // exactly 3, distinct deliveries of the same line
}

function coerceVoice(v: string): OrpheusVoice {
  return (TTS_VOICES as readonly string[]).includes(v) ? (v as OrpheusVoice) : "hannah";
}

/**
 * Voice-Director — the "quality-check for performance" assist. Given a line
 * and its speaker, proposes three distinct emotional readings, each with a
 * vocal-direction cue and a suited Orpheus voice, so the writer can hear the
 * same line three ways and pick the delivery. Groq for the suggestion
 * (fast, quota-safe on the typing hot path); Orpheus for the audio.
 */
export async function suggestDeliveries(beatText: string, speaker: string | null): Promise<VoiceDirectorResult> {
  const system = `You are the Voice-Director in a serialized audio drama tool. Given a line${
    speaker ? ` spoken by "${speaker}"` : " of narration"
  }, propose exactly 3 DISTINCT emotional deliveries. For each, give a short label, a vocal-direction cue, and "styledText": the same line lightly annotated for that reading (you may add a leading bracketed cue like [whisper] or [tense] and light emphasis, but keep the words essentially the same). Pick a voice for each from this list: ${TTS_VOICES.join(", ")}. Respond ONLY with JSON: { "variants": [{ "label": string, "direction": string, "styledText": string, "voice": string }] }.`;

  const result = await resilientJSONOrDefault<{ variants: DeliveryVariant[] }>(system, `LINE:\n${beatText}`, { variants: [] });
  const variants = (result.variants ?? []).slice(0, 3).map((v) => ({ ...v, voice: coerceVoice(v.voice as string) }));
  return { variants };
}

/**
 * Renders one delivery variant to an audio data URL, preferring Orpheus
 * (WAV, the only response_format it supports) and falling back to
 * ElevenLabs (MP3) if Orpheus fails and a paid key is configured — same
 * "never let one TTS provider block the feature" rule as the main episode
 * renderer in tts-director.ts. Returns a base64 data URI (not a file) since
 * these are throwaway single-line previews.
 */
export async function renderDeliveryPreview(styledText: string, voice: OrpheusVoice): Promise<string> {
  try {
    const buffer = await groqSpeech(styledText, voice);
    return `data:audio/wav;base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.warn("[voice-director] Orpheus preview failed:", err instanceof Error ? err.message : err);
    if (!hasElevenLabs()) throw err;
    const buffer = await elevenLabsSpeech(styledText, curatedVoiceIds()[0]);
    return `data:audio/mpeg;base64,${buffer.toString("base64")}`;
  }
}
