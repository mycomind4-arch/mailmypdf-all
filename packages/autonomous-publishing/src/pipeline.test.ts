import assert from "node:assert/strict";
import test from "node:test";
import { createPublishingPipeline } from "./pipeline.js";
import type { PublishingAdapters } from "./adapters.js";
import type { PublicationManifest } from "./manifest.js";
import type { EvidencePacket, StoryCandidate, VerifiedEdition } from "./types.js";

const manifest: PublicationManifest = {
  id: "ai-industry-daily",
  name: "AI Industry Daily",
  audience: { description: "Builders following material AI industry developments" },
  schedule: { frequency: "daily", timezone: "America/Los_Angeles", time: "06:00" },
  editorial: {
    voice: "concise, evidence-first",
    storyCount: 5,
    minimumStoryScore: 70,
    sections: ["top-story", "developments", "what-to-watch"],
    requirePrimarySource: true,
    avoidRepeatDays: 30,
  },
  ai: { provider: "anthropic", model: "claude-sonnet", apiKeyEnv: "ANTHROPIC_API_KEY" },
  autonomy: {
    discover: "automatic",
    research: "automatic",
    draft: "automatic",
    verify: "automatic",
    publish: "approval_required",
  },
  integrations: { horizon: true, crawl4ai: true, rsshub: true, listmonk: true, umami: true },
};

const story: StoryCandidate = {
  id: "story-1",
  title: "Material AI development",
  url: "https://example.com/story",
  tags: ["ai"],
  source: {
    id: "source-1",
    url: "https://example.com/story",
    retrievedAt: "2026-09-16T12:00:00.000Z",
    sourceType: "web",
    primary: true,
  },
};

const evidence: EvidencePacket = {
  storyId: story.id,
  sources: [story.source],
  claims: [{ id: "claim-1", text: "A supported fact", sourceIds: ["source-1"], confidence: 0.98 }],
};

function adapters(onPublish: () => void): PublishingAdapters {
  return {
    discovery: { async discover() { return [story, { ...story, id: "duplicate" }]; } },
    scoring: { async score(stories) { return stories.map((item) => ({ ...item, score: 95 })); } },
    research: { async enrich() { return evidence; } },
    planning: {
      async plan(stories, packets) {
        return {
          publicationId: manifest.id,
          editionId: "edition-1",
          subject: "Daily briefing",
          markdown: "# Daily briefing",
          plannedStories: stories.map((item, position) => ({
            story: item,
            evidence: packets.get(item.id) ?? evidence,
            position,
            section: "top-story",
          })),
          createdAt: "2026-09-16T12:00:00.000Z",
        };
      },
    },
    verification: {
      async verify(draft) {
        return {
          ...draft,
          verification: { passed: true, issues: [], verifiedAt: "2026-09-16T12:00:00.000Z" },
        } satisfies VerifiedEdition;
      },
    },
    rendering: { async render(edition) { return { edition, html: "<h1>Daily briefing</h1>", text: "Daily briefing" }; } },
    publisher: { async publish() { onPublish(); return { publicationUrl: "https://example.com/edition-1" }; } },
  };
}

test("approval-required run stops before publication", async () => {
  let published = false;
  const pipeline = createPublishingPipeline(adapters(() => { published = true; }), undefined, {
    now: () => new Date("2026-09-16T12:00:00.000Z"),
    id: () => "run-1",
  });

  const result = await pipeline.run(manifest);
  assert.equal(result.run.status, "awaiting_approval");
  assert.equal(result.run.stage, "approval");
  assert.equal(published, false);
  assert.equal(result.rendered.edition.plannedStories.length, 1);
});

test("approved run publishes", async () => {
  let published = false;
  const pipeline = createPublishingPipeline(adapters(() => { published = true; }), undefined, {
    now: () => new Date("2026-09-16T12:00:00.000Z"),
    id: () => "run-2",
  });

  const result = await pipeline.run(manifest, true);
  assert.equal(result.run.status, "published");
  assert.equal(published, true);
  assert.equal(result.publication?.publicationUrl, "https://example.com/edition-1");
});
