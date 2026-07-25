"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ListenerCatalogEpisode } from "@/lib/queries";

interface CrossMediaLink {
  mediaType: string;
  title: string;
  creator: string;
  reason: string;
  coverUrl: string | null;
  externalUrl: string | null;
  verified: boolean;
}

export function EpisodeCard({
  episode,
  onPlay,
  matchNote,
}: {
  episode: ListenerCatalogEpisode;
  onPlay: (episode: ListenerCatalogEpisode) => void;
  matchNote?: string;
}) {
  const [why, setWhy] = useState<{ explanation: string; confidence: number } | null>(null);
  const [whyLoading, setWhyLoading] = useState(false);
  const [crossMedia, setCrossMedia] = useState<CrossMediaLink[] | null>(null);
  const [crossMediaLoading, setCrossMediaLoading] = useState(false);
  const [expanded, setExpanded] = useState<"why" | "cross-media" | null>(null);

  async function loadWhy() {
    if (why) {
      setExpanded(expanded === "why" ? null : "why");
      return;
    }
    setWhyLoading(true);
    setExpanded("why");
    try {
      const res = await fetch("/api/listen/why", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId: episode.id }),
      });
      const json = await res.json();
      if (json.ok) setWhy({ explanation: json.explanation, confidence: json.confidence });
    } finally {
      setWhyLoading(false);
    }
  }

  async function loadCrossMedia() {
    if (crossMedia) {
      setExpanded(expanded === "cross-media" ? null : "cross-media");
      return;
    }
    setCrossMediaLoading(true);
    setExpanded("cross-media");
    try {
      const res = await fetch(`/api/episodes/${episode.id}/cross-media`, { method: "POST" });
      const json = await res.json();
      if (json.ok) setCrossMedia(json.links);
    } finally {
      setCrossMediaLoading(false);
    }
  }

  return (
    <motion.div
      className="glass-card flex flex-col p-5 transition-all duration-300 hover:border-[var(--color-accent)]/20"
      whileHover={{ y: -2 }}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--color-ink-dim)]">
          {episode.seriesTitle} · Ep {episode.number}
        </span>
        <span className="rounded-full bg-[var(--color-violet-soft)] px-2.5 py-0.5 text-[10px] text-[var(--color-violet)]">
          {episode.seriesGenre}
        </span>
      </div>
      <h3 className="mb-1 font-medium text-[var(--color-ink)]" style={{ fontFamily: "var(--font-heading)" }}>
        {episode.title}
      </h3>
      {episode.moodSummary && (
        <p className="mb-2 text-xs italic text-[var(--color-ink-dim)]">&ldquo;{episode.moodSummary}&rdquo;</p>
      )}
      {matchNote && (
        <p className="mb-2 text-xs text-[var(--color-accent)]">{matchNote}</p>
      )}
      <p className="mb-3 line-clamp-2 flex-1 text-xs text-[var(--color-ink-dim)]">{episode.synopsis}</p>

      {/* Actions */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        <motion.button
          onClick={() => episode.audioUrl && onPlay(episode)}
          disabled={!episode.audioUrl}
          className="rounded-lg bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-violet)] px-3.5 py-1.5 text-xs font-semibold text-black disabled:opacity-30"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {episode.audioUrl ? "▶ Play" : "No render yet"}
        </motion.button>
        <button
          onClick={loadWhy}
          className="rounded-lg border border-[var(--color-glass-border)] bg-[var(--color-glass)] px-3 py-1.5 text-xs text-[var(--color-ink-dim)] backdrop-blur-md transition-all hover:border-[var(--color-violet)]/30 hover:text-[var(--color-violet)]"
        >
          Why I&rsquo;ll love this
        </button>
        <button
          onClick={loadCrossMedia}
          className="rounded-lg border border-[var(--color-glass-border)] bg-[var(--color-glass)] px-3 py-1.5 text-xs text-[var(--color-ink-dim)] backdrop-blur-md transition-all hover:border-[var(--color-violet)]/30 hover:text-[var(--color-violet)]"
        >
          Cross-media
        </button>
      </div>

      {/* Expandable panels */}
      {expanded === "why" && (
        <motion.div
          className="rounded-lg bg-[var(--color-panel)] p-3 text-xs"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
        >
          {whyLoading ? (
            <span className="text-[var(--color-ink-dim)]">Thinking…</span>
          ) : why ? (
            <>
              <p className="text-[var(--color-ink)]">{why.explanation}</p>
              <p className="mt-1 text-[10px] text-[var(--color-ink-muted)]">confidence {(why.confidence * 100).toFixed(0)}%</p>
            </>
          ) : null}
        </motion.div>
      )}

      {expanded === "cross-media" && (
        <motion.div
          className="space-y-2 rounded-lg bg-[var(--color-panel)] p-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
        >
          {crossMediaLoading ? (
            <span className="text-xs text-[var(--color-ink-dim)]">Finding matches…</span>
          ) : (
            crossMedia?.map((link, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {link.coverUrl && <img src={link.coverUrl} alt="" className="h-10 w-7 shrink-0 rounded object-cover" />}
                <div>
                  <p className="text-[var(--color-ink)]">
                    <span className="uppercase text-[10px] text-[var(--color-accent)]">{link.mediaType}</span>{" "}
                    {link.title} <span className="text-[var(--color-ink-dim)]">by {link.creator}</span>
                    {link.verified && <span className="ml-1 text-[10px] text-[var(--color-risk-low)]">✓ verified</span>}
                  </p>
                  <p className="text-[var(--color-ink-dim)]">{link.reason}</p>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
