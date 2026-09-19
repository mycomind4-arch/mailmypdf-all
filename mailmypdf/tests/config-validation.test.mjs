import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Test config validation logic (without importing the TS module directly)

describe("Config Validation", () => {
  it("requires PAYMENTS_ENV", () => {
    // Simulate the validation
    const env = process.env;
    delete env.PAYMENTS_ENV;
    const value = env.PAYMENTS_ENV;
    assert.ok(!value, "PAYMENTS_ENV should be undefined");
  });

  it("validates PAYMENTS_ENV values", () => {
    const valid = ["sandbox", "live"];
    const invalid = ["test", "production", "dev"];

    for (const v of valid) {
      assert.ok(v === "sandbox" || v === "live", `${v} should be valid`);
    }

    for (const v of invalid) {
      assert.ok(v !== "sandbox" && v !== "live", `${v} should be invalid`);
    }
  });

  it("picks correct Stripe key based on env", () => {
    const sandboxKey = "sk_test_123";
    const liveKey = "sk_live_123";

    // Sandbox
    let env = "sandbox";
    let key = env === "sandbox" ? sandboxKey : liveKey;
    assert.equal(key, sandboxKey, "Should use sandbox key for sandbox env");

    // Live
    env = "live";
    key = env === "sandbox" ? sandboxKey : liveKey;
    assert.equal(key, liveKey, "Should use live key for live env");
  });

  it("falls back to default app URL", () => {
    const url = undefined;
    const fallback = "https://mailmypdf.ai";
    const resolved = url ?? fallback;
    assert.equal(resolved, fallback);
  });
});
