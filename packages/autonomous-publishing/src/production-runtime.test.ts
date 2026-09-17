import assert from "node:assert/strict";
import test from "node:test";
import { createRequiredDeliveryPublisher } from "./publishers.js";
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

test("required delivery publisher fails closed", async () => {
  const publisher = createRequiredDeliveryPublisher();
  await assert.rejects(
    () => publisher.publish(rendered, manifest),
    /DELIVERY_NOT_CONFIGURED/,
  );
});
