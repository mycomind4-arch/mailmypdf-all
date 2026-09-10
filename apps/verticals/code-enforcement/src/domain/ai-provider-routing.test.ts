import { describe, expect, it } from 'vitest';
import {
  AI_TASK_CONFIG,
  createInvocation,
  getProviderAttemptOrder,
  getProviderConfigs,
  type CETask,
} from './ai-provider';
import {
  CORRECTION_INDEPENDENT_REVIEW_TASKS,
  CORRECTION_TASK_CONFIG,
} from './correction-ai-config';

describe('Code Enforcement Claude-first routing', () => {
  it('routes every Code Enforcement AI task Claude -> OpenAI -> Gemini', () => {
    for (const task of Object.keys(AI_TASK_CONFIG) as CETask[]) {
      const config = AI_TASK_CONFIG[task];
      expect(config.preferredProvider, `${task} primary`).toBe('claude');
      expect(config.preferredModel, `${task} model`).toBe('claude-sonnet-5');
      expect(getProviderAttemptOrder(task)).toEqual(['claude', 'openai', 'gemini']);
    }
  });

  it('uses OpenAI for independent review when required', () => {
    for (const config of Object.values(AI_TASK_CONFIG)) {
      if (config.requiresIndependentReview) {
        expect(config.independentReviewProvider).toBe('openai');
        expect(config.independentReviewProvider).not.toBe(config.preferredProvider);
      }
    }
  });

  it('keeps the correction-specific config aligned with the shared policy', () => {
    for (const [task, config] of Object.entries(CORRECTION_TASK_CONFIG)) {
      expect(config.preferredProvider, `${task} primary`).toBe('claude');
      expect(config.preferredModel, `${task} model`).toBe('claude-sonnet-5');
      expect(config.fallbackProviders).toEqual(['openai', 'gemini']);
    }

    for (const task of CORRECTION_INDEPENDENT_REVIEW_TASKS) {
      expect(CORRECTION_TASK_CONFIG[task].independentReviewProvider).toBe('openai');
    }
  });

  it('records Claude provenance for a primary invocation', () => {
    const invocation = createInvocation('authority_extraction', 'case-1');
    expect(invocation.provider).toBe('claude');
    expect(invocation.model).toBe('claude-sonnet-5');
  });

  it('uses Claude Sonnet 5 as the configured Claude default', () => {
    expect(getProviderConfigs().claude.defaultModel).toBe(process.env.ANTHROPIC_MODEL || 'claude-sonnet-5');
  });
});
