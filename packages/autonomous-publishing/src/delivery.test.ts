import assert from "node:assert/strict";
import test from "node:test";
import { createResendPublisher } from "./delivery.js";
import type { RenderedEdition } from "./types.js";
import type { PublicationManifest } from "./manifest.js";

const manifest: PublicationManifest = {
  id: "test-publication",
  name: "Test Publication",
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
  html: "<html><body><p>Hello</p></body></html>",
  text: "Hello",
  edition: {
    publicationId: manifest.id,
    editionId: "edition-1",
    subject: "Hello",
    preheader: "Preview",
    markdown: "Hello",
    plannedStories: [],
    createdAt: "2026-09-16T00:00:00.000Z",
    verification: {
      passed: true,
      issues: [],
      verifiedAt: "2026-09-16T00:00:00.000Z",
    },
  },
};

test("Resend publisher creates a broadcast with unsubscribe footer", async () => {
  let body: Record<string, unknown> | undefined;
  let authorization = "";

  const publisher = createResendPublisher({
    apiKey: "re_test",
    segmentId: "seg_123",
    from: "Test <news@example.com>",
    fetchImpl: async (_url, init) => {
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ id: "broadcast-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const result = await publisher.publish(rendered, manifest);

  assert.equal(authorization, "Bearer re_test");
  assert.equal(body?.segment_id, "seg_123");
  assert.equal(body?.send, true);
  assert.match(String(body?.html), /RESEND_UNSUBSCRIBE_URL/);
  assert.equal(result.providerId, "resend:broadcast-1");
});
