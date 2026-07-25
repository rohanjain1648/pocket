import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeriesDetail } from "@/lib/queries";
import { BuildBibleButton } from "@/components/BuildBibleButton";

export default async function SeriesPage({ params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = await params;
  const series = await getSeriesDetail(seriesId).catch(() => null);
  if (!series) notFound();

  return (
    <main className="page-shell-mesh">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-base font-semibold text-[var(--color-ink-dim)] transition-colors hover:text-[var(--color-accent)] group"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          All Series
        </Link>

        <header className="mb-8 mt-4">
          <h1
            className="text-4xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {series.title}
          </h1>
          <p className="mt-2 text-base text-[var(--color-ink-dim)] leading-relaxed">{series.synopsis}</p>
          <div className="mt-4 flex gap-3 text-sm font-semibold">
            <span className="rounded-full bg-[var(--color-violet-soft)] px-4 py-1.5 text-[var(--color-violet)]">
              {series.genre}
            </span>
            <span className="rounded-full bg-[var(--color-accent-soft)] px-4 py-1.5 text-[var(--color-accent)]">
              {series.sourceType}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
          {/* Episodes */}
          <section>
            <h2 className="mb-4 text-base font-bold uppercase tracking-wider text-white">EPISODES</h2>
            <div className="space-y-3">
              {series.episodes.map((ep) => (
                <div
                  key={ep.id}
                  className="glass-card flex items-center justify-between px-6 py-4 transition-all duration-300 hover:border-[var(--color-accent)]/30 hover:shadow-[0_0_20px_var(--color-accent-glow)]"
                >
                  <Link
                    href={`/series/${series.id}/episodes/${ep.id}`}
                    className="flex-1 transition-colors hover:text-[var(--color-accent)]"
                  >
                    <span className="mr-3 text-sm font-bold text-[var(--color-ink-dim)]">EP {ep.number}</span>
                    <span className="text-base font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>{ep.title}</span>
                  </Link>
                  <BuildBibleButton episodeId={ep.id} />
                </div>
              ))}
            </div>
          </section>

          {/* Story Bible */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold uppercase tracking-wider text-white">
                STORY BIBLE ({series.characters.length + series.worldRules.length + series.timeline.length + series.relationships.length})
              </h2>
              <Link
                href={`/series/${series.id}/casting`}
                className="rounded-full border border-[var(--color-glass-border)] bg-[var(--color-glass)] px-4 py-1.5 text-xs font-semibold text-[var(--color-ink-dim)] backdrop-blur-md transition-all hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
              >
                🎙 Casting Studio
              </Link>
            </div>
            <div className="glass-card space-y-6 p-6 text-sm">
              <BibleGroup title="CHARACTERS" items={series.characters.map((c) => c.name)} empty="No characters extracted yet." />
              <BibleGroup title="WORLD RULES" items={series.worldRules.map((w) => w.rule)} empty="No world rules extracted yet." />
              <BibleGroup
                title="RELATIONSHIPS"
                items={series.relationships.map((r) => `${r.characterA} ↔ ${r.characterB} (${r.type})`)}
                empty="No relationships extracted yet."
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function BibleGroup({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--color-ink-muted)]">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 8).map((item, i) => (
            <li key={i} className="truncate text-sm text-[var(--color-ink)]">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
