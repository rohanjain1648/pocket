"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdaptSeriesForm() {
  const router = useRouter();
  const [sourceText, setSourceText] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  const [targetEpisodes, setTargetEpisodes] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/series/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText, sourceRef, targetEpisodes }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Adaptation failed");
      router.push(`/series/${json.seriesId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const remaining = 200 - sourceText.trim().length;

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
      <textarea
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
        placeholder="Paste a public-domain novel excerpt or article (min. 200 characters)…"
        rows={8}
        className="w-full resize-y rounded-md border border-[var(--color-border)] bg-[var(--color-panel-raised)] p-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
      />
      <p className={`mb-3 mt-1 text-xs ${remaining > 0 ? "text-[var(--color-ink-dim)]" : "text-[var(--color-risk-low)]"}`}>
        {remaining > 0 ? `${remaining} more character${remaining === 1 ? "" : "s"} needed` : `${sourceText.trim().length} characters — ready`}
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={sourceRef}
          onChange={(e) => setSourceRef(e.target.value)}
          placeholder="Source title / URL (optional)"
          className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-panel-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <label className="flex items-center gap-2 text-sm text-[var(--color-ink-dim)]">
          Episodes
          <input
            type="number"
            min={1}
            max={10}
            value={targetEpisodes}
            onChange={(e) => setTargetEpisodes(Number(e.target.value))}
            className="w-16 rounded-md border border-[var(--color-border)] bg-[var(--color-panel-raised)] px-2 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </label>
      </div>
      {error && <p className="mb-3 text-sm text-[var(--color-risk-critical)]">{error}</p>}
      <button
        type="submit"
        disabled={loading || sourceText.trim().length < 200}
        className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-black transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Adapting…" : "Adapt into Series"}
      </button>
    </form>
  );
}
