"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { EpisodeCard } from "./EpisodeCard";
import { ListenerAudioPlayer } from "./ListenerAudioPlayer";
import { GradientText } from "@/components/ui/GradientText";
import { Reveal } from "@/components/ui/Reveal";
import type { ListenerCatalogEpisode } from "@/lib/queries";

interface MoodResult {
  episodeId: string;
  seriesTitle: string;
  episodeTitle: string;
  episodeNumber: number;
  moodSummary: string;
  similarity: number;
}

interface ConciergeSlot {
  slot: string;
  reason: string;
  episodeId: string;
  episode: { episodeTitle: string; seriesTitle: string } | null;
}

interface Festival {
  id: string;
  title: string;
  theme: string;
  description: string;
  arc: string;
  coverUrl: string | null;
  slots: { order: number; note: string; episodeId: string; episodeTitle: string; seriesTitle: string }[];
}

export function ListenerHub({
  catalog,
  listenerName,
  initialFestivals,
}: {
  catalog: ListenerCatalogEpisode[];
  listenerName: string;
  initialFestivals: Festival[];
}) {
  const [playing, setPlaying] = useState<ListenerCatalogEpisode | null>(null);

  const [moodQuery, setMoodQuery] = useState("");
  const [moodResults, setMoodResults] = useState<MoodResult[] | null>(null);
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodError, setMoodError] = useState<string | null>(null);

  const [conciergeMood, setConciergeMood] = useState("");
  const [conciergeHours, setConciergeHours] = useState(4);
  const [conciergePlan, setConciergePlan] = useState<{ planTitle: string; slots: ConciergeSlot[] } | null>(null);
  const [conciergeLoading, setConciergeLoading] = useState(false);
  const [conciergeError, setConciergeError] = useState<string | null>(null);

  const [festivals, setFestivals] = useState<Festival[]>(initialFestivals);
  const [festivalLoading, setFestivalLoading] = useState(false);

  const byId = new Map(catalog.map((e) => [e.id, e]));

  async function runMoodSearch() {
    if (!moodQuery.trim()) return;
    setMoodLoading(true);
    setMoodError(null);
    try {
      const res = await fetch("/api/listen/mood-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: moodQuery }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setMoodResults(json.results);
    } catch (err) {
      setMoodError(err instanceof Error ? err.message : "Mood Search failed");
    } finally {
      setMoodLoading(false);
    }
  }

  async function runConcierge() {
    if (!conciergeMood.trim()) return;
    setConciergeLoading(true);
    setConciergeError(null);
    try {
      const res = await fetch("/api/listen/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: conciergeMood, hoursAvailable: conciergeHours }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setConciergePlan({ planTitle: json.planTitle, slots: json.slots });
    } catch (err) {
      setConciergeError(err instanceof Error ? err.message : "Concierge planning failed");
    } finally {
      setConciergeLoading(false);
    }
  }

  async function generateFestival() {
    setFestivalLoading(true);
    try {
      const res = await fetch("/api/listen/festivals", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const json = await res.json();
      if (json.ok) setFestivals((prev) => [json.festival, ...prev]);
    } finally {
      setFestivalLoading(false);
    }
  }

  const moodResultEpisodes = moodResults?.map((r) => ({ result: r, episode: byId.get(r.episodeId) })).filter((x) => x.episode) ?? [];

  return (
    <div className="page-shell-mesh">
      <div className="mx-auto max-w-6xl space-y-12 px-6 py-10 pb-32">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              <GradientText animate={false}>Listener Hub</GradientText>
            </h1>
            <p className="mt-1.5 text-base text-[var(--color-ink-dim)]">Welcome back, {listenerName}.</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="rounded-full border border-[var(--color-glass-border)] bg-[var(--color-glass)] px-5 py-2 text-sm font-semibold text-[var(--color-ink-dim)] backdrop-blur-md transition-all hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
            >
              Showrunner Studio →
            </a>
            <a
              href="/pulse-and-page"
              className="rounded-full border border-[var(--color-cyan)]/30 bg-[var(--color-cyan)]/10 px-5 py-2 text-sm font-semibold text-[var(--color-cyan)] backdrop-blur-md transition-all hover:bg-[var(--color-cyan)]/20"
            >
              💓 Pulse & Page
            </a>
            <a
              href="/audioverse"
              className="rounded-full border border-[var(--color-violet)]/30 bg-[var(--color-violet)]/10 px-5 py-2 text-sm font-semibold text-[var(--color-violet)] backdrop-blur-md transition-all hover:bg-[var(--color-violet)]/20"
            >
              ⚔️ Audioverse RPG
            </a>
          </div>
        </header>

        {/* Mood-First Search */}
        <Reveal>
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">
              🌧️ Mood-First Search
            </h2>
            <div className="flex gap-2">
              <input
                value={moodQuery}
                onChange={(e) => setMoodQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runMoodSearch()}
                placeholder="I want something that feels like a rainy Sunday after heartbreak…"
                className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2.5 text-sm text-[var(--color-ink)] outline-none transition-all duration-300 focus:border-[var(--color-violet)] focus:shadow-[0_0_0_3px_var(--color-violet-soft)]"
              />
              <motion.button
                onClick={runMoodSearch}
                disabled={moodLoading}
                className="rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-violet)] px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {moodLoading ? "Searching…" : "Search"}
              </motion.button>
            </div>
            {moodError && <p className="mt-2 text-xs text-[var(--color-risk-critical)]">{moodError}</p>}
            {moodResultEpisodes.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {moodResultEpisodes.map(({ result, episode }) => (
                  <EpisodeCard
                    key={result.episodeId}
                    episode={episode!}
                    onPlay={setPlaying}
                    matchNote={`${(result.similarity * 100).toFixed(0)}% mood match`}
                  />
                ))}
              </div>
            )}
          </section>
        </Reveal>

        {/* Entertainment Concierge */}
        <Reveal delay={0.1}>
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">
              🧭 Entertainment Concierge
            </h2>
            <div className="flex flex-wrap gap-2">
              <input
                value={conciergeMood}
                onChange={(e) => setConciergeMood(e.target.value)}
                placeholder="What's the vibe for your weekend?"
                className="min-w-[240px] flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2.5 text-sm text-[var(--color-ink)] outline-none transition-all duration-300 focus:border-[var(--color-violet)] focus:shadow-[0_0_0_3px_var(--color-violet-soft)]"
              />
              <input
                type="number"
                min={1}
                max={20}
                value={conciergeHours}
                onChange={(e) => setConciergeHours(Number(e.target.value))}
                className="w-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none transition-all duration-300 focus:border-[var(--color-violet)] focus:shadow-[0_0_0_3px_var(--color-violet-soft)]"
              />
              <motion.button
                onClick={runConcierge}
                disabled={conciergeLoading}
                className="rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-violet)] px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {conciergeLoading ? "Planning…" : "Plan my weekend"}
              </motion.button>
            </div>
            {conciergeError && <p className="mt-2 text-xs text-[var(--color-risk-critical)]">{conciergeError}</p>}
            {conciergePlan && (
              <div className="glass-card mt-4 p-5">
                <h3 className="mb-3 font-medium text-[var(--color-ink)]" style={{ fontFamily: "var(--font-heading)" }}>
                  {conciergePlan.planTitle}
                </h3>
                <div className="space-y-3">
                  {conciergePlan.slots.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="w-32 shrink-0 text-xs font-medium uppercase text-[var(--color-accent)]">{s.slot}</span>
                      <div className="flex-1">
                        <span className="text-[var(--color-ink)]">{s.episode?.episodeTitle}</span>{" "}
                        <span className="text-xs text-[var(--color-ink-dim)]">({s.episode?.seriesTitle})</span>
                        <p className="text-xs text-[var(--color-ink-dim)]">{s.reason}</p>
                      </div>
                      <button
                        onClick={() => { const ep = byId.get(s.episodeId); if (ep) setPlaying(ep); }}
                        className="shrink-0 rounded-lg border border-[var(--color-glass-border)] bg-[var(--color-glass)] px-3 py-1.5 text-xs text-[var(--color-ink-dim)] backdrop-blur-md transition-all hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
                      >
                        ▶
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </Reveal>

        {/* AI Curated Festivals */}
        <Reveal delay={0.15}>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">🎪 AI Curated Festivals</h2>
              <motion.button
                onClick={generateFestival}
                disabled={festivalLoading}
                className="rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-glass)] px-4 py-1.5 text-xs backdrop-blur-md transition-all hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] disabled:opacity-40"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {festivalLoading ? "Curating…" : "Curate a new festival"}
              </motion.button>
            </div>
            {festivals.length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--color-ink-dim)]">No festivals yet — curate one from the current catalog.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {festivals.map((f) => (
                  <div key={f.id} className="glass-card overflow-hidden">
                    {f.coverUrl && <img src={f.coverUrl} alt="" className="h-40 w-full object-cover" />}
                    <div className="p-5">
                      <h3 className="font-medium text-[var(--color-ink)]" style={{ fontFamily: "var(--font-heading)" }}>{f.title}</h3>
                      <p className="mb-1 text-xs text-[var(--color-accent)]">{f.theme}</p>
                      <p className="mb-3 text-xs text-[var(--color-ink-dim)]">{f.description}</p>
                      <div className="space-y-1">
                        {f.slots.map((s) => (
                          <button
                            key={s.order}
                            onClick={() => { const ep = byId.get(s.episodeId); if (ep) setPlaying(ep); }}
                            className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-all hover:bg-[var(--color-panel-raised)]"
                          >
                            <span className="text-[var(--color-ink-muted)]">{s.order + 1}.</span>
                            <span className="text-[var(--color-ink)]">{s.episodeTitle}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Reveal>

        {/* Full catalog */}
        <Reveal delay={0.2}>
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">📚 Browse Everything</h2>
            {catalog.length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--color-ink-dim)]">No published episodes yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {catalog.map((e) => (
                  <EpisodeCard key={e.id} episode={e} onPlay={setPlaying} />
                ))}
              </div>
            )}
          </section>
        </Reveal>

        {playing && playing.audioUrl && (
          <ListenerAudioPlayer episodeId={playing.id} audioUrl={playing.audioUrl} title={`${playing.title} — ${playing.seriesTitle}`} onClose={() => setPlaying(null)} />
        )}
      </div>
    </div>
  );
}
