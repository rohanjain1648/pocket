export type VoiceProvider = "groq" | "elevenlabs";

/**
 * Character.preferredVoice is a single nullable string column (no schema
 * migration for a provider column) — so a provider-qualified voice is
 * encoded as "elevenlabs:<voiceId>". A bare string with no recognized
 * prefix is legacy data from before ElevenLabs casting existed and is
 * always treated as a Groq/Orpheus voice id, so existing casting choices
 * keep working unchanged.
 */
export function encodeVoicePref(provider: VoiceProvider, voiceId: string): string {
  return provider === "groq" ? voiceId : `${provider}:${voiceId}`;
}

export function decodeVoicePref(pref: string): { provider: VoiceProvider; voiceId: string } {
  if (pref.startsWith("elevenlabs:")) {
    return { provider: "elevenlabs", voiceId: pref.slice("elevenlabs:".length) };
  }
  if (pref.startsWith("groq:")) {
    return { provider: "groq", voiceId: pref.slice("groq:".length) };
  }
  return { provider: "groq", voiceId: pref };
}
