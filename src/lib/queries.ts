import { db } from "@/lib/db";
import type { Finding } from "@/lib/agents/orchestrator";
import type { ConsistencyFlag } from "@/lib/agents/consistency";

export interface BeatWithAnalysis {
  id: string;
  order: number;
  text: string;
  speaker: string | null;
  analysis: {
    retentionScore: number;
    dropoffRisk: string;
    cliffhangerScore: number;
    pacingScore: number;
    emotionScore: number;
    emotionLabel: string;
    dialogueScore: number;
    readabilityScore: number;
    consistencyFlags: ConsistencyFlag[];
    findings: Finding[];
    suggestedFix: string | null;
    modelSource: string;
  } | null;
}

export interface EpisodeForStudio {
  id: string;
  seriesId: string;
  number: number;
  title: string;
  beats: BeatWithAnalysis[];
  audioRenders: { id: string; status: string; audioUrl: string | null; provider: string; voiceMap: Record<string, string> }[];
}

export async function getEpisodeForStudio(episodeId: string): Promise<EpisodeForStudio> {
  const episode = await db.episode.findUniqueOrThrow({
    where: { id: episodeId },
    include: {
      beats: { orderBy: { order: "asc" }, include: { analysis: true } },
      audioRenders: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return {
    id: episode.id,
    seriesId: episode.seriesId,
    number: episode.number,
    title: episode.title,
    beats: episode.beats.map((b) => ({
      id: b.id,
      order: b.order,
      text: b.text,
      speaker: b.speaker,
      analysis: b.analysis
        ? {
            retentionScore: b.analysis.retentionScore,
            dropoffRisk: b.analysis.dropoffRisk,
            cliffhangerScore: b.analysis.cliffhangerScore,
            pacingScore: b.analysis.pacingScore,
            emotionScore: b.analysis.emotionScore,
            emotionLabel: b.analysis.emotionLabel,
            dialogueScore: b.analysis.dialogueScore,
            readabilityScore: b.analysis.readabilityScore,
            consistencyFlags: JSON.parse(b.analysis.consistencyFlags) as ConsistencyFlag[],
            findings: JSON.parse(b.analysis.findings) as Finding[],
            suggestedFix: b.analysis.suggestedFix,
            modelSource: b.analysis.modelSource,
          }
        : null,
    })),
    audioRenders: episode.audioRenders.map((r) => ({
      id: r.id,
      status: r.status,
      audioUrl: r.audioUrl,
      provider: r.provider,
      voiceMap: JSON.parse(r.voiceMap) as Record<string, string>,
    })),
  };
}

export async function getSeriesList() {
  return db.series.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      episodes: { orderBy: { number: "asc" }, select: { id: true, number: true, title: true } },
      _count: { select: { characters: true, worldRules: true, timeline: true, relationships: true } },
    },
  });
}

export interface ListenerCatalogEpisode {
  id: string;
  number: number;
  title: string;
  seriesId: string;
  seriesTitle: string;
  seriesGenre: string;
  synopsis: string;
  audioUrl: string | null;
  moodSummary: string | null;
  energy: number | null;
  tension: number | null;
  intimacy: number | null;
  warmth: number | null;
}

/** Every episode with a playable render — the Listener Hub's browse catalog. */
export async function getListenerCatalog(): Promise<ListenerCatalogEpisode[]> {
  const episodes = await db.episode.findMany({
    include: {
      series: true,
      audioRenders: { where: { status: "ready" }, orderBy: { createdAt: "desc" }, take: 1 },
      moodProfile: true,
    },
    orderBy: [{ series: { title: "asc" } }, { number: "asc" }],
  });

  return episodes.map((e) => ({
    id: e.id,
    number: e.number,
    title: e.title,
    seriesId: e.seriesId,
    seriesTitle: e.series.title,
    seriesGenre: e.series.genre,
    synopsis: e.series.synopsis,
    audioUrl: e.audioRenders[0]?.audioUrl ?? null,
    moodSummary: e.moodProfile?.moodSummary ?? null,
    energy: e.moodProfile?.energy ?? null,
    tension: e.moodProfile?.tension ?? null,
    intimacy: e.moodProfile?.intimacy ?? null,
    warmth: e.moodProfile?.warmth ?? null,
  }));
}

export async function getSeriesDetail(seriesId: string) {
  return db.series.findUniqueOrThrow({
    where: { id: seriesId },
    include: {
      episodes: { orderBy: { number: "asc" } },
      characters: true,
      worldRules: true,
      timeline: { orderBy: { order: "asc" } },
      relationships: true,
    },
  });
}
