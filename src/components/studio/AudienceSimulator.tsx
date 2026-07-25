"use client";

import { useState } from "react";

interface BeatDropoff {
  beatId: string;
  order: number;
  droppedHere: number;
  stillListening: number;
}

interface PersonaBreakdown {
  personaId: string;
  label: string;
  color: string;
  count: number;
  completionRate: number;
}

interface SimResult {
  totalListeners: number;
  completionRate: number;
  bingeRate: number;
  dropoffByBeat: BeatDropoff[];
  personaBreakdown: PersonaBreakdown[];
  modelSource: string;
}

export function AudienceSimulator({ episodeId }: { episodeId: string }) {
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/episodes/${episodeId}/audience-sim`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setResult(json.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audience Simulator failed");
    } finally {
      setLoading(false);
    }
  }

  const maxDrop = result ? Math.max(1, ...result.dropoffByBeat.map((d) => d.droppedHere)) : 1;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">🧑‍🤝‍🧑 Audience Simulator</h3>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40"
        >
          {loading ? "Simulating 1,000 listeners…" : result ? "Re-run" : "Run Audience Simulator"}
        </button>
      </div>

      {error && <p className="mb-2 text-xs text-[var(--color-risk-critical)]">{error}</p>}

      {!result && !loading && (
        <p className="py-4 text-center text-xs text-[var(--color-ink-dim)]">
          Monte Carlo — 1,000 synthetic listeners, each independently rolled through this episode beat by beat, before it ever reaches a real audience.
        </p>
      )}

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-[var(--color-panel-raised)] p-2.5">
              <div className="text-lg font-semibold text-[var(--color-ink)]">{result.totalListeners.toLocaleString()}</div>
              <div className="text-[10px] uppercase tracking-wide text-[var(--color-ink-dim)]">simulated listeners</div>
            </div>
            <div className="rounded-md bg-[var(--color-panel-raised)] p-2.5">
              <div className="text-lg font-semibold text-[var(--color-ink)]">{result.completionRate.toFixed(1)}%</div>
              <div className="text-[10px] uppercase tracking-wide text-[var(--color-ink-dim)]">finished episode</div>
            </div>
            <div className="rounded-md bg-[var(--color-panel-raised)] p-2.5">
              <div className="text-lg font-semibold text-[var(--color-accent)]">{result.bingeRate.toFixed(1)}%</div>
              <div className="text-[10px] uppercase tracking-wide text-[var(--color-ink-dim)]">binged next episode</div>
            </div>
          </div>

          <div>
            <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">Where listeners dropped off</h4>
            <div className="flex h-16 items-end gap-1">
              {result.dropoffByBeat.map((d) => (
                <div
                  key={d.beatId}
                  title={`Beat ${d.order + 1}: ${d.droppedHere} listeners dropped here`}
                  className="flex-1 rounded-t bg-[var(--color-risk-critical)]"
                  style={{ height: `${Math.max(4, (d.droppedHere / maxDrop) * 100)}%`, opacity: d.droppedHere === 0 ? 0.15 : 0.85 }}
                />
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">Completion by persona</h4>
            <div className="space-y-1">
              {result.personaBreakdown.map((p) => (
                <div key={p.personaId} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                  <span className="w-32 shrink-0 text-[var(--color-ink-dim)]">{p.label}</span>
                  <span className="w-10 shrink-0 text-right text-[10px] text-[var(--color-ink-dim)]">{p.count}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-[var(--color-border)]">
                    <div className="h-1.5 rounded-full" style={{ width: `${p.completionRate}%`, background: p.color }} />
                  </div>
                  <span className="w-10 shrink-0 text-right font-medium text-[var(--color-ink)]">{p.completionRate.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-[var(--color-ink-dim)]">Model: {result.modelSource}</p>
        </div>
      )}
    </div>
  );
}
