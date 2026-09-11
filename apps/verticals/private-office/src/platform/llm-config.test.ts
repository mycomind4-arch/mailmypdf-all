import { afterEach, describe, expect, it } from "vitest";
import { buildLLMConfig } from "./llm-config";

const original = {
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL,
  provider: process.env.LLM_PROVIDER,
  geminiKey: process.env.GEMINI_API_KEY,
  googleAiKey: process.env.GOOGLE_AI_API_KEY,
  openaiKey: process.env.OPENAI_API_KEY,
};

afterEach(() => {
  if (original.anthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = original.anthropicKey;
  if (original.anthropicModel === undefined) delete process.env.ANTHROPIC_MODEL;
  else process.env.ANTHROPIC_MODEL = original.anthropicModel;
  if (original.provider === undefined) delete process.env.LLM_PROVIDER;
  else process.env.LLM_PROVIDER = original.provider;
  if (original.geminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = original.geminiKey;
  if (original.googleAiKey === undefined) delete process.env.GOOGLE_AI_API_KEY;
  else process.env.GOOGLE_AI_API_KEY = original.googleAiKey;
  if (original.openaiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = original.openaiKey;
});

describe("buildLLMConfig", () => {
  it("uses Anthropic when it is the only configured provider", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.ANTHROPIC_MODEL = "test-model";
    delete process.env.LLM_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const config = buildLLMConfig();

    expect(config.defaultProvider).toBe("anthropic");
    expect(config.providers.anthropic?.model).toBe("test-model");
  });

  it("does not select an Anthropic model the account did not configure", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.LLM_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    expect(buildLLMConfig().providers.anthropic).toBeUndefined();
  });
});
