import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAvailableProviders, getDefaultModel } from './llm-service';

const ORIGINAL_ENV = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};

function restore(name: keyof typeof ORIGINAL_ENV) {
  const value = ORIGINAL_ENV[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe('Immigration Mail LLM runtime defaults', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic';
    process.env.OPENAI_API_KEY = 'test-openai';
    process.env.GEMINI_API_KEY = 'test-gemini';
  });

  afterEach(() => {
    restore('ANTHROPIC_API_KEY');
    restore('OPENAI_API_KEY');
    restore('GEMINI_API_KEY');
  });

  it('orders configured providers Claude, OpenAI, then Gemini', () => {
    expect(getAvailableProviders()).toEqual(['claude', 'openai', 'gemini']);
  });

  it('uses Claude Sonnet 5 as the Claude default model', () => {
    expect(getDefaultModel('claude')).toBe('claude-sonnet-5');
  });

  it('preserves Claude as the first available provider when all keys are present', () => {
    expect(getAvailableProviders()[0]).toBe('claude');
  });
});
