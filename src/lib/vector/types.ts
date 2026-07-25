export interface BibleEntryRef {
  id: string;
  type: "character" | "worldRule" | "timelineEvent" | "relationship";
  text: string; // flattened text representation used for embedding + display
}

export interface RankedBibleEntry extends BibleEntryRef {
  similarity: number;
}
