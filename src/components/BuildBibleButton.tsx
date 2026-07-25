"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BuildBibleButton({ episodeId }: { episodeId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/episodes/${episodeId}/build-bible`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Bible build failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-ink-dim)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40"
    >
      {loading ? "Extracting…" : "Build Bible"}
    </button>
  );
}
