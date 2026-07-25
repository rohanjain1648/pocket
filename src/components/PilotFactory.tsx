"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type StepStatus = "idle" | "active" | "done" | "warn" | "error";

interface Step {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

const INITIAL_STEPS: Step[] = [
  { id: "adapt", label: "Adapting script into episodes", status: "idle" },
  { id: "bible", label: "Building Story Bible", status: "idle" },
  { id: "analyze", label: "Running retention analysis", status: "idle" },
  { id: "audio", label: "Casting voices & rendering audio", status: "idle" },
];

export function PilotFactory() {
  const router = useRouter();
  const [sourceText, setSourceText] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  const [targetEpisodes, setTargetEpisodes] = useState(3);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<{ reason: string; categories: string[] } | null>(null);
  const [doneSeriesId, setDoneSeriesId] = useState<string | null>(null);
  const [doneEpisodeId, setDoneEpisodeId] = useState<string | null>(null);

  const remaining = 200 - sourceText.trim().length;

  function setStep(id: string, status: StepStatus, detail?: string) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status, detail } : s)));
  }

  async function run() {
    setRunning(true);
    setError(null);
    setBlocked(null);
    setSteps(INITIAL_STEPS);
    setDoneSeriesId(null);
    setDoneEpisodeId(null);

    try {
      setStep("adapt", "active");
      const adaptRes = await fetch("/api/series/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText, sourceRef, targetEpisodes }),
      });
      const adaptJson = await adaptRes.json();
      if (adaptJson.blocked) {
        setStep("adapt", "error", "blocked by content safety check");
        setBlocked({ reason: adaptJson.reason, categories: adaptJson.categories ?? [] });
        setRunning(false);
        return;
      }
      if (!adaptJson.ok) throw new Error(adaptJson.error ?? "Adaptation failed");
      const { seriesId, firstEpisodeId } = adaptJson as { seriesId: string; firstEpisodeId: string | null };
      setStep("adapt", "done");

      if (!firstEpisodeId) {
        setDoneSeriesId(seriesId);
        setSteps((prev) => prev.map((s) => (s.status === "idle" ? { ...s, status: "warn", detail: "skipped — no episode created" } : s)));
        setRunning(false);
        return;
      }

      setStep("bible", "active");
      try {
        const bibleRes = await fetch(`/api/episodes/${firstEpisodeId}/build-bible`, { method: "POST" });
        const bibleJson = await bibleRes.json();
        setStep("bible", bibleJson.ok ? "done" : "warn", bibleJson.ok ? undefined : bibleJson.error);
      } catch {
        setStep("bible", "warn", "skipped");
      }

      setStep("analyze", "active");
      try {
        const analyzeRes = await fetch(`/api/episodes/${firstEpisodeId}/analyze`, { method: "POST" });
        const analyzeJson = await analyzeRes.json();
        setStep("analyze", analyzeJson.ok ? "done" : "warn", analyzeJson.ok ? undefined : analyzeJson.error);
      } catch {
        setStep("analyze", "warn", "skipped");
      }

      setStep("audio", "active");
      try {
        const audioRes = await fetch(`/api/episodes/${firstEpisodeId}/render-audio`, { method: "POST" });
        const audioJson = await audioRes.json();
        setStep("audio", audioJson.ok ? "done" : "warn", audioJson.ok ? undefined : "voice terms/quota — finish in Studio");
      } catch {
        setStep("audio", "warn", "finish in Studio");
      }

      setDoneSeriesId(seriesId);
      setDoneEpisodeId(firstEpisodeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="glass-card p-6 border-[var(--color-accent)]/20 animate-border-glow">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🎬</span>
        <h3
          className="text-sm font-semibold text-[var(--color-accent)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          One-Click Pilot Factory
        </h3>
      </div>
      <p className="mb-4 text-xs text-[var(--color-ink-dim)]">
        Paste a story idea or source text. One click runs the whole production pipeline — adapt, build the Story Bible, predict retention, and cast voices — then drops you straight into the finished pilot.
      </p>

      {/* Source Input */}
      <textarea
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
        disabled={running}
        placeholder="Paste a public-domain novel excerpt, article, or story idea (min. 200 characters)…"
        rows={6}
        className="w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-sm text-[var(--color-ink)] outline-none transition-all duration-300 focus:border-[var(--color-violet)] focus:shadow-[0_0_0_3px_var(--color-violet-soft)] disabled:opacity-60"
      />
      <p className={`mb-3 mt-1 text-xs ${remaining > 0 ? "text-[var(--color-ink-dim)]" : "text-[var(--color-risk-low)]"}`}>
        {remaining > 0 ? `${remaining} more character${remaining === 1 ? "" : "s"} needed` : `${sourceText.trim().length} characters — ready`}
      </p>

      {/* Options Row */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={sourceRef}
          onChange={(e) => setSourceRef(e.target.value)}
          disabled={running}
          placeholder="Title / source (optional)"
          className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none transition-all duration-300 focus:border-[var(--color-violet)] focus:shadow-[0_0_0_3px_var(--color-violet-soft)] disabled:opacity-60"
        />
        <label className="flex items-center gap-2 text-sm text-[var(--color-ink-dim)]">
          Episodes
          <input
            type="number"
            min={1}
            max={10}
            value={targetEpisodes}
            disabled={running}
            onChange={(e) => setTargetEpisodes(Number(e.target.value))}
            className="w-16 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-2 text-sm outline-none transition-all duration-300 focus:border-[var(--color-violet)] focus:shadow-[0_0_0_3px_var(--color-violet-soft)] disabled:opacity-60"
          />
        </label>
      </div>

      {error && <p className="mb-3 text-sm text-[var(--color-risk-critical)]">{error}</p>}

      {blocked && (
        <div
          className="mb-3 rounded-xl border p-3"
          style={{ borderColor: "var(--color-risk-critical)", background: "var(--color-risk-critical)11" }}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-risk-critical)]">
            <span>🛡️</span>
            <span>This content can&apos;t be produced</span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-ink-dim)]">{blocked.reason}</p>
          {blocked.categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {blocked.categories.map((c) => (
                <span
                  key={c}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium text-[var(--color-risk-critical)]"
                  style={{ background: "var(--color-risk-critical)22" }}
                >
                  {c.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Produce Button */}
      <motion.button
        onClick={run}
        disabled={running || sourceText.trim().length < 200}
        className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-violet)] px-4 py-3 text-sm font-semibold text-black transition-all disabled:cursor-not-allowed disabled:opacity-40"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {running ? "Producing pilot…" : "🎬 Produce Pilot Episode"}
        {!running && (
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        )}
      </motion.button>

      {/* Pipeline Steps */}
      {(running || steps.some((s) => s.status !== "idle")) && (
        <div className="mt-5 space-y-2.5">
          {steps.map((s, i) => (
            <motion.div
              key={s.id}
              className="flex items-center gap-3 text-xs"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <StepIcon status={s.status} index={i} />
              <span className={s.status === "done" ? "text-[var(--color-ink)]" : "text-[var(--color-ink-dim)]"}>{s.label}</span>
              {s.detail && <span className="text-[10px] text-[var(--color-ink-muted)]">— {s.detail}</span>}
            </motion.div>
          ))}

          {/* Animated progress line */}
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--color-panel)]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-violet)]"
              initial={{ width: "0%" }}
              animate={{
                width: `${(steps.filter((s) => s.status === "done" || s.status === "warn").length / steps.length) * 100}%`,
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Done Actions */}
      {doneSeriesId && !running && (
        <div className="mt-4 flex gap-2">
          {doneEpisodeId && (
            <motion.button
              onClick={() => router.push(`/series/${doneSeriesId}/episodes/${doneEpisodeId}`)}
              className="flex-1 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-violet)] px-4 py-2.5 text-sm font-semibold text-black"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              ▶ Enter the Pilot Studio
            </motion.button>
          )}
          <button
            onClick={() => router.push(`/series/${doneSeriesId}`)}
            className="rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-glass)] px-4 py-2 text-sm text-[var(--color-ink-dim)] backdrop-blur-md hover:border-[var(--color-accent)]/40 transition-all duration-300"
          >
            View Series
          </button>
        </div>
      )}
    </div>
  );
}

function StepIcon({ status, index }: { status: StepStatus; index: number }) {
  if (status === "done") {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]"
        style={{ background: "var(--color-risk-low)22", color: "var(--color-risk-low)" }}
      >
        ✓
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
    );
  }
  if (status === "warn") {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]"
        style={{ background: "var(--color-risk-medium)22", color: "var(--color-risk-medium)" }}
      >
        !
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]"
        style={{ background: "var(--color-risk-critical)22", color: "var(--color-risk-critical)" }}
      >
        ✕
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[10px] text-[var(--color-ink-dim)]">
      {index + 1}
    </span>
  );
}
