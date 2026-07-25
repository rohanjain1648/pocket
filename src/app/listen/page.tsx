import { db } from "@/lib/db";
import { getListenerCatalog } from "@/lib/queries";
import { getDemoListener } from "@/lib/listener";
import { ListenerHub } from "@/components/listen/ListenerHub";

export default async function ListenPage() {
  const [catalog, listener, festivals] = await Promise.all([
    getListenerCatalog(),
    getDemoListener(),
    db.festival.findMany({
      orderBy: { createdAt: "desc" },
      include: { slots: { orderBy: { order: "asc" }, include: { episode: { include: { series: true } } } } },
    }),
  ]);

  const serializedFestivals = festivals.map((f) => ({
    id: f.id,
    title: f.title,
    theme: f.theme,
    description: f.description,
    arc: f.arc,
    coverUrl: f.coverUrl,
    slots: f.slots.map((s) => ({
      order: s.order,
      note: s.note,
      episodeId: s.episodeId,
      episodeTitle: s.episode.title,
      seriesTitle: s.episode.series.title,
    })),
  }));

  return <ListenerHub catalog={catalog} listenerName={listener.displayName} initialFestivals={serializedFestivals} />;
}
