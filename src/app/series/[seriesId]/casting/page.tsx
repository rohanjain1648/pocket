import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeriesDetail } from "@/lib/queries";
import { VoiceCastingBoard } from "@/components/VoiceCastingBoard";

export default async function CastingPage({ params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = await params;
  const series = await getSeriesDetail(seriesId).catch(() => null);
  if (!series) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href={`/series/${seriesId}`} className="text-sm text-[var(--color-ink-dim)] hover:text-[var(--color-accent)]">
        ← Back to Series
      </Link>
      <header className="mb-6 mt-3">
        <h1 className="text-2xl font-semibold tracking-tight">🎙 Voice Casting Studio</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
          {series.title} — drag a character onto a voice, or click a character then click a voice.
        </p>
      </header>
      <VoiceCastingBoard seriesId={seriesId} />
    </main>
  );
}
