import assert from "node:assert/strict";
import test from "node:test";
import { publishApprovedEdition } from "./approval.js";
import { createMemoryPublicationRunStore } from "./run-store.js";
import type { PublishingAdapters } from "./adapters.js";
import type { PublicationManifest } from "./manifest.js";
import type { StoredPublicationRun } from "./run-store.js";

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
  integrations: {},
};

const stored: StoredPublicationRun = {
  run: {
    id: "run-1",
    publicationId: manifest.id,
    stage: "approval",
    status: "awaiting_approval",
    startedAt: "2026-09-16T00:00:00.000Z",
  },
  rendered: {
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
  },
};

test("publishApprovedEdition publishes the exact stored artifact", async () => {
  const store = createMemoryPublicationRunStore();
  await store.save(stored);
  let publishedHtml = "";

  const adapters = {
    publisher: {
      async publish(rendered) {
        publishedHtml = rendered.html;
        return { providerId: "test:1" };
      },
    },
    analytics: { async recordPublication() {} },
  } as unknown as PublishingAdapters;

  const result = await publishApprovedEdition(adapters, manifest, stored, {
    runStore: store,
    now: () => new Date("2026-09-16T01:00:00.000Z"),
  });

  assert.equal(publishedHtml, "<p>hello</p>");
  assert.equal(result.run.status, "published");
  assert.equal((await store.get("run-1"))?.run.status, "published");
});


test("post-send analytics failure keeps the edition published and receipt persisted", async () => {
  const store = createMemoryPublicationRunStore();
  await store.save(stored);

  const adapters = {
    publisher: {
      async publish() {
        return { providerId: "resend:broadcast-123" };
      },
    },
    analytics: {
      async recordPublication() {
        throw new Error("analytics offline");
      },
    },
  } as unknown as PublishingAdapters;

  const result = await publishApprovedEdition(adapters, manifest, stored, {
    runStore: store,
    now: () => new Date("2026-09-16T02:00:00.000Z"),
  });

  const persisted = await store.get("run-1");
  assert.equal(result.run.status, "published");
  assert.equal(persisted?.run.status, "published");
  assert.equal(persisted?.publication?.providerId, "resend:broadcast-123");
  assert.match(persisted?.run.warnings?.[0] ?? "", /ANALYTICS_FAILED/);
});
