/**
 * LLM Router Tests
 *
 * Tests:
 *   - Gemini default
 *   - Explicit provider
 *   - Fallback
 *   - Unavailable provider
 *   - Unsupported provider
 *   - Fallback chain recording
 *   - Consensus mode
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  routeLLMRequest,
  callMultipleProviders,
  isLLMAvailable,
  _setAdapter,
  _resetAdapters,
} from "./llm-router";
import {
  _resetLLMConfig,
} from "./llm-config";
import type { LLMAdapter, LLMRequest, LLMResponse } from "./llm-adapter";
import type { LLMRuntimeConfig, LLMProviderId } from "./llm-types";
import { LLMError } from "./llm-adapter";

const originalFetch = globalThis.fetch;

function makeMockAdapter(provider: string, model: string, content: string): LLMAdapter {
  return {
    provider,
    async generate(_request: LLMRequest): Promise<LLMResponse> {
      return {
        content,
        provenance: {
          provider,
          model,
          generatedAt: new Date().toISOString(),
          inputHash: "a".repeat(64),
        },
      };
    },
  };
}

function makeFailingAdapter(provider: string, model: string, error: string): LLMAdapter {
  return {
    provider,
    async generate(): Promise<LLMResponse> {
      throw new LLMError(error, provider, "MOCK_ERROR");
    },
  };
}

function makeConfig(providers: LLMProviderId[]): LLMRuntimeConfig {
  const providerConfigs: LLMRuntimeConfig["providers"] = {};
  for (const p of providers) {
    providerConfigs[p] = { apiKey: "key", model: `${p}-model` };
  }
  return {
    defaultProvider: "gemini",
    mode: "standard",
    providers: providerConfigs,
    operationPolicies: {
      classify: "standard",
      extract: "standard",
      "extract_timeline": "standard",
      analyze: "standard",
      assess_risk: "enhanced",
      generate_strategy: "standard",
      assist_draft: "standard",
      reconcile: "consensus",
    },
    fallbackEnabled: true,
    maxRetries: 1,
    defaultTimeoutMs: 30000,
    defaultTemperature: 0.3,
    defaultMaxTokens: 2048,
    promptVersion: "test-1.0.0",
  };
}

beforeEach(() => {
  _resetAdapters();
  _resetLLMConfig();
});

afterEach(() => {
  _resetAdapters();
  _resetLLMConfig();
  globalThis.fetch = originalFetch;
});

// ── Gemini Default ───────────────────────────────────────────────────────

describe("router: Gemini default", () => {
  it("routes to Gemini when it is the default provider", async () => {
    const config = makeConfig(["gemini"]);
    _setAdapter("gemini", makeMockAdapter("gemini", "gemini-2.0-flash", "Gemini result"));

    const result = await routeLLMRequest(
      { systemPrompt: "s", userPrompt: "u" },
      { operation: "analyze", config },
    );

    expect(result).not.toBeNull();
    expect(result!.provenance.provider).toBe("gemini");
    expect(result!.content).toBe("Gemini result");
  });

  it("returns null when no providers are configured", async () => {
    const config = makeConfig([]);
    const result = await routeLLMRequest(
      { systemPrompt: "s", userPrompt: "u" },
      { operation: "analyze", config },
    );
    expect(result).toBeNull();
  });
});

// ── Explicit Provider ───────────────────────────────────────────────────

describe("router: explicit provider", () => {
  it("routes to explicitly specified provider", async () => {
    const config = makeConfig(["gemini", "openai"]);
    _setAdapter("openai", makeMockAdapter("openai", "gpt-4o", "OpenAI result"));

    const result = await routeLLMRequest(
      { systemPrompt: "s", userPrompt: "u" },
      { operation: "analyze", provider: "openai", config },
    );

    expect(result).not.toBeNull();
    expect(result!.provenance.provider).toBe("openai");
    expect(result!.content).toBe("OpenAI result");
  });
});

// ── Fallback ─────────────────────────────────────────────────────────────

describe("router: fallback", () => {
  it("falls back to OpenAI when Gemini fails", async () => {
    const config = makeConfig(["gemini", "openai"]);
    _setAdapter("gemini", makeFailingAdapter("gemini", "gemini-2.0-flash", "Gemini down"));
    _setAdapter("openai", makeMockAdapter("openai", "gpt-4o", "OpenAI fallback result"));

    const result = await routeLLMRequest(
      { systemPrompt: "s", userPrompt: "u" },
      { operation: "analyze", config },
    );

    expect(result).not.toBeNull();
    expect(result!.provenance.provider).toBe("openai");
    expect(result!.provenance.fallbackUsed).toBe(true);
    expect(result!.fallbackChain[0].success).toBe(false);
    expect(result!.fallbackChain[0].provider).toBe("gemini");
    expect(result!.fallbackChain[1].success).toBe(true);
    expect(result!.fallbackChain[1].provider).toBe("openai");
  });

  it("falls back to Anthropic when both Gemini and OpenAI fail", async () => {
    const config = makeConfig(["gemini", "openai", "anthropic"]);
    _setAdapter("gemini", makeFailingAdapter("gemini", "g", "down"));
    _setAdapter("openai", makeFailingAdapter("openai", "o", "down"));
    _setAdapter("anthropic", makeMockAdapter("anthropic", "claude", "Anthropic result"));

    const result = await routeLLMRequest(
      { systemPrompt: "s", userPrompt: "u" },
      { operation: "analyze", config },
    );

    expect(result).not.toBeNull();
    expect(result!.provenance.provider).toBe("anthropic");
    expect(result!.provenance.fallbackUsed).toBe(true);
    expect(result!.fallbackChain).toHaveLength(3);
    expect(result!.fallbackChain[0].success).toBe(false);
    expect(result!.fallbackChain[1].success).toBe(false);
    expect(result!.fallbackChain[2].success).toBe(true);
  });

  it("returns null when all providers fail", async () => {
    const config = makeConfig(["gemini", "openai"]);
    _setAdapter("gemini", makeFailingAdapter("gemini", "g", "down"));
    _setAdapter("openai", makeFailingAdapter("openai", "o", "down"));

    const result = await routeLLMRequest(
      { systemPrompt: "s", userPrompt: "u" },
      { operation: "analyze", config },
    );

    expect(result).toBeNull();
  });

  it("does not fallback when fallbackEnabled is false", async () => {
    const config = { ...makeConfig(["gemini", "openai"]), fallbackEnabled: false };
    _setAdapter("gemini", makeFailingAdapter("gemini", "g", "down"));
    _setAdapter("openai", makeMockAdapter("openai", "o", "should not be used"));

    const result = await routeLLMRequest(
      { systemPrompt: "s", userPrompt: "u" },
      { operation: "analyze", config },
    );

    expect(result).toBeNull();
  });

  it("records full fallback chain in provenance", async () => {
    const config = makeConfig(["gemini", "openai", "anthropic"]);
    _setAdapter("gemini", makeFailingAdapter("gemini", "g", "err1"));
    _setAdapter("openai", makeFailingAdapter("openai", "o", "err2"));
    _setAdapter("anthropic", makeMockAdapter("anthropic", "c", "ok"));

    const result = await routeLLMRequest(
      { systemPrompt: "s", userPrompt: "u" },
      { operation: "analyze", config },
    );

    expect(result!.provenance.fallbackChain).toEqual(["gemini", "openai", "anthropic"]);
  });
});

// ── Consensus Mode ───────────────────────────────────────────────────────

describe("router: consensus mode", () => {
  it("calls all specified providers and collects responses", async () => {
    const config = makeConfig(["gemini", "openai", "anthropic"]);
    _setAdapter("gemini", makeMockAdapter("gemini", "g", "Gemini answer"));
    _setAdapter("openai", makeMockAdapter("openai", "o", "OpenAI answer"));
    _setAdapter("anthropic", makeMockAdapter("anthropic", "c", "Anthropic answer"));

    const result = await callMultipleProviders(
      { systemPrompt: "s", userPrompt: "u" },
      ["gemini", "openai", "anthropic"],
      { operation: "analyze", config },
    );

    expect(result.responses).toHaveLength(3);
    expect(result.allSucceeded).toBe(true);
    expect(result.partialFailure).toBe(false);
    expect(result.responses[0].content).toBe("Gemini answer");
    expect(result.responses[1].content).toBe("OpenAI answer");
    expect(result.responses[2].content).toBe("Anthropic answer");
  });

  it("returns partial results when some providers fail", async () => {
    const config = makeConfig(["gemini", "openai", "anthropic"]);
    _setAdapter("gemini", makeMockAdapter("gemini", "g", "Gemini ok"));
    _setAdapter("openai", makeFailingAdapter("openai", "o", "down"));
    _setAdapter("anthropic", makeMockAdapter("anthropic", "c", "Anthropic ok"));

    const result = await callMultipleProviders(
      { systemPrompt: "s", userPrompt: "u" },
      ["gemini", "openai", "anthropic"],
      { operation: "analyze", config },
    );

    expect(result.responses).toHaveLength(2);
    expect(result.allSucceeded).toBe(false);
    expect(result.partialFailure).toBe(true);
    expect(result.providersConsulted).toEqual(["gemini", "anthropic"]);
  });

  it("returns empty responses when all providers fail", async () => {
    const config = makeConfig(["gemini", "openai"]);
    _setAdapter("gemini", makeFailingAdapter("gemini", "g", "down"));
    _setAdapter("openai", makeFailingAdapter("openai", "o", "down"));

    const result = await callMultipleProviders(
      { systemPrompt: "s", userPrompt: "u" },
      ["gemini", "openai"],
      { operation: "analyze", config },
    );

    expect(result.responses).toHaveLength(0);
    expect(result.allSucceeded).toBe(false);
    expect(result.partialFailure).toBe(false);
  });
});

// ── Availability ─────────────────────────────────────────────────────────

describe("router: availability", () => {
  it("isLLMAvailable returns true when providers configured", () => {
    const config = makeConfig(["gemini"]);
    expect(isLLMAvailable(config)).toBe(true);
  });

  it("isLLMAvailable returns false when no providers configured", () => {
    const config = makeConfig([]);
    expect(isLLMAvailable(config)).toBe(false);
  });
});

// ── Provenance Recording ────────────────────────────────────────────────

describe("router: provenance recording", () => {
  it("records operation, workflowId, and matterId in provenance", async () => {
    const config = makeConfig(["gemini"]);
    _setAdapter("gemini", makeMockAdapter("gemini", "g", "result"));

    const result = await routeLLMRequest(
      { systemPrompt: "s", userPrompt: "u" },
      {
        operation: "classify",
        workflowId: "contractor-dispute",
        matterId: "matter-123",
        config,
      },
    );

    expect(result!.provenance.operation).toBe("classify");
    expect(result!.provenance.workflowId).toBe("contractor-dispute");
    expect(result!.provenance.matterId).toBe("matter-123");
    expect(result!.provenance.promptVersion).toBe("test-1.0.0");
    expect(result!.provenance.outputHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
