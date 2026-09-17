import assert from "node:assert/strict";
import test from "node:test";
import { validatePublicationManifest, type PublicationManifest } from "./manifest.js";

const base: PublicationManifest = {
  id: "test-publication",
  name: "Test Publication",
  audience: { description: "Test readers" },
  schedule: { frequency: "manual", timezone: "America/Los_Angeles" },
  editorial: {
    voice: "evidence-first",
    storyCount: 5,
    minimumStoryScore: 70,
    sections: ["news"],
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
  integrations: {},
};

test("accepts a server-side Anthropic secret", () => {
  assert.equal(validatePublicationManifest(base).ai.apiKeyEnv, "ANTHROPIC_API_KEY");
});

test("rejects public AI secret names", () => {
  assert.throws(() => validatePublicationManifest({
    ...base,
    ai: { ...base.ai, apiKeyEnv: "NEXT_PUBLIC_ANTHROPIC_API_KEY" },
  }));
});


test("rejects invalid schedule timezones", () => {
  assert.throws(
    () => validatePublicationManifest({
      ...base,
      schedule: { frequency: "daily", timezone: "Not/A_Timezone", time: "06:00" },
    }),
    /Invalid schedule timezone/,
  );
});

test("weekly schedules require an explicit weekday", () => {
  assert.throws(
    () => validatePublicationManifest({
      ...base,
      schedule: { frequency: "weekly", timezone: "America/Los_Angeles", time: "06:00" },
    }),
    /Weekly schedules require dayOfWeek/,
  );
});
