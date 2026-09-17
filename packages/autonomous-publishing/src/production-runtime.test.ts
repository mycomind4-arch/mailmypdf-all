import assert from "node:assert/strict";
import test from "node:test";
import { createProductionPublishingAdapters } from "./production-runtime.js";
import type { PublicationManifest } from "./manifest.js";
import type { RenderedEdition } from "./types.js";

const manifest: PublicationManifest = {
  id: "delivery-test",
  name: "Delivery Test",
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
  integrations: { resend: true },
};

const rendered: RenderedEdition = {
  html: "<p>hello</p>",
  text: "hello",
  edition: {
    publicationId: manifest.id,
    editionId: "edition-1",
    subject: "Hello",
    markdown: "hello",
    createdAt: "2026-09-16T00:00:00.000Z",
    plannedStories: [],
    verification: {
      passed: true,
      issues: [],
      verifiedAt: "2026-09-16T00:00:00.000Z",
    },
  },
};

test("production runtime fails closed when approval has no delivery provider", async () => {
  const adapters = createProductionPublishingAdapters(manifest, {
    env: { ANTHROPIC_API_KEY: "test" },
    requireDelivery: true,
    overrides: {
      discovery: { async discover() { return []; } },
      scoring: { async score() { return []; } },
      research: { async enrich() { throw new Error("unused"); } },
      planning: { async plan() { throw new Error("unused"); } },
      verification: { async verify() { throw new Error("unused"); } },
      rendering: { async render() { return rendered; } },
    },
  });

  await assert.rejects(
    () => adapters.publisher.publish(rendered, manifest),
    /DELIVERY_NOT_CONFIGURED/,
  );
});
