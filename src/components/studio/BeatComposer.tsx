"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HookCopilotResult } from "@/lib/agents/hook-copilot";
import type { ContinuityRadarResult } from "@/lib/agents/continuity-radar";
import type { VoiceDirectorResult } from "@/lib/agents/voice-director";

// Shared box metrics so the ghost-text mirror lines up pixel-for-pixel with
// the textarea it sits behind.
const TEXT_METRICS: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: "0.875rem",
  lineHeight: "1.625rem",
  padding: "0.75rem",
  border: "1px solid transparent",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  boxSizing: "border-box",
  letterSpacing: "normal",
};

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function joinSuggestion(text: string, suggestion: string): string {
  if (!text) return suggestion;
  const needsSpace = !/\s$/.test(text) && !/^[\s.,;:!?—]/.test(suggestion);
  return text + (needsSpace ? " " : "") + suggestion;
}

export function BeatComposer({
  beatId,
  seriesId,
  speaker,
  initialText,
  isEpisodeEnding,
  onSaved,
}: {
  beatId: string;
  seriesId: string;
  speaker: string | null;
  initialText: string;
  isEpisodeEnding: boolean;
  onSaved: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [caretAtEnd, setCaretAtEnd] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  const [hooks, setHooks] = useState<HookCopilotResult | null>(null);
  const [continuity, setContinuity] = useState<ContinuityRadarResult | null>(null);
  const [assistLoading, setAssistLoading] = useState(false);

  const [voice, setVoice] = useState<VoiceDirectorResult | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [savedText, setSavedText] = useState(initialText);

  const debouncedText = useDebounced(text, 1100);

  // Live assists: Hook Copilot + Continuity Radar fire together on each
  // typing pause. Both run on Groq so this stays quota-safe.
  useEffect(() => {
    const trimmed = debouncedText.trim();
    if (trimmed.length < 8) {
      setHooks(null);
      setContinuity(null);
      return;
    }
    let cancelled = false;
    setAssistLoading(true);
    Promise.all([
      fetch("/api/copilot/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beatText: debouncedText, isEpisodeEnding }),
      }).then((r) => r.json()),
      fetch("/api/copilot/continuity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId, beatText: debouncedText }),
      }).then((r) => r.json()),
    ])
      .then(([hookJson, contJson]) => {
        if (cancelled) return;
        if (hookJson.ok) setHooks(hookJson.result);
        if (contJson.ok) setContinuity(contJson.result);
      })
      .catch(() => {})
      .finally(() => !cancelled && setAssistLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedText, seriesId, isEpisodeEnding]);

  const ghost = caretAtEnd && hooks?.suggestions[0] && text.trim().length >= 8 ? hooks.suggestions[0].text : "";

  const syncScroll = useCallback(() => {
    if (mirrorRef.current && textareaRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  function acceptGhost() {
    if (!ghost) return;
    const next = joinSuggestion(text, ghost);
    setText(next);
    setHooks(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(next.length, next.length);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab" && ghost) {
      e.preventDefault();
      acceptGhost();
    }
  }

  function updateCaret() {
    const el = textareaRef.current;
    if (el) setCaretAtEnd(el.selectionStart === el.value.length);
  }

  function insertSuggestion(s: string) {
    setText((t) => joinSuggestion(t, s));
    setHooks(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/beats/${beatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setSavedText(text);
      onSaved();
    } catch {
      // swallow — save button re-enables; a toast system would go here
    } finally {
      setSaving(false);
    }
  }

  async function handleDirectVoice() {
    setVoiceLoading(true);
    setVoiceError(null);
    setVoice(null);
    try {
      const res = await fetch("/api/copilot/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beatText: text, speaker }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setVoice(json.result);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Voice-Director failed");
    } finally {
      setVoiceLoading(false);
    }
  }

  const dirty = text !== savedText;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">
          Compose {speaker && <span className="text-[var(--color-accent)]">· {speaker}</span>}
          {isEpisodeEnding && <span className="ml-1 text-[var(--color-ink-dim)]">· episode ending</span>}
        </h4>
        <ContinuityChip continuity={continuity} loading={assistLoading} />
      </div>

      {/* Ghost-text editor: mirror renders visible text + dim suggestion,
          textarea on top provides the caret and editing. */}
      <div className="relative">
        <div
          ref={mirrorRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-40 overflow-hidden rounded-md text-[var(--color-ink)]"
          style={TEXT_METRICS}
        >
          {text}
          {ghost && (
            <span className="text-[var(--color-ink-dim)] opacity-60">{joinSuggestion(text, ghost).slice(text.length)}</span>
          )}
          {"​"}
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCaret}
          onClick={updateCaret}
          onScroll={syncScroll}
          spellCheck
          className="relative z-10 h-40 w-full resize-none rounded-md border border-[var(--color-border)] bg-transparent text-transparent caret-[var(--color-accent)] outline-none focus:border-[var(--color-accent)]"
          style={{ ...TEXT_METRICS, borderColor: undefined }}
        />
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--color-ink-dim)]">
        <span>
          {ghost ? (
            <>
              Press <kbd className="rounded bg-[var(--color-panel-raised)] px-1">Tab</kbd> to accept suggestion
            </>
          ) : (
            "Hook Copilot suggests a stronger ending as you pause typing"
          )}
        </span>
        {assistLoading && <span>thinking…</span>}
      </div>

      {/* Hook Copilot panel */}
      {hooks && hooks.suggestions.length > 0 && (
        <div className="mt-3 rounded-md border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--color-accent)]">Hook Copilot</span>
            <span className="text-[var(--color-ink-dim)]">
              current hook {Math.round(hooks.currentHookScore)} ·{" "}
              <span className="font-medium text-[var(--color-risk-low)]">+{hooks.predictedLift}% finish</span> with top pick
            </span>
          </div>
          <div className="space-y-1.5">
            {hooks.suggestions.map((s, i) => (
              <div key={i} className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5">
                <button onClick={() => insertSuggestion(s.text)} className="block w-full text-left transition hover:opacity-80">
                  <span className="text-xs text-[var(--color-ink)]">{s.text}</span>
                  <span className="mt-0.5 block text-[10px] text-[var(--color-ink-dim)]">
                    hook {Math.round(s.hookScore)} · {s.rationale}
                  </span>
                </button>
                <CliffhangerForgeCompare currentTail={text} suggestion={s.text} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Continuity Radar flags */}
      {continuity && continuity.flags.length > 0 && (
        <div className="mt-3 rounded-md border border-[var(--color-risk-critical)]/40 bg-[var(--color-risk-critical)]/10 p-3">
          <h5 className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--color-risk-critical)]">
            Continuity Radar
          </h5>
          {continuity.flags.map((f, i) => (
            <p key={i} className="text-xs text-[var(--color-ink)]">
              {f.message} <span className="text-[var(--color-ink-dim)]">[{f.relatedEntity}]</span>
            </p>
          ))}
        </div>
      )}

      {/* Voice-Director */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleDirectVoice}
            disabled={voiceLoading || text.trim().length < 3}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40"
          >
            {voiceLoading ? "Directing…" : "🎙 Direct the voice — hear it 3 ways"}
          </button>
          <div className="flex items-center gap-2">
            {dirty && <span className="text-[11px] text-[var(--color-ink-dim)]">unsaved</span>}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-black transition disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save beat"}
            </button>
          </div>
        </div>

        {voiceError && (
          <p className="mt-2 text-[11px] text-[var(--color-risk-critical)]">{voiceError}</p>
        )}

        {voice && voice.variants.length > 0 && (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {voice.variants.map((v, i) => (
              <DeliveryCard key={i} label={v.label} direction={v.direction} styledText={v.styledText} voiceName={v.voice} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContinuityChip({ continuity, loading }: { continuity: ContinuityRadarResult | null; loading: boolean }) {
  if (loading && !continuity) {
    return <span className="rounded-full bg-[var(--color-panel-raised)] px-2 py-0.5 text-[11px] text-[var(--color-ink-dim)]">Radar…</span>;
  }
  if (!continuity) return null;
  if (continuity.flags.length > 0) {
    return (
      <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "var(--color-risk-critical)22", color: "var(--color-risk-critical)" }}>
        ⚠ {continuity.flags.length} continuity {continuity.flags.length === 1 ? "flag" : "flags"}
      </span>
    );
  }
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "var(--color-risk-low)22", color: "var(--color-risk-low)" }}>
      ✓ continuity clear
    </span>
  );
}

function CliffhangerForgeCompare({ currentTail, suggestion }: { currentTail: string; suggestion: string }) {
  const [loading, setLoading] = useState(false);
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function compare() {
    setLoading(true);
    setError(null);
    try {
      const [beforeRes, afterRes] = await Promise.all([
        fetch("/api/copilot/voice/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ styledText: currentTail.slice(-220) || "…", voice: "daniel" }),
        }).then((r) => r.json()),
        fetch("/api/copilot/voice/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ styledText: suggestion, voice: "daniel" }),
        }).then((r) => r.json()),
      ]);
      if (!beforeRes.ok || !afterRes.ok) throw new Error(beforeRes.error || afterRes.error || "Render failed");
      setBefore(beforeRes.audioUrl);
      setAfter(afterRes.audioUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "A/B compare failed");
    } finally {
      setLoading(false);
    }
  }

  if (before && after) {
    return (
      <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[var(--color-border)] pt-2">
        <div>
          <div className="mb-1 text-[9px] uppercase tracking-wide text-[var(--color-ink-dim)]">Before</div>
          <audio controls src={before} className="h-7 w-full" />
        </div>
        <div>
          <div className="mb-1 text-[9px] uppercase tracking-wide text-[var(--color-accent)]">After</div>
          <audio controls src={after} className="h-7 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 border-t border-[var(--color-border)] pt-1">
      <button
        onClick={compare}
        disabled={loading}
        className="text-[10px] text-[var(--color-ink-dim)] transition hover:text-[var(--color-accent)] disabled:opacity-40"
      >
        {loading ? "Rendering A/B…" : "🎧 Hear before / after"}
      </button>
      {error && <p className="text-[10px] text-[var(--color-risk-critical)]">{error}</p>}
    </div>
  );
}

function DeliveryCard({ label, direction, styledText, voiceName }: { label: string; direction: string; styledText: string; voiceName: string }) {
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function play() {
    if (audioUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/copilot/voice/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styledText, voice: voiceName }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setAudioUrl(json.audioUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Render failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-panel-raised)] p-2">
      <div className="mb-1 text-xs font-medium text-[var(--color-ink)]">{label}</div>
      <div className="mb-2 text-[10px] text-[var(--color-ink-dim)]">
        {direction} · voice: {voiceName}
      </div>
      {audioUrl ? (
        <audio controls autoPlay src={audioUrl} className="h-8 w-full" />
      ) : (
        <button
          onClick={play}
          disabled={loading}
          className="w-full rounded border border-[var(--color-border)] px-2 py-1 text-[11px] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40"
        >
          {loading ? "Rendering…" : "▶ Hear this reading"}
        </button>
      )}
      {error && <p className="mt-1 text-[10px] text-[var(--color-risk-critical)]" title={error}>Preview failed — see console/tooltip.</p>}
    </div>
  );
}
