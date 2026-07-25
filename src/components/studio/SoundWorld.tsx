"use client";

import { useRef, useState } from "react";

interface AmbienceTag {
  beatId: string;
  label: string;
  intensity: number;
  rationale: string;
}

const LABEL_COLOR: Record<string, string> = {
  silence: "#3a4152",
  "tense-drone": "#f0453a",
  rain: "#4a9eda",
  wind: "#8bd3e6",
  "fire-crackle": "#f5842a",
  "market-crowd": "#f5c542",
  "footsteps-stone": "#9aa1b2",
  "night-crickets": "#34d399",
  "battle-clash": "#c0392b",
  heartbeat: "#e91e63",
};

const LABEL_ICON: Record<string, string> = {
  silence: "···",
  "tense-drone": "≈≈",
  rain: "🌧",
  wind: "💨",
  "fire-crackle": "🔥",
  "market-crowd": "🗣",
  "footsteps-stone": "👣",
  "night-crickets": "🌙",
  "battle-clash": "⚔",
  heartbeat: "♥",
};

/**
 * Procedurally synthesizes each ambience label via Web Audio — no external
 * sound assets to source, license, or ship. Filtered noise for
 * texture-based beds (rain/wind/fire/footsteps), a detuned oscillator pair
 * for the tense-drone/heartbeat/battle-clash beds, silence for "silence".
 */
function playAmbience(ctx: AudioContext, label: string, intensity: number, durationSec: number): () => void {
  const gain = ctx.createGain();
  const vol = Math.max(0, Math.min(1, intensity / 100)) * 0.18;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.3);
  gain.connect(ctx.destination);

  const nodes: (OscillatorNode | AudioBufferSourceNode)[] = [];

  function noiseSource(filterFreq: number, filterType: BiquadFilterType): AudioBufferSourceNode {
    const bufferSize = ctx.sampleRate * durationSec;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    src.connect(filter);
    filter.connect(gain);
    return src;
  }

  function drone(freqA: number, freqB: number) {
    const oscA = ctx.createOscillator();
    oscA.type = "sine";
    oscA.frequency.value = freqA;
    const oscB = ctx.createOscillator();
    oscB.type = "sine";
    oscB.frequency.value = freqB;
    oscA.connect(gain);
    oscB.connect(gain);
    oscA.start();
    oscB.start();
    nodes.push(oscA, oscB);
  }

  switch (label) {
    case "rain":
      nodes.push(noiseSource(3500, "lowpass"));
      break;
    case "wind":
      nodes.push(noiseSource(800, "bandpass"));
      break;
    case "fire-crackle":
      nodes.push(noiseSource(2200, "highpass"));
      break;
    case "footsteps-stone":
      nodes.push(noiseSource(1200, "bandpass"));
      break;
    case "market-crowd":
      nodes.push(noiseSource(1800, "bandpass"));
      break;
    case "night-crickets":
      drone(4200, 4300);
      break;
    case "tense-drone":
      drone(80, 82);
      break;
    case "heartbeat":
      drone(55, 56);
      break;
    case "battle-clash":
      nodes.push(noiseSource(2800, "highpass"));
      drone(90, 95);
      break;
    default:
      break; // silence: gain never rises above 0
  }

  for (const n of nodes) if ("start" in n && n instanceof AudioBufferSourceNode) n.start();

  const stopAt = ctx.currentTime + durationSec;
  gain.gain.setValueAtTime(vol, stopAt - 0.3);
  gain.gain.linearRampToValueAtTime(0, stopAt);

  const timer = setTimeout(() => {
    for (const n of nodes) {
      try {
        n.stop();
      } catch {
        /* already stopped */
      }
    }
  }, durationSec * 1000 + 50);

  return () => {
    clearTimeout(timer);
    for (const n of nodes) {
      try {
        n.stop();
      } catch {
        /* already stopped */
      }
    }
  };
}

export function SoundWorld({
  episodeId,
  beats,
}: {
  episodeId: string;
  beats: { id: string; order: number; text: string }[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<AmbienceTag[] | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const cancelRef = useRef(false);

  async function build() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/episodes/${episodeId}/soundscape`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setTags(json.tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Soundscape build failed");
    } finally {
      setLoading(false);
    }
  }

  function stopPlayback() {
    cancelRef.current = true;
    stopRef.current?.();
    setPlayingIndex(null);
  }

  async function playTimeline() {
    if (!tags || tags.length === 0) return;
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") await ctx.resume();

    cancelRef.current = false;
    const perBeat = 2.2;

    for (let i = 0; i < tags.length; i++) {
      if (cancelRef.current) return;
      setPlayingIndex(i);
      stopRef.current = playAmbience(ctx, tags[i].label, tags[i].intensity, perBeat);
      await new Promise((r) => setTimeout(r, perBeat * 1000));
    }
    setPlayingIndex(null);
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">🔊 Sound World</h3>
        <div className="flex gap-2">
          <button
            onClick={build}
            disabled={loading}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40"
          >
            {loading ? "Tagging beats…" : tags ? "Re-build" : "Build Soundscape"}
          </button>
          {tags && (
            <button
              onClick={playingIndex !== null ? stopPlayback : playTimeline}
              className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-black"
            >
              {playingIndex !== null ? "■ Stop" : "▶ Play Soundscape"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-2 text-xs text-[var(--color-risk-critical)]">{error}</p>}

      {!tags && !loading && (
        <p className="py-4 text-center text-xs text-[var(--color-ink-dim)]">
          Auto-tags each beat with an ambience bed and synthesizes it live — no sound library needed.
        </p>
      )}

      {tags && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {tags.map((t, i) => (
            <div
              key={t.beatId}
              title={`${t.label} — ${t.rationale}`}
              className="flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-md border p-2 text-center transition"
              style={{
                borderColor: playingIndex === i ? LABEL_COLOR[t.label] : "var(--color-border)",
                background: playingIndex === i ? `${LABEL_COLOR[t.label]}22` : "var(--color-panel-raised)",
              }}
            >
              <span className="text-lg">{LABEL_ICON[t.label] ?? "·"}</span>
              <span className="text-[9px] leading-tight text-[var(--color-ink-dim)]">{t.label}</span>
              <div className="h-1 w-full rounded-full bg-[var(--color-border)]">
                <div className="h-1 rounded-full" style={{ width: `${t.intensity}%`, background: LABEL_COLOR[t.label] ?? "#666" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
