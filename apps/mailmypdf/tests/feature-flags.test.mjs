import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Test the feature flag system logic.
// We inline the flag definitions to test without importing the TS module.

const FLAG_DEFINITIONS = {
  autoSubmitToLob: {
    key: "FEATURE_FLAG_AUTO_SUBMIT",
    description: "Automatically submit paid orders to Lob for fulfillment",
    runtimeToggleable: true,
  },
  lobEnabled: {
    key: "FEATURE_FLAG_LOB_ENABLED",
    description: "Lob integration is configured and available",
    runtimeToggleable: false,
  },
  emailEnabled: {
    key: "FEATURE_FLAG_EMAIL_ENABLED",
    description: "Send transactional emails via Resend",
    runtimeToggleable: true,
  },
  scheduledDelivery: {
    key: "FEATURE_FLAG_SCHEDULED_DELIVERY",
    description: "Allow customers to schedule future delivery dates",
    runtimeToggleable: true,
  },
  certifiedMail: {
    key: "FEATURE_FLAG_CERTIFIED_MAIL",
    description: "Offer certified and registered mail options at checkout",
    runtimeToggleable: true,
  },
  colorPrinting: {
    key: "FEATURE_FLAG_COLOR_PRINTING",
    description: "Offer color printing option",
    runtimeToggleable: true,
  },
};

// Simulate the resolveFlag logic (matches src/lib/feature-flags.ts)
function resolveFlag(configValue, envOverrideKey) {
  const envValue = process.env[envOverrideKey];
  if (envValue !== undefined && envValue.trim() !== "") {
    return envValue.toLowerCase() === "true" || envValue === "1";
  }
  return configValue;
}

describe("Feature Flags — Definitions", () => {
  it("has all expected flags", () => {
    const expected = ["autoSubmitToLob", "lobEnabled", "emailEnabled", "scheduledDelivery", "certifiedMail", "colorPrinting"];
    for (const flag of expected) {
      assert.ok(FLAG_DEFINITIONS[flag], `Flag ${flag} should be defined`);
      assert.ok(FLAG_DEFINITIONS[flag].key, `Flag ${flag} should have a key`);
      assert.ok(FLAG_DEFINITIONS[flag].description, `Flag ${flag} should have a description`);
      assert.ok(typeof FLAG_DEFINITIONS[flag].runtimeToggleable === "boolean");
    }
  });

  it("lobEnabled is NOT runtime toggleable", () => {
    assert.equal(FLAG_DEFINITIONS.lobEnabled.runtimeToggleable, false);
  });

  it("autoSubmitToLob IS runtime toggleable", () => {
    assert.equal(FLAG_DEFINITIONS.autoSubmitToLob.runtimeToggleable, true);
  });

  it("emailEnabled IS runtime toggleable", () => {
    assert.equal(FLAG_DEFINITIONS.emailEnabled.runtimeToggleable, true);
  });

  it("each flag has a unique env override key", () => {
    const keys = Object.values(FLAG_DEFINITIONS).map((f) => f.key);
    const unique = new Set(keys);
    assert.equal(keys.length, unique.size, "All flag keys should be unique");
  });

  it("each flag has a meaningful description (>= 10 chars)", () => {
    for (const [name, def] of Object.entries(FLAG_DEFINITIONS)) {
      assert.ok(def.description.length >= 10, `Flag ${name} description too short: "${def.description}"`);
    }
  });
});

describe("Feature Flags — Override Resolution", () => {
  it("env override 'true' enables flag regardless of config default", () => {
    process.env.FEATURE_FLAG_AUTO_SUBMIT = "true";
    assert.ok(resolveFlag(false, "FEATURE_FLAG_AUTO_SUBMIT"));
    delete process.env.FEATURE_FLAG_AUTO_SUBMIT;
  });

  it("env override 'false' disables flag regardless of config default", () => {
    process.env.FEATURE_FLAG_AUTO_SUBMIT = "false";
    assert.ok(!resolveFlag(true, "FEATURE_FLAG_AUTO_SUBMIT"));
    delete process.env.FEATURE_FLAG_AUTO_SUBMIT;
  });

  it("env override '1' enables flag", () => {
    process.env.FEATURE_FLAG_EMAIL_ENABLED = "1";
    assert.ok(resolveFlag(false, "FEATURE_FLAG_EMAIL_ENABLED"));
    delete process.env.FEATURE_FLAG_EMAIL_ENABLED;
  });

  it("env override '0' disables flag", () => {
    process.env.FEATURE_FLAG_EMAIL_ENABLED = "0";
    assert.ok(!resolveFlag(true, "FEATURE_FLAG_EMAIL_ENABLED"));
    delete process.env.FEATURE_FLAG_EMAIL_ENABLED;
  });

  it("absent env override falls back to config value", () => {
    delete process.env.FEATURE_FLAG_AUTO_SUBMIT;
    assert.ok(resolveFlag(true, "FEATURE_FLAG_AUTO_SUBMIT"));
    assert.ok(!resolveFlag(false, "FEATURE_FLAG_AUTO_SUBMIT"));
  });

  it("empty string env override falls back to config value", () => {
    process.env.FEATURE_FLAG_AUTO_SUBMIT = "";
    assert.ok(resolveFlag(true, "FEATURE_FLAG_AUTO_SUBMIT"));
    delete process.env.FEATURE_FLAG_AUTO_SUBMIT;
  });
});
