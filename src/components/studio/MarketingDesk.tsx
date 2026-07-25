"use client";

import { useEffect, useState } from "react";

interface MarketingPlan {
  hooks: string[];
  hashtags: string[];
  clipBeatId: string | null;
  clipRationale: string;
  thumbnailMood: string;
  targetAudience: string;
}

export function MarketingDesk({ episodeId }: { episodeId: string }) {
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/episodes/${episodeId}/marketing`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.ok) setPlan(json.plan);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [episodeId]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/episodes/${episodeId}/marketing`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setPlan(json.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Marketing Director failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">📣 Marketing Desk</h3>
        <button
          onClick={generate}
          disabled={loading || checking}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40"
        >
          {loading ? "Planning…" : plan ? "Regenerate" : "Run Marketing Director"}
        </button>
      </div>

      {error && <p className="mb-2 text-xs text-[var(--color-risk-critical)]">{error}</p>}

      {!plan && !loading && !checking && (
        <p className="py-4 text-center text-xs text-[var(--color-ink-dim)]">
          Picks the strongest-cliffhanger beat as the promo clip (run Analyze first) and writes hooks, hashtags, thumbnail mood, and target audience around it.
        </p>
      )}

      {plan && (
        <div className="space-y-3">
          <div>
            <h4 className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">Social Hooks</h4>
            <ul className="space-y-1">
              {plan.hooks.map((h, i) => (
                <li key={i} className="text-xs text-[var(--color-ink)]">
                  &ldquo;{h}&rdquo;
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {plan.hashtags.map((h) => (
              <span key={h} className="rounded-full bg-[var(--color-panel-raised)] px-2 py-0.5 text-[10px] text-[var(--color-accent)]">
                #{h}
              </span>
            ))}
          </div>

          <div className="rounded-md bg-[var(--color-panel-raised)] p-2.5 text-xs">
            <span className="font-medium text-[var(--color-ink-dim)]">Promo clip: </span>
            {plan.clipRationale}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-[var(--color-panel-raised)] p-2.5">
              <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">Thumbnail mood</div>
              {plan.thumbnailMood}
            </div>
            <div className="rounded-md bg-[var(--color-panel-raised)] p-2.5">
              <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">Target audience</div>
              {plan.targetAudience}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
