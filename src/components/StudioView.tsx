"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { RetentionHeatmap } from "@/components/studio/RetentionHeatmap";
import { BeatDetailPanel } from "@/components/studio/BeatDetailPanel";
import { BeatComposer } from "@/components/studio/BeatComposer";
import { DirectorControlRoom } from "@/components/studio/DirectorControlRoom";
import { AudioPlayer } from "@/components/studio/AudioPlayer";
import { AudienceMirror } from "@/components/studio/AudienceMirror";
import { SoundWorld } from "@/components/studio/SoundWorld";
import { WritersRoom } from "@/components/studio/WritersRoom";
import { MarketingDesk } from "@/components/studio/MarketingDesk";
import { AudienceSimulator } from "@/components/studio/AudienceSimulator";
import { GenreTransform } from "@/components/studio/GenreTransform";
import { riskColor } from "@/lib/ui";
import type { EpisodeForStudio } from "@/lib/queries";
import ScorePad from "@/components/audio-prototype/ScorePad";
import { GradientText } from "@/components/ui/GradientText";

const TABS = [
  { id: "detail" as const, label: "Analysis", emoji: "📊" },
  { id: "compose" as const, label: "Compose", emoji: "✎" },
  { id: "direct" as const, label: "Direct", emoji: "🎬" },
  { id: "score" as const, label: "Score", emoji: "🎵" },
  { id: "room" as const, label: "Room", emoji: "🪑" },
  { id: "genre" as const, label: "Genre", emoji: "🎭" },
];

export function StudioView({ episode }: { episode: EpisodeForStudio }) {
  const router = useRouter();
  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(episode.beats[0]?.id ?? null);
  const [mode, setMode] = useState<"detail" | "compose" | "direct" | "score" | "room" | "genre">("detail");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBeat = episode.beats.find((b) => b.id === selectedBeatId) ?? episode.beats[0] ?? null;
  const lastOrder = episode.beats[episode.beats.length - 1]?.order;

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/episodes/${episode.id}/analyze`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            <GradientText animate={false}>EP {episode.number}: {episode.title}</GradientText>
          </h1>
        </div>
        <motion.button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-violet)] px-5 py-2.5 text-sm font-semibold text-black transition disabled:opacity-40"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {analyzing ? "Analyzing…" : "Analyze Episode"}
          {!analyzing && (
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          )}
        </motion.button>
      </div>

      {error && <p className="text-sm text-[var(--color-risk-critical)]">{error}</p>}

      <RetentionHeatmap beats={episode.beats} selectedBeatId={selectedBeatId} onSelect={setSelectedBeatId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AudienceMirror episodeId={episode.id} />
        <SoundWorld episodeId={episode.id} beats={episode.beats.map((b) => ({ id: b.id, order: b.order, text: b.text }))} />
        <MarketingDesk episodeId={episode.id} />
        <AudienceSimulator episodeId={episode.id} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Beat List */}
        <div className="glass-card max-h-[600px] space-y-1 overflow-y-auto p-3">
          {episode.beats.map((beat) => (
            <button
              key={beat.id}
              onClick={() => setSelectedBeatId(beat.id)}
              className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-all duration-200"
              style={{
                background: selectedBeatId === beat.id ? "var(--color-panel-raised)" : "transparent",
                borderLeft: selectedBeatId === beat.id ? "2px solid var(--color-accent)" : "2px solid transparent",
              }}
            >
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ background: beat.analysis ? riskColor(beat.analysis.dropoffRisk) : "var(--color-border)" }}
              />
              <span className="line-clamp-2 text-[var(--color-ink-dim)]">
                <span className="text-[var(--color-ink)]">#{beat.order + 1}</span>{" "}
                {beat.speaker && <span className="text-[var(--color-accent)]">{beat.speaker}: </span>}
                {beat.text}
              </span>
            </button>
          ))}
        </div>

        {/* Tabbed Panel */}
        <div className="space-y-6">
          {selectedBeat && (
            <div className="glass-card flex gap-1 p-1.5 text-xs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id)}
                  className="relative flex-1 rounded-lg px-3 py-2 transition-all duration-200"
                  style={{
                    color: mode === tab.id ? "var(--color-ink)" : "var(--color-ink-dim)",
                  }}
                >
                  {mode === tab.id && (
                    <motion.div
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-[var(--color-accent)]/10 to-[var(--color-violet)]/10 border border-[var(--color-accent)]/20"
                      layoutId="activeTab"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">
                    {tab.emoji} {tab.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedBeat && mode === "detail" && (
            <BeatDetailPanel beat={selectedBeat} episodeId={episode.id} onRewritten={() => router.refresh()} />
          )}

          {selectedBeat && mode === "compose" && (
            <BeatComposer
              key={selectedBeat.id}
              beatId={selectedBeat.id}
              seriesId={episode.seriesId}
              speaker={selectedBeat.speaker}
              initialText={selectedBeat.text}
              isEpisodeEnding={selectedBeat.order === lastOrder}
              onSaved={() => router.refresh()}
            />
          )}

          {selectedBeat && mode === "direct" && (
            <DirectorControlRoom
              key={selectedBeat.id}
              beatId={selectedBeat.id}
              beatText={selectedBeat.text}
              onApplied={() => router.refresh()}
            />
          )}

          {selectedBeat && mode === "score" && (
            <ScorePad />
          )}

          {selectedBeat && mode === "room" && (
            <WritersRoom key={selectedBeat.id} beat={selectedBeat} />
          )}

          {selectedBeat && mode === "genre" && (
            <GenreTransform
              key={selectedBeat.id}
              beatId={selectedBeat.id}
              beatText={selectedBeat.text}
              onApplied={() => router.refresh()}
            />
          )}

          <AudioPlayer episode={episode} />
        </div>
      </div>
    </div>
  );
}
