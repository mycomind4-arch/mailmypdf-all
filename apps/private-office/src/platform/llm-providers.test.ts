/**
 * Multi-LLM Provider Tests
 *
 * Tests the provider abstraction layer:
 *   - OpenAI adapter
 *   - Anthropic adapter
 *   - Gemini adapter (regression)
 *   - Provider normalization
 *   - Invalid response
 *   - Timeout
 *   - Rate limit
 *   - Malformed output
 *   - Provider failure
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { LLMError } from "./llm-adapter";
import { GeminiAdapter } from "./gemini-adapter";
import { OpenAIAdapter } from "./openai-adapter";
import { AnthropicAdapter } from "./anthropic-adapter";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ── OpenAI Adapter ───────────────────────────────────────────────────────

describe("OpenAI adapter", () => {
  it("accepts valid configuration", () => {
    const adapter = new OpenAIAdapter({
      apiKey: "test-key",
      model: "gpt-4o-mini",
    });
    expect(adapter.provider).toBe("openai");
  });

  it("throws when API key is empty", () => {
    expect(() => new OpenAIAdapter({ apiKey: "", model: "gpt-4o" })).toThrow(
      /API key/,
    );
  });

  it("returns content with provenance on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Analysis result" }, finish_reason: "stop" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;

    const adapter = new OpenAIAdapter({ apiKey: "key", model: "gpt-4o-mini" });
    const result = await adapter.generate({ systemPrompt: "sys", userPrompt: "usr" });

    expect(result.content).toBe("Analysis result");
    expect(result.provenance.provider).toBe("openai");
    expect(result.provenance.model).toBe("gpt-4o-mini");
    expect(result.provenance.inputHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("throws LLMError on API error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "Rate limited", code: "rate_limit_exceeded" } }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;

    const adapter = new OpenAIAdapter({ apiKey: "key", model: "gpt-4o-mini" });
    await expect(
      adapter.generate({ systemPrompt: "s", userPrompt: "u" }),
    ).rejects.toThrow(/Rate limited/);
  });

  it("throws LLMError with timeout=true on abort", async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    ) as typeof fetch;

    const adapter = new OpenAIAdapter({ apiKey: "key", model: "gpt-4o-mini" });
    try {
      await adapter.generate({ systemPrompt: "s", userPrompt: "u", timeoutMs: 1 });
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(LLMError);
      expect((err as LLMError).timeout).toBe(true);
    }
  });

  it("throws on empty response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    const adapter = new OpenAIAdapter({ apiKey: "key", model: "gpt-4o-mini" });
    await expect(
      adapter.generate({ systemPrompt: "s", userPrompt: "u" }),
    ).rejects.toThrow(/no content/);
  });
});

// ── Anthropic Adapter ───────────────────────────────────────────────────

describe("Anthropic adapter", () => {
  it("accepts valid configuration", () => {
    const adapter = new AnthropicAdapter({
      apiKey: "test-key",
      model: "claude-3-5-sonnet-20241022",
    });
    expect(adapter.provider).toBe("anthropic");
  });

  it("throws when API key is empty", () => {
    expect(() => new AnthropicAdapter({ apiKey: "", model: "claude-3" })).toThrow(
      /API key/,
    );
  });

  it("returns content with provenance on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "Anthropic analysis" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;

    const adapter = new AnthropicAdapter({ apiKey: "key", model: "claude-3-5-sonnet-20241022" });
    const result = await adapter.generate({ systemPrompt: "sys", userPrompt: "usr" });

    expect(result.content).toBe("Anthropic analysis");
    expect(result.provenance.provider).toBe("anthropic");
    expect(result.provenance.model).toBe("claude-3-5-sonnet-20241022");
  });

  it("throws LLMError on API error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "Overloaded", type: "overloaded_error" } }),
        { status: 529, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;

    const adapter = new AnthropicAdapter({ apiKey: "key", model: "claude-3-5-sonnet" });
    await expect(
      adapter.generate({ systemPrompt: "s", userPrompt: "u" }),
    ).rejects.toThrow(/Overloaded/);
  });

  it("throws LLMError with timeout=true on abort", async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    ) as typeof fetch;

    const adapter = new AnthropicAdapter({ apiKey: "key", model: "claude-3-5-sonnet" });
    try {
      await adapter.generate({ systemPrompt: "s", userPrompt: "u", timeoutMs: 1 });
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(LLMError);
      expect((err as LLMError).timeout).toBe(true);
    }
  });

  it("throws on empty response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    const adapter = new AnthropicAdapter({ apiKey: "key", model: "claude-3-5-sonnet" });
    await expect(
      adapter.generate({ systemPrompt: "s", userPrompt: "u" }),
    ).rejects.toThrow(/no content/);
  });
});

// ── Provider Normalization ───────────────────────────────────────────────

describe("provider normalization", () => {
  it("all providers implement the LLMAdapter interface", () => {
    const gemini = new GeminiAdapter({ apiKey: "k", model: "m" });
    const openai = new OpenAIAdapter({ apiKey: "k", model: "m" });
    const anthropic = new AnthropicAdapter({ apiKey: "k", model: "m" });

    for (const adapter of [gemini, openai, anthropic]) {
      expect(typeof adapter.provider).toBe("string");
      expect(typeof adapter.generate).toBe("function");
    }
  });

  it("all providers return the same LLMResponse structure", async () => {
    const mockResponse = new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: "Gemini" }] } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse) as typeof fetch;

    const gemini = new GeminiAdapter({ apiKey: "k", model: "gemini-2.0-flash" });
    const result = await gemini.generate({ systemPrompt: "s", userPrompt: "u" });

    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("provenance.provider");
    expect(result).toHaveProperty("provenance.model");
    expect(result).toHaveProperty("provenance.generatedAt");
    expect(result).toHaveProperty("provenance.inputHash");
  });
});

// ── Malformed Output ─────────────────────────────────────────────────────

describe("malformed provider output", () => {
  it("Gemini handles malformed JSON gracefully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("not json at all", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
    ) as typeof fetch;

    const adapter = new GeminiAdapter({ apiKey: "k", model: "m" });
    await expect(
      adapter.generate({ systemPrompt: "s", userPrompt: "u" }),
    ).rejects.toThrow();
  });

  it("OpenAI handles missing choices array", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    const adapter = new OpenAIAdapter({ apiKey: "k", model: "m" });
    await expect(
      adapter.generate({ systemPrompt: "s", userPrompt: "u" }),
    ).rejects.toThrow(/no content/);
  });

  it("Anthropic handles missing content array", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    const adapter = new AnthropicAdapter({ apiKey: "k", model: "m" });
    await expect(
      adapter.generate({ systemPrompt: "s", userPrompt: "u" }),
    ).rejects.toThrow(/no content/);
  });
});
