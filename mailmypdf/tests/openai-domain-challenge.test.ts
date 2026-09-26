import assert from "node:assert/strict";
import test from "node:test";

import {
  handleOpenAiAppsChallenge,
  openAiAppsChallengeToken,
} from "../src/lib/openai-apps-challenge.server";

test("OpenAI challenge token normalization fails closed", () => {
  assert.equal(openAiAppsChallengeToken(undefined), null);
  assert.equal(openAiAppsChallengeToken(""), null);
  assert.equal(openAiAppsChallengeToken("bad token with spaces"), null);
  assert.equal(openAiAppsChallengeToken("short"), null);
  assert.equal(
    openAiAppsChallengeToken("  openai-verification_token.12345  "),
    "openai-verification_token.12345",
  );
});

test("OpenAI domain challenge returns only the configured token", async () => {
  const previous = process.env.OPENAI_APPS_CHALLENGE_TOKEN;
  process.env.OPENAI_APPS_CHALLENGE_TOKEN = "openai-verification_token.12345";
  try {
    const response = handleOpenAiAppsChallenge();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(await response.text(), "openai-verification_token.12345");
  } finally {
    if (previous === undefined) delete process.env.OPENAI_APPS_CHALLENGE_TOKEN;
    else process.env.OPENAI_APPS_CHALLENGE_TOKEN = previous;
  }
});

test("OpenAI domain challenge is unavailable when no valid token is configured", async () => {
  const previous = process.env.OPENAI_APPS_CHALLENGE_TOKEN;
  delete process.env.OPENAI_APPS_CHALLENGE_TOKEN;
  try {
    const response = handleOpenAiAppsChallenge();
    assert.equal(response.status, 404);
    assert.equal(await response.text(), "Not Found");
  } finally {
    if (previous !== undefined) process.env.OPENAI_APPS_CHALLENGE_TOKEN = previous;
  }
});
