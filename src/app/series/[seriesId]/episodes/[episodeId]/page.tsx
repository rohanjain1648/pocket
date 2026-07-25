import Link from "next/link";
import { notFound } from "next/navigation";
import { getEpisodeForStudio } from "@/lib/queries";
import { StudioView } from "@/components/StudioView";

export default async function EpisodeStudioPage({
  params,
}: {
  params: Promise<{ seriesId: string; episodeId: string }>;
}) {
  const { seriesId, episodeId } = await params;
  const episode = await getEpisodeForStudio(episodeId).catch(() => null);
  if (!episode || episode.seriesId !== seriesId) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href={`/series/${seriesId}`} className="text-sm text-[var(--color-ink-dim)] hover:text-[var(--color-accent)]">
        ← Back to Series
      </Link>
      <div className="mt-3">
        <StudioView episode={episode} />
      </div>
    </main>
  );
}
