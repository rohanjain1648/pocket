"use client";

import { useState } from "react";
import type { BeatWithAnalysis } from "@/lib/queries";

type Role = "director" | "editor" | "critic" | "psychologist" | "historian" | "audience";

const ROLE_META: Record<Role, { label: string; emoji: string }> = {
  director: { label: "Director", emoji: "🎬" },
  editor: { label: "Editor", emoji: "✂️" },
  critic: { label: "Critic", emoji: "🧐" },
  psychologist: { label: "Psychologist", emoji: "🧠" },
  historian: { label: "Historian", emoji: "📜" },
  audience: { label: "Audience", emoji: "🎧" },
};

export function WritersRoom({ beat }: { beat: BeatWithAnalysis }) {
  const [voices, setVoices] = useState<{ role: Role; comment: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const a = beat.analysis;

  async function convene() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/beats/${beat.id}/writers-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: beat.text,
          context: a
            ? {
                scores: {
                  cliffhangerScore: a.cliffhangerScore,
                  pacingScore: a.pacingScore,
                  emotionScore: a.emotionScore,
                  emotionLabel: a.emotionLabel,
                  dialogueScore: a.dialogueScore,
                  readabilityScore: a.readabilityScore,
                },
                findings: a.findings,
                consistencyFlags: a.consistencyFlags,
              }
            : { scores: { cliffhangerScore: 50, pacingScore: 50, emotionScore: 50, emotionLabel: "neutral", dialogueScore: 50, readabilityScore: 50 }, findings: [], consistencyFlags: [] },
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setVoices(json.voices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Writers Room failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">🪑 Writers Room</h4>
        <button
          onClick={convene}
          disabled={loading}
          className="rounded-md border border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--color-accent)] transition disabled:opacity-40"
        >
          {loading ? "Convening…" : voices ? "Reconvene" : "Convene the room"}
        </button>
      </div>

      <p className="mb-4 whitespace-pre-wrap rounded-md bg-[var(--color-panel-raised)] p-3 text-xs leading-relaxed text-[var(--color-ink-dim)]">
        {beat.text}
      </p>

      {error && <p className="mb-2 text-xs text-[var(--color-risk-critical)]">{error}</p>}

      {!voices && !loading && (
        <p className="py-6 text-center text-xs text-[var(--color-ink-dim)]">
          Six expert agents — director, editor, critic, psychologist, historian, audience — will react to this beat at once, grounded in its computed scores and flags.
        </p>
      )}

      {voices && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {voices.map((v) => (
            <div key={v.role} className="rounded-md border border-[var(--color-border)] bg-[var(--color-panel-raised)] p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-accent)]">
                <span>{ROLE_META[v.role]?.emoji ?? "💬"}</span>
                <span>{ROLE_META[v.role]?.label ?? v.role}</span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--color-ink)]">&ldquo;{v.comment}&rdquo;</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
