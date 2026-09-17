import assert from "node:assert/strict";
import test from "node:test";
import { createEmbeddingServiceAdapter } from "./service-adapters.js";
import type { PublicationManifest } from "./manifest.js";
import type { StoryCandidate } from "./types.js";

const manifest: PublicationManifest = {
  id: "embedding-test",
  name: "Embedding Test",
  audience: { description: "Test readers" },
  schedule: { frequency: "manual", timezone: "UTC" },
  editorial: {
    voice: "clear",
    storyCount: 1,
    minimumStoryScore: 0,
    sections: ["news"],
    requirePrimarySource: false,
    avoidRepeatDays: 30,
  },
  ai: { provider: "anthropic", model: "test", apiKeyEnv: "ANTHROPIC_API_KEY" },
  autonomy: {
    discover: "automatic",
    research: "automatic",
    draft: "automatic",
    verify: "automatic",
    publish: "approval_required",
  },
  integrations: { embeddings: true },
};

const story: StoryCandidate = {
  id: "story-1",
  title: "A material AI development",
  summary: "A concise summary",
  url: "https://example.com/story",
  tags: [],
  source: {
    id: "source-1",
    url: "https://example.com/story",
    retrievedAt: "2026-09-16T00:00:00.000Z",
    sourceType: "web",
  },
};

test("embedding service attaches validated 384-dimension vectors", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const adapter = createEmbeddingServiceAdapter({
    endpoint: "https://embeddings.example.test/embed",
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          model: "bge-small-en-v1.5",
          embeddings: [Array.from({ length: 384 }, (_, index) => index / 384)],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });

  const result = await adapter.embed([story], manifest);

  assert.equal(requestBody?.publicationId, manifest.id);
  assert.equal((requestBody?.texts as string[])[0], "A material AI development\n\nA concise summary");
  assert.equal(result[0]?.embedding?.length, 384);
  assert.equal(result[0]?.metadata?.embeddingModel, "bge-small-en-v1.5");
});

test("embedding service rejects malformed dimensions", async () => {
  const adapter = createEmbeddingServiceAdapter({
    endpoint: "https://embeddings.example.test/embed",
    fetchImpl: async () =>
      new Response(JSON.stringify({ embeddings: [[1, 2, 3]] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });

  await assert.rejects(
    () => adapter.embed([story], manifest),
    /EMBEDDING_SERVICE_INVALID_VECTOR/,
  );
});
