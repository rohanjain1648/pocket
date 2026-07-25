"use client";

import { useState } from "react";
import type { BeatWithAnalysis, EpisodeForStudio } from "@/lib/queries";

const HINT_ORDER = ["narrator", "voice-a", "voice-b", "voice-c", "voice-d", "voice-e"];

function playBrowserTTS(beats: BeatWithAnalysis[], voiceMap: Record<string, string>) {
  window.speechSynthesis.cancel();
  const voices = window.speechSynthesis.getVoices();

  function voiceForHint(hint: string): SpeechSynthesisVoice | null {
    if (voices.length === 0) return null;
    const idx = HINT_ORDER.indexOf(hint);
    return voices[Math.max(0, idx) % voices.length] ?? null;
  }

  let i = 0;
  function speakNext() {
    if (i >= beats.length) return;
    const beat = beats[i];
    const hint = voiceMap[beat.speaker ?? "Narrator"] ?? "narrator";
    const utter = new SpeechSynthesisUtterance(beat.text);
    const voice = voiceForHint(hint);
    if (voice) utter.voice = voice;
    utter.pitch = 0.85 + HINT_ORDER.indexOf(hint) * 0.06;
    utter.rate = 1.0;
    utter.onend = () => {
      i++;
      speakNext();
    };
    window.speechSynthesis.speak(utter);
  }
  speakNext();
}

type ProviderChoice = "auto" | "groq" | "elevenlabs";

export function AudioPlayer({ episode }: { episode: EpisodeForStudio }) {
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [render, setRender] = useState(episode.audioRenders[0] ?? null);
  const [provider, setProvider] = useState<ProviderChoice>("auto");

  async function handleRender() {
    setRendering(true);
    setError(null);
    try {
      const res = await fetch(`/api/episodes/${episode.id}/render-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setRender(json.render);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Render failed");
    } finally {
      setRendering(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">Audio Render</h3>
        <div className="flex items-center gap-2">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as ProviderChoice)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5 text-xs text-[var(--color-ink-dim)] outline-none focus:border-[var(--color-accent)]"
          >
            <option value="auto">Auto (Groq → ElevenLabs → local)</option>
            <option value="groq">Groq (Orpheus)</option>
            <option value="elevenlabs">ElevenLabs</option>
          </select>
          <button
            onClick={handleRender}
            disabled={rendering}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40"
          >
            {rendering ? "Rendering…" : "Render Episode Audio"}
          </button>
        </div>
      </div>

      {error && <p className="mb-2 text-xs text-[var(--color-risk-critical)]">{error}</p>}

      {!render && <p className="text-xs text-[var(--color-ink-dim)]">No render yet.</p>}

      {render && render.status === "ready" && (render.provider === "groq" || render.provider === "elevenlabs") && render.audioUrl && (
        <div>
          <audio controls src={render.audioUrl} className="w-full" />
          <span className="mt-1 block text-xs text-[var(--color-ink-dim)]">
            Rendered via {render.provider === "groq" ? "Groq (Orpheus TTS)" : "ElevenLabs"}
            {provider !== "auto" && provider !== render.provider ? ` (requested ${provider}, fell back)` : ""}.
          </span>
        </div>
      )}

      {render && render.status === "ready" && render.provider === "local" && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => playBrowserTTS(episode.beats, render.voiceMap)}
            className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-black"
          >
            ▶ Play (browser voices)
          </button>
          <button
            onClick={() => window.speechSynthesis.cancel()}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-ink-dim)]"
          >
            Stop
          </button>
          <span className="text-xs text-[var(--color-ink-dim)]">No GROQ/ELEVENLABS key — using browser TTS fallback.</span>
        </div>
      )}

      {render && render.status === "failed" && <p className="text-xs text-[var(--color-risk-critical)]">Render failed.</p>}
    </div>
  );
}
