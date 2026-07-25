import Link from "next/link";
import { getSeriesList } from "@/lib/queries";
import { PilotFactory } from "@/components/PilotFactory";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const seriesList = await getSeriesList();

  return (
    <main className="page-shell-mesh">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1
              className="text-4xl font-bold tracking-tight text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Showrunner
            </h1>
            <p className="mt-1.5 text-base text-[var(--color-ink-dim)]">
              AI production copilot — retention prediction, story-bible consistency, and script-to-episode audio.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/listen"
              className="rounded-full border border-[var(--color-glass-border)] bg-[var(--color-glass)] px-5 py-2 text-sm font-semibold text-[var(--color-ink-dim)] backdrop-blur-md transition-all hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
            >
              🎧 Listener Hub →
            </Link>
            <span className="rounded-full border border-[var(--color-glass-border)] bg-[var(--color-glass)] px-4 py-2 text-sm font-semibold text-[var(--color-ink-dim)] backdrop-blur-md">
              PocketFM × Databricks
            </span>
          </div>
        </header>

        {/* Series List */}
        <section className="mb-10">
          <h2 className="mb-4 text-base font-bold uppercase tracking-wider text-white">
            YOUR SERIES
          </h2>
          {seriesList.length === 0 ? (
            <div className="glass-card p-8 text-center text-sm text-[var(--color-ink-dim)] border-dashed">
              No series yet. Adapt one from source material below, or seed the demo data.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {seriesList.map((s) => (
                <Link
                  key={s.id}
                  href={`/series/${s.id}`}
                  className="group glass-card p-5 transition-all duration-300 hover:border-[var(--color-accent)]/30 hover:shadow-[0_0_30px_var(--color-accent-glow)]"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="font-medium" style={{ fontFamily: "var(--font-heading)" }}>{s.title}</h3>
                    <span className="text-xs text-[var(--color-ink-muted)]">{s.genre}</span>
                  </div>
                  <p className="mb-3 line-clamp-2 text-sm text-[var(--color-ink-dim)]">{s.synopsis}</p>
                  <div className="flex items-center gap-4 text-xs text-[var(--color-ink-dim)]">
                    <span>{s.episodes.length} episodes</span>
                    <span>{s._count.characters} characters</span>
                    <span className="ml-auto rounded-full bg-[var(--color-violet-soft)] px-2.5 py-0.5 text-[var(--color-violet)]">
                      {s.sourceType}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Pilot Factory */}
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-ink-dim)]">
            Produce a New Pilot
          </h2>
          <PilotFactory />
        </section>
      </div>
    </main>
  );
}
