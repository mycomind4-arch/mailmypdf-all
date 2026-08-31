import { describe, it, expect } from 'vitest';
import {
  TASK_ROUTING,
  DEFAULT_ROUTER_OPTIONS,
  createInvocation,
  CircuitBreaker,
  isTimeout,
  validateAIOutput,
  type AIProvider,
  type AITask,
} from './ai-provider';

describe('AI Provider Architecture', () => {
  it('has routing for all task types', () => {
    const tasks: AITask[] = ['conversation', 'document_analysis', 'extraction', 'rfe_analysis',
      'evidence_analysis', 'authority_resolution', 'strategy_generation', 'drafting',
      'translation', 'validation', 'xray', 'classification'];
    for (const task of tasks) {
      expect(TASK_ROUTING[task], `Missing routing for ${task}`).toBeDefined();
      expect(TASK_ROUTING[task].preferredProvider).toBeDefined();
      expect(TASK_ROUTING[task].preferredModel).toBeDefined();
    }
  });

  it('routes classification to cheap model', () => {
    expect(TASK_ROUTING.classification.preferredModel).toContain('mini');
  });

  it('routes X-Ray to strong model with min confidence', () => {
    expect(TASK_ROUTING.xray.minConfidence).toBeGreaterThanOrEqual(0.8);
  });

  it('every task has a fallback provider', () => {
    for (const task of Object.keys(TASK_ROUTING) as AITask[]) {
      expect(TASK_ROUTING[task].fallbackProvider, `No fallback for ${task}`).toBeDefined();
    }
  });

  it('creates invocation with full provenance', () => {
    const inv = createInvocation('rfe_analysis', 'case-1');
    expect(inv.task).toBe('rfe_analysis');
    expect(inv.caseId).toBe('case-1');
    expect(inv.provider).toBeDefined();
    expect(inv.model).toBeDefined();
    expect(inv.timestamp).toBeDefined();
    expect(inv.promptVersion).toBeDefined();
    expect(inv.policyVersion).toBeDefined();
    expect(inv.validationState).toBe('pending');
  });

  it('does not cache sensitive data by default', () => {
    expect(DEFAULT_ROUTER_OPTIONS.enableCache).toBe(false);
  });

  it('has reasonable timeout', () => {
    expect(DEFAULT_ROUTER_OPTIONS.timeoutMs).toBeGreaterThanOrEqual(10000);
  });
});

describe('Circuit Breaker', () => {
  it('starts in closed state', () => {
    const cb = new CircuitBreaker(3, 60000);
    expect(cb.isAvailable('openai')).toBe(true);
    expect(cb.getState().openai.open).toBe(false);
  });

  it('opens after threshold failures', () => {
    const cb = new CircuitBreaker(3, 60000);
    cb.recordFailure('openai');
    cb.recordFailure('openai');
    cb.recordFailure('openai');
    expect(cb.isAvailable('openai')).toBe(false);
    expect(cb.getState().openai.open).toBe(true);
  });

  it('resets after reset period', () => {
    const cb = new CircuitBreaker(1, 50); // 50ms reset
    cb.recordFailure('openai');
    expect(cb.isAvailable('openai')).toBe(false);
    // Wait for reset
    return new Promise(resolve => setTimeout(resolve, 60)).then(() => {
      expect(cb.isAvailable('openai')).toBe(true);
    });
  });

  it('success resets failure count', () => {
    const cb = new CircuitBreaker(3, 60000);
    cb.recordFailure('openai');
    cb.recordFailure('openai');
    cb.recordSuccess('openai');
    expect(cb.isAvailable('openai')).toBe(true);
  });

  it('tracks providers independently', () => {
    const cb = new CircuitBreaker(1, 60000);
    cb.recordFailure('openai');
    expect(cb.isAvailable('openai')).toBe(false);
    expect(cb.isAvailable('claude')).toBe(true);
  });
});

describe('Timeout Handling', () => {
  it('detects timeout errors', () => {
    expect(isTimeout(new Error('Request timed out'))).toBe(true);
    expect(isTimeout(new Error('timeout exceeded'))).toBe(true);
    expect(isTimeout(new Error('connection refused'))).toBe(false);
  });

  it('detects AbortError', () => {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    expect(isTimeout(err)).toBe(true);
  });
});

describe('AI Output Validation', () => {
  it('rejects empty output', () => {
    const result = validateAIOutput('', 'conversation');
    expect(result.valid).toBe(false);
    expect(result.validationState).toBe('failed');
  });

  it('rejects undefined output', () => {
    const result = validateAIOutput(undefined, 'conversation');
    expect(result.valid).toBe(false);
  });

  it('accepts valid output', () => {
    const result = validateAIOutput('This is a valid response.', 'conversation');
    expect(result.valid).toBe(true);
    expect(result.validationState).toBe('validated');
  });

  it('rejects hedging language in X-Ray output', () => {
    const result = validateAIOutput('I think this is safe', 'xray');
    expect(result.valid).toBe(false);
    expect(result.validationState).toBe('rejected');
  });

  it('rejects hedging language in validation output', () => {
    const result = validateAIOutput('Maybe this is correct', 'validation');
    expect(result.valid).toBe(false);
  });

  it('allows hedging in conversation (low-stakes)', () => {
    const result = validateAIOutput('I think you should upload your RFE', 'conversation');
    expect(result.valid).toBe(true);
  });
});
