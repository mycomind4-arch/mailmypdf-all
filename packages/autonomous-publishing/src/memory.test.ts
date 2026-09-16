import assert from "node:assert/strict";
import test from "node:test";
import { deduplicateCandidates, titleTokenSimilarity } from "./memory.js";
import type { StoryCandidate } from "./types.js";

function story(id: string, title: string, url: string): StoryCandidate {
  return {
    id,
    title,
    url,
    tags: [],
    source: {
      id: `source:${id}`,
      url,
      retrievedAt: "2026-09-16T00:00:00.000Z",
      sourceType: "rss",
    },
  };
}

test("titleTokenSimilarity catches materially identical headlines", () => {
  const similarity = titleTokenSimilarity(
    "OpenAI launches a new coding model for developers",
    "OpenAI launches new coding model for developers",
  );
  assert.ok(similarity >= 0.9);
});

test("deduplicateCandidates removes fuzzy headline duplicates", () => {
  const result = deduplicateCandidates([
    story("1", "OpenAI launches a new coding model for developers", "https://example.com/a"),
    story("2", "OpenAI launches new coding model for developers", "https://example.com/b"),
    story("3", "NASA publishes new Mars imagery", "https://example.com/c"),
  ]);
  assert.equal(result.length, 2);
});
