"use client";

import { useState } from "react";

interface DirectorParams {
  suspense: number;
  warmth: number;
  intensity: number;
  pace: number;
}

const DEFAULT_PARAMS: DirectorParams = { suspense: 50, warmth: 50, intensity: 50, pace: 50 };

const DIALS: { key: keyof DirectorParams; label: string; low: string; high: string }[] = [
  { key: "suspense", label: "Suspense", low: "resolved", high: "unresolved" },
  { key: "warmth", label: "Warmth", low: "cold", high: "tender" },
  { key: "intensity", label: "Intensity", low: "understated", high: "visceral" },
  { key: "pace", label: "Pace", low: "lingering", high: "urgent" },
];

export function DirectorControlRoom({
  beatId,
  beatText,
  onApplied,
}: {
  beatId: string;
  beatText: string;
  onApplied: () => void;
}) {
  const [params, setParams] = useState<DirectorParams>(DEFAULT_PARAMS);
  const [directing, setDirecting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function direct() {
    setDirecting(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch(`/api/beats/${beatId}/direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: beatText, directorParams: params, apply: false }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setPreview(json.rewrittenText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Direction failed");
    } finally {
      setDirecting(false);
    }
  }

  async function apply() {
    if (!preview) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/beats/${beatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: preview }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setPreview(null);
      onApplied();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">
        🎬 Director&apos;s Control Room
      </h4>

      <p className="mb-4 whitespace-pre-wrap rounded-md bg-[var(--color-panel-raised)] p-3 text-xs leading-relaxed text-[var(--color-ink-dim)]">
        {beatText}
      </p>

      <div className="mb-4 space-y-3">
        {DIALS.map((d) => (
          <div key={d.key}>
            <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--color-ink-dim)]">
              <span className="font-medium text-[var(--color-ink)]">{d.label}</span>
              <span>{params[d.key]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={params[d.key]}
              onChange={(e) => setParams((p) => ({ ...p, [d.key]: Number(e.target.value) }))}
              className="w-full accent-[var(--color-accent)]"
            />
            <div className="flex justify-between text-[9px] text-[var(--color-ink-dim)]">
              <span>{d.low}</span>
              <span>{d.high}</span>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mb-2 text-xs text-[var(--color-risk-critical)]">{error}</p>}

      <button
        onClick={direct}
        disabled={directing}
        className="mb-3 w-full rounded-md border border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)] px-4 py-2 text-sm font-medium text-[var(--color-accent)] transition disabled:opacity-40"
      >
        {directing ? "Directing…" : "🎬 Re-direct this beat"}
      </button>

      {preview && (
        <div className="rounded-md border border-[var(--color-accent)]/40 bg-[var(--color-panel-raised)] p-3">
          <h5 className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent)]">New take</h5>
          <p className="mb-3 whitespace-pre-wrap text-xs leading-relaxed text-[var(--color-ink)]">{preview}</p>
          <div className="flex gap-2">
            <button
              onClick={apply}
              disabled={applying}
              className="flex-1 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-black disabled:opacity-40"
            >
              {applying ? "Applying…" : "Keep this take"}
            </button>
            <button
              onClick={() => setPreview(null)}
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-ink-dim)]"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
