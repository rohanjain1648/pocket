"use client";

import { useState } from "react";

type TargetGenre = "horror" | "romance" | "comedy" | "thriller" | "anime";

const GENRES: { id: TargetGenre; label: string; emoji: string }[] = [
  { id: "horror", label: "Horror", emoji: "🕯️" },
  { id: "romance", label: "Romance", emoji: "💌" },
  { id: "comedy", label: "Comedy", emoji: "🎭" },
  { id: "thriller", label: "Thriller", emoji: "🔪" },
  { id: "anime", label: "Anime", emoji: "⚡" },
];

export function GenreTransform({
  beatId,
  beatText,
  onApplied,
}: {
  beatId: string;
  beatText: string;
  onApplied: () => void;
}) {
  const [genre, setGenre] = useState<TargetGenre>("horror");
  const [transforming, setTransforming] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<{ text: string; warnings: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function transform() {
    setTransforming(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch(`/api/beats/${beatId}/genre`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setPreview({ text: json.text, warnings: json.warnings });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Genre transform failed");
    } finally {
      setTransforming(false);
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
        body: JSON.stringify({ text: preview.text }),
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
      <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">🎭 Genre Transform Engine</h4>

      <p className="mb-4 whitespace-pre-wrap rounded-md bg-[var(--color-panel-raised)] p-3 text-xs leading-relaxed text-[var(--color-ink-dim)]">
        {beatText}
      </p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {GENRES.map((g) => (
          <button
            key={g.id}
            onClick={() => setGenre(g.id)}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition"
            style={{
              borderColor: genre === g.id ? "var(--color-accent)" : "var(--color-border)",
              background: genre === g.id ? "var(--color-accent-soft)" : "transparent",
              color: genre === g.id ? "var(--color-accent)" : "var(--color-ink-dim)",
            }}
          >
            <span>{g.emoji}</span>
            {g.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-2 text-xs text-[var(--color-risk-critical)]">{error}</p>}

      <button
        onClick={transform}
        disabled={transforming}
        className="mb-3 w-full rounded-md border border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)] px-4 py-2 text-sm font-medium text-[var(--color-accent)] transition disabled:opacity-40"
      >
        {transforming ? "Transforming…" : `Transform to ${GENRES.find((g) => g.id === genre)?.label}`}
      </button>

      {preview && (
        <div className="rounded-md border border-[var(--color-accent)]/40 bg-[var(--color-panel-raised)] p-3">
          <h5 className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent)]">
            {GENRES.find((g) => g.id === genre)?.label} take
          </h5>
          <p className="mb-3 whitespace-pre-wrap text-xs leading-relaxed text-[var(--color-ink)]">{preview.text}</p>

          {preview.warnings.length > 0 && (
            <div className="mb-3 space-y-1 rounded-md bg-[var(--color-risk-medium)]/10 p-2">
              {preview.warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-[var(--color-risk-medium)]">
                  ⚠ {w}
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={apply}
              disabled={applying}
              className="flex-1 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-black disabled:opacity-40"
            >
              {applying ? "Applying…" : "Use as beat text"}
            </button>
            <button
              onClick={() => setPreview(null)}
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-ink-dim)]"
            >
              Keep browsing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
