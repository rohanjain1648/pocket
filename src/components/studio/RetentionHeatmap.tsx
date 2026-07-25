"use client";

import { riskColor } from "@/lib/ui";
import { bingeProbability } from "@/lib/retention";
import type { BeatWithAnalysis } from "@/lib/queries";

export function RetentionHeatmap({
  beats,
  selectedBeatId,
  onSelect,
}: {
  beats: BeatWithAnalysis[];
  selectedBeatId: string | null;
  onSelect: (beatId: string) => void;
}) {
  const analyzed = beats.filter((b) => b.analysis);
  const finalAnalysis = analyzed.length > 0 ? analyzed[analyzed.length - 1].analysis! : null;
  const finalRetention = finalAnalysis?.retentionScore ?? null;
  const binge = finalAnalysis ? bingeProbability(finalAnalysis.retentionScore, finalAnalysis.cliffhangerScore) : null;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">Retention Heatmap</h3>
        {finalAnalysis && (
          <span className="flex items-baseline gap-4 text-sm">
            <span>
              <span className="text-[var(--color-ink-dim)]">Predicted finish rate: </span>
              <span className="font-semibold" style={{ color: riskColor(finalAnalysis.dropoffRisk) }}>
                {finalRetention!.toFixed(1)}%
              </span>
            </span>
            <span title="Probability a listener who finishes this episode starts the next one, blending finish rate with the final beat's cliffhanger strength.">
              <span className="text-[var(--color-ink-dim)]">Binge probability: </span>
              <span className="font-semibold text-[var(--color-accent)]">{binge!.toFixed(1)}%</span>
            </span>
          </span>
        )}
      </div>

      {analyzed.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-ink-dim)]">
          Run Analyze to generate the retention curve for this episode.
        </p>
      ) : (
        <>
          <div className="flex h-24 items-end gap-1">
            {beats.map((beat) => {
              const a = beat.analysis;
              const heightPct = a ? Math.max(4, a.retentionScore) : 4;
              return (
                <button
                  key={beat.id}
                  onClick={() => onSelect(beat.id)}
                  title={a ? `Beat ${beat.order + 1}: ${a.retentionScore.toFixed(1)}% (${a.dropoffRisk})` : `Beat ${beat.order + 1}: not analyzed`}
                  className="group relative flex-1 rounded-t transition"
                  style={{
                    height: `${heightPct}%`,
                    background: a ? riskColor(a.dropoffRisk) : "var(--color-border)",
                    outline: selectedBeatId === beat.id ? "2px solid var(--color-accent)" : "none",
                    outlineOffset: "2px",
                    opacity: a ? 1 : 0.4,
                  }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-[var(--color-ink-dim)]">
            <span>Beat 1</span>
            <span>Beat {beats.length}</span>
          </div>
          <div className="mt-3 flex gap-4 text-xs">
            <Legend color={riskColor("low")} label="Low risk" />
            <Legend color={riskColor("medium")} label="Medium" />
            <Legend color={riskColor("high")} label="High" />
            <Legend color={riskColor("critical")} label="Critical" />
          </div>
        </>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[var(--color-ink-dim)]">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
