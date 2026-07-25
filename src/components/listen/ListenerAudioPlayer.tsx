"use client";

import { useEffect, useRef } from "react";

export function ListenerAudioPlayer({
  episodeId,
  audioUrl,
  title,
  onClose,
}: {
  episodeId: string;
  audioUrl: string;
  title: string;
  onClose: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSentRef = useRef(0);

  function sendProgress(progress: number, completed: boolean) {
    fetch("/api/listen/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episodeId, progress, completed }),
    }).catch(() => {});
  }

  useEffect(() => {
    return () => {
      const el = audioRef.current;
      if (el && el.duration > 0) sendProgress(el.currentTime / el.duration, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeId]);

  function handleTimeUpdate() {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const now = Date.now();
    // Throttle to once every 5s of wall-clock time — real progress tracking
    // without hammering the API on every timeupdate tick (fires ~4x/sec).
    if (now - lastSentRef.current < 5000) return;
    lastSentRef.current = now;
    sendProgress(el.currentTime / el.duration, false);
  }

  function handleEnded() {
    sendProgress(1, true);
  }

  return (
    <div className="sticky bottom-0 z-10 border-t border-[var(--color-border)] bg-[var(--color-panel)] p-4 shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--color-ink)]">{title}</p>
          <audio
            ref={audioRef}
            controls
            autoPlay
            src={audioUrl}
            className="mt-1 w-full"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onPause={(e) => {
              const el = e.currentTarget;
              if (el.duration) sendProgress(el.currentTime / el.duration, false);
            }}
          />
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-ink-dim)]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
