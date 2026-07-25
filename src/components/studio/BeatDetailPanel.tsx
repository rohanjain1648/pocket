"use client";

import { useState } from "react";
import { severityColor, riskColor, clampPercent } from "@/lib/ui";
import type { BeatWithAnalysis } from "@/lib/queries";

export function BeatDetailPanel({
  beat,
  episodeId,
  onRewritten,
}: {
  beat: BeatWithAnalysis;
  episodeId: string;
  onRewritten: () => void;
}) {
  const [rewriting, setRewriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const a = beat.analysis;

  async function handleRewrite() {
    setRewriting(true);
    setError(null);
    try {
      const res = await fetch(`/api/episodes/${episodeId}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beatId: beat.id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      onRewritten();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rewrite failed");
    } finally {
      setRewriting(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <span className="text-xs text-[var(--color-ink-dim)]">Beat {beat.order + 1}</span>
          {beat.speaker && <span className="ml-2 rounded-full bg-[var(--color-panel-raised)] px-2 py-0.5 text-xs">{beat.speaker}</span>}
        </div>
        {a && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: `${riskColor(a.dropoffRisk)}22`, color: riskColor(a.dropoffRisk) }}
          >
            {a.dropoffRisk} risk · {a.retentionScore.toFixed(1)}%
          </span>
        )}
      </div>

      <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink)]">{beat.text}</p>

      {a && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <ScorePill label="Cliffhanger" value={a.cliffhangerScore} />
            <ScorePill label="Pacing" value={a.pacingScore} />
            <ScorePill label={`Emotion · ${a.emotionLabel}`} value={a.emotionScore} />
            <ScorePill label="Dialogue" value={a.dialogueScore} />
            <ScorePill label="Readability" value={a.readabilityScore} />
          </div>

          {a.suggestedFix && (
            <div className="mb-4 rounded-md border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] p-3 text-xs">
              <span className="font-medium text-[var(--color-accent)]">Last rewrite: </span>
              {a.suggestedFix}
            </div>
          )}

          <div className="mb-4 space-y-1.5">
            <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">Agent Findings</h4>
            {a.findings.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: severityColor(f.severity) }} />
                <span>
                  <span className="font-medium text-[var(--color-ink-dim)]">{f.agent}:</span> {f.summary}
                </span>
              </div>
            ))}
          </div>

          {a.consistencyFlags.length > 0 && (
            <div className="mb-4 rounded-md border border-[var(--color-risk-critical)]/40 bg-[var(--color-risk-critical)]/10 p-3">
              <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--color-risk-critical)]">
                Consistency Flags
              </h4>
              {a.consistencyFlags.map((f, i) => (
                <p key={i} className="text-xs text-[var(--color-ink)]">
                  {f.message} <span className="text-[var(--color-ink-dim)]">[{f.relatedEntity}]</span>
                </p>
              ))}
            </div>
          )}

          {error && <p className="mb-2 text-xs text-[var(--color-risk-critical)]">{error}</p>}

          <button
            onClick={handleRewrite}
            disabled={rewriting}
            className="w-full rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-black transition disabled:opacity-40"
          >
            {rewriting ? "Rewriting…" : "Rewrite This Beat"}
          </button>
        </>
      )}
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const pct = clampPercent(value);
  return (
    <div className="rounded-md bg-[var(--color-panel-raised)] px-2 py-1.5">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="truncate text-[10px] text-[var(--color-ink-dim)]">{label}</span>
        <span className="text-xs font-medium">{pct}</span>
      </div>
      <div className="h-1 rounded-full bg-[var(--color-border)]">
        <div
          className="h-1 rounded-full"
          style={{ width: `${pct}%`, background: pct < 40 ? "var(--color-risk-critical)" : pct < 65 ? "var(--color-risk-medium)" : "var(--color-risk-low)" }}
        />
      </div>
    </div>
  );
}
