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

const TITLE_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "from", "by", "at", "as", "is", "are",
]);

function titleTokens(title: string): Set<string> {
  return new Set(
    normalizeTitle(title)
      .split(" ")
      .filter((token) => token.length > 2 && !TITLE_STOPWORDS.has(token)),
  );
}

export function titleTokenSimilarity(a: string, b: string): number {
  const left = titleTokens(a);
  const right = titleTokens(b);
  if (!left.size || !right.size) return normalizeTitle(a) === normalizeTitle(b) ? 1 : 0;

  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  const union = left.size + right.size - intersection;
  return union ? intersection / union : 0;
}

export function deterministicDuplicate(a: StoryCandidate, b: StoryCandidate): boolean {
  if (a.url === b.url) return true;
  if (normalizeTitle(a.title) === normalizeTitle(b.title)) return true;
  return titleTokenSimilarity(a.title, b.title) >= 0.9;
}

export function deduplicateCandidates(stories: readonly StoryCandidate[]): StoryCandidate[] {
  const result: StoryCandidate[] = [];
  for (const story of stories) {
    if (!result.some((existing) => deterministicDuplicate(existing, story))) result.push(story);
  }
  return result;
}
