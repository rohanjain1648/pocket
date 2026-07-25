"use client";

import { useState } from "react";

interface PersonaMeta {
  id: string;
  label: string;
  description: string;
  color: string;
}

interface PersonaBeatResult {
  beatId: string;
  retentionScore: number;
  survivalRate: number;
  dropoffRisk: string;
  reaction: string;
}

interface PersonaResult {
  personaId: string;
  finalRetention: number;
  beats: PersonaBeatResult[];
}

const CHART_W = 600;
const CHART_H = 160;
const PAD = 8;

function pathFor(beats: PersonaBeatResult[]): string {
  if (beats.length === 0) return "";
  const stepX = beats.length > 1 ? (CHART_W - PAD * 2) / (beats.length - 1) : 0;
  return beats
    .map((b, i) => {
      const x = PAD + i * stepX;
      const y = PAD + (1 - b.retentionScore / 100) * (CHART_H - PAD * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function AudienceMirror({ episodeId }: { episodeId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personas, setPersonas] = useState<PersonaMeta[] | null>(null);
  const [results, setResults] = useState<PersonaResult[] | null>(null);
  const [activePersona, setActivePersona] = useState<string>("suspense");

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/episodes/${episodeId}/audience-mirror`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setPersonas(json.personas);
      setResults(json.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audience Mirror failed");
    } finally {
      setLoading(false);
    }
  }

  const active = results?.find((r) => r.personaId === activePersona);
  const activeMeta = personas?.find((p) => p.id === activePersona);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">
          👥 Audience Mirror
        </h3>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40"
        >
          {loading ? "Simulating listeners…" : results ? "Re-run" : "Run Audience Mirror"}
        </button>
      </div>

      {error && <p className="mb-2 text-xs text-[var(--color-risk-critical)]">{error}</p>}

      {!results && !loading && (
        <p className="py-4 text-center text-xs text-[var(--color-ink-dim)]">
          Simulates 4 listener personas against this episode's retention math — see where they agree, and where they diverge.
        </p>
      )}

      {results && personas && (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {personas.map((p) => {
              const r = results.find((x) => x.personaId === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePersona(p.id)}
                  className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition"
                  style={{
                    borderColor: activePersona === p.id ? p.color : "var(--color-border)",
                    background: activePersona === p.id ? `${p.color}22` : "transparent",
                    color: activePersona === p.id ? p.color : "var(--color-ink-dim)",
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                  {p.label}
                  {r && <span className="font-semibold">{r.finalRetention.toFixed(0)}%</span>}
                </button>
              );
            })}
          </div>

          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="mb-3 w-full rounded-md bg-[var(--color-panel-raised)]">
            {[25, 50, 75].map((pct) => (
              <line
                key={pct}
                x1={PAD}
                x2={CHART_W - PAD}
                y1={PAD + (1 - pct / 100) * (CHART_H - PAD * 2)}
                y2={PAD + (1 - pct / 100) * (CHART_H - PAD * 2)}
                stroke="var(--color-border)"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
            ))}
            {results.map((r) => {
              const meta = personas.find((p) => p.id === r.personaId)!;
              const isActive = r.personaId === activePersona;
              return (
                <path
                  key={r.personaId}
                  d={pathFor(r.beats)}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth={isActive ? 3 : 1.5}
                  opacity={isActive ? 1 : 0.35}
                  style={{ transition: "opacity 200ms, stroke-width 200ms" }}
                />
              );
            })}
          </svg>

          {active && activeMeta && (
            <div>
              <p className="mb-2 text-xs text-[var(--color-ink-dim)]">
                <span className="font-medium" style={{ color: activeMeta.color }}>
                  {activeMeta.label}:
                </span>{" "}
                {activeMeta.description}
              </p>
              <div className="max-h-52 space-y-1.5 overflow-y-auto">
                {active.beats.map((b, i) => (
                  <div key={b.beatId} className="flex items-start gap-2 text-xs">
                    <span className="mt-0.5 w-8 shrink-0 text-[10px] text-[var(--color-ink-dim)]">#{i + 1}</span>
                    <span
                      className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background:
                          b.dropoffRisk === "critical"
                            ? "var(--color-risk-critical)"
                            : b.dropoffRisk === "high"
                              ? "var(--color-risk-high)"
                              : b.dropoffRisk === "medium"
                                ? "var(--color-risk-medium)"
                                : "var(--color-risk-low)",
                      }}
                    />
                    <span className="italic text-[var(--color-ink)]">&ldquo;{b.reaction}&rdquo;</span>
                    <span className="ml-auto shrink-0 text-[10px] text-[var(--color-ink-dim)]">{b.retentionScore.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
