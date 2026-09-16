import type { StoryCandidate } from "./types.js";

export interface StoryMemoryMatch {
  storyId: string;
  similarity: number;
  publishedAt?: string;
}

export interface StoryMemory {
  findSimilar(story: StoryCandidate, limit?: number): Promise<readonly StoryMemoryMatch[]>;
  remember(story: StoryCandidate, publishedAt: string): Promise<void>;
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    aa += a[i]! * a[i]!;
    bb += b[i]! * b[i]!;
  }
  if (!aa || !bb) return 0;
  return dot / (Math.sqrt(aa) * Math.sqrt(bb));
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function deterministicDuplicate(a: StoryCandidate, b: StoryCandidate): boolean {
  if (a.url === b.url) return true;
  return normalizeTitle(a.title) === normalizeTitle(b.title);
}

export function deduplicateCandidates(stories: readonly StoryCandidate[]): StoryCandidate[] {
  const result: StoryCandidate[] = [];
  for (const story of stories) {
    if (!result.some((existing) => deterministicDuplicate(existing, story))) result.push(story);
  }
  return result;
}
