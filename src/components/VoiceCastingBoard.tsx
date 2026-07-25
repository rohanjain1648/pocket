"use client";

import { useEffect, useState } from "react";

interface CharacterRow {
  id: string;
  name: string;
  description: string;
  preferredVoice: string | null;
}

interface ElevenLabsVoice {
  id: string;
  name: string;
  gender: string;
  vibe: string;
}

type ProviderTab = "groq" | "elevenlabs";

const GROQ_VOICE_INFO: Record<string, { gender: string; vibe: string }> = {
  hannah: { gender: "female", vibe: "warm, narrator-default" },
  autumn: { gender: "female", vibe: "soft, reflective" },
  diana: { gender: "female", vibe: "crisp, composed" },
  austin: { gender: "male", vibe: "sharp, youthful" },
  daniel: { gender: "male", vibe: "steady, grounded" },
  troy: { gender: "male", vibe: "deep, weathered" },
};

function encodeVoicePref(provider: ProviderTab, voiceId: string): string {
  return provider === "groq" ? voiceId : `elevenlabs:${voiceId}`;
}

function decodeVoicePref(pref: string | null): { provider: ProviderTab; voiceId: string } | null {
  if (!pref) return null;
  if (pref.startsWith("elevenlabs:")) return { provider: "elevenlabs", voiceId: pref.slice("elevenlabs:".length) };
  if (pref.startsWith("groq:")) return { provider: "groq", voiceId: pref.slice("groq:".length) };
  return { provider: "groq", voiceId: pref };
}

export function VoiceCastingBoard({ seriesId }: { seriesId: string }) {
  const [characters, setCharacters] = useState<CharacterRow[] | null>(null);
  const [groqVoices, setGroqVoices] = useState<string[]>([]);
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>([]);
  const [tab, setTab] = useState<ProviderTab>("groq");
  const [error, setError] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [dragOverVoice, setDragOverVoice] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/series/${seriesId}/casting`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.ok) throw new Error(json.error);
        setCharacters(json.characters);
        setGroqVoices(json.groqVoices);
        setElevenLabsVoices(json.elevenLabsVoices ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load casting"));
  }, [seriesId]);

  async function assign(characterId: string, pref: string | null) {
    setCharacters((prev) => prev?.map((c) => (c.id === characterId ? { ...c, preferredVoice: pref } : c)) ?? null);
    setSelectedCharacter(null);
    try {
      const res = await fetch(`/api/series/${seriesId}/casting`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, voice: pref }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save casting");
    }
  }

  if (error) return <p className="text-sm text-[var(--color-risk-critical)]">{error}</p>;
  if (!characters) return <p className="text-sm text-[var(--color-ink-dim)]">Loading casting board…</p>;

  if (characters.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-ink-dim)]">
        No characters in the Story Bible yet — run &ldquo;Build Bible&rdquo; on an episode first.
      </div>
    );
  }

  const unassigned = characters.filter((c) => !c.preferredVoice);
  const activeVoices: { id: string; label: string; gender: string; vibe: string }[] =
    tab === "groq"
      ? groqVoices.map((v) => ({ id: v, label: v, gender: GROQ_VOICE_INFO[v]?.gender ?? "", vibe: GROQ_VOICE_INFO[v]?.vibe ?? "" }))
      : elevenLabsVoices.map((v) => ({ id: v.id, label: v.name, gender: v.gender, vibe: v.vibe }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">
          Cast ({characters.length - unassigned.length}/{characters.length})
        </h3>
        <div className="space-y-2">
          {unassigned.length === 0 && (
            <p className="rounded-md border border-dashed border-[var(--color-border)] p-4 text-center text-xs text-[var(--color-ink-dim)]">
              Everyone&apos;s cast.
            </p>
          )}
          {unassigned.map((c) => (
            <div
              key={c.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/character-id", c.id)}
              onClick={() => setSelectedCharacter(selectedCharacter === c.id ? null : c.id)}
              className="cursor-grab rounded-md border p-3 transition active:cursor-grabbing"
              style={{
                borderColor: selectedCharacter === c.id ? "var(--color-accent)" : "var(--color-border)",
                background: selectedCharacter === c.id ? "var(--color-accent-soft)" : "var(--color-panel)",
              }}
            >
              <div className="text-sm font-medium text-[var(--color-ink)]">{c.name}</div>
              <div className="mt-0.5 line-clamp-2 text-xs text-[var(--color-ink-dim)]">{c.description}</div>
            </div>
          ))}
        </div>
        {selectedCharacter && (
          <p className="mt-2 text-[11px] text-[var(--color-accent)]">Now click a voice to cast this character →</p>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">Voices</h3>
          <div className="flex gap-1 rounded-md border border-[var(--color-border)] p-0.5 text-xs">
            <button
              onClick={() => setTab("groq")}
              className="rounded px-2.5 py-1 transition"
              style={{ background: tab === "groq" ? "var(--color-panel-raised)" : "transparent", color: tab === "groq" ? "var(--color-ink)" : "var(--color-ink-dim)" }}
            >
              Groq (Orpheus)
            </button>
            <button
              onClick={() => setTab("elevenlabs")}
              disabled={elevenLabsVoices.length === 0}
              className="rounded px-2.5 py-1 transition disabled:opacity-40"
              style={{ background: tab === "elevenlabs" ? "var(--color-panel-raised)" : "transparent", color: tab === "elevenlabs" ? "var(--color-ink)" : "var(--color-ink-dim)" }}
              title={elevenLabsVoices.length === 0 ? "ElevenLabs not configured" : undefined}
            >
              ElevenLabs
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {activeVoices.map((v) => {
            const cast = characters.filter((c) => {
              const decoded = decodeVoicePref(c.preferredVoice);
              return decoded?.provider === tab && decoded.voiceId === v.id;
            });
            return (
              <div
                key={v.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverVoice(v.id);
                }}
                onDragLeave={() => setDragOverVoice(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverVoice(null);
                  const characterId = e.dataTransfer.getData("text/character-id");
                  if (characterId) assign(characterId, encodeVoicePref(tab, v.id));
                }}
                onClick={() => {
                  if (selectedCharacter) assign(selectedCharacter, encodeVoicePref(tab, v.id));
                }}
                className="rounded-lg border-2 border-dashed p-3 transition"
                style={{
                  borderColor: dragOverVoice === v.id ? "var(--color-accent)" : "var(--color-border)",
                  background: dragOverVoice === v.id ? "var(--color-accent-soft)" : "var(--color-panel)",
                  cursor: selectedCharacter ? "pointer" : "default",
                }}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-[var(--color-ink)]">{v.label}</span>
                  <span className="text-[10px] text-[var(--color-ink-dim)]">{v.gender}</span>
                </div>
                <div className="mb-2 text-[10px] text-[var(--color-ink-dim)]">{v.vibe}</div>
                <div className="flex flex-wrap gap-1">
                  {cast.map((c) => (
                    <span
                      key={c.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        assign(c.id, null);
                      }}
                      title="Click to uncast"
                      className="cursor-pointer rounded-full bg-[var(--color-panel-raised)] px-2 py-0.5 text-[10px] text-[var(--color-ink)] transition hover:bg-[var(--color-risk-critical)]/20 hover:text-[var(--color-risk-critical)]"
                    >
                      {c.name} ✕
                    </span>
                  ))}
                  {cast.length === 0 && <span className="text-[10px] text-[var(--color-ink-dim)]">drag a character here</span>}
                </div>
              </div>
            );
          })}
          {activeVoices.length === 0 && (
            <p className="col-span-full py-4 text-center text-xs text-[var(--color-ink-dim)]">
              No {tab === "groq" ? "Groq" : "ElevenLabs"} voices available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
