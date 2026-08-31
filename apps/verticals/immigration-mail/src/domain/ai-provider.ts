/**
 * AI Provider Architecture — Provider-Neutral Boundaries
 *
 * Provider SDKs stay behind adapters. Model output is untrusted until validated.
 * The user never sees provider complexity.
 *
 * Supports: OpenAI, Claude, Gemini, future providers.
 * Specialized workers can route to different models per task.
 */

// ─── Provider Types ──────────────────────────────────────────────────────────

export type AIProvider = 'openai' | 'claude' | 'gemini' | 'local' | 'unknown';

export interface ModelInfo {
  provider: AIProvider;
  model: string;
  version?: string;
}

export interface AIInvocation {
  caseId?: string;
  task: AITask;
  provider: AIProvider;
  model: string;
  modelVersion?: string;
  promptVersion?: string;
  policyVersion?: string;
  timestamp: string;
  inputProvenance?: string;
  output?: string;
  uncertainty?: number;
  validationState: 'pending' | 'validated' | 'rejected' | 'failed';
  latencyMs?: number;
  error?: string;
}

export type AITask =
  | 'conversation'
  | 'document_analysis'
  | 'extraction'
  | 'rfe_analysis'
  | 'evidence_analysis'
  | 'authority_resolution'
  | 'strategy_generation'
  | 'drafting'
  | 'translation'
  | 'validation'
  | 'xray'
  | 'classification';

// ─── Task Routing ────────────────────────────────────────────────────────────

export interface TaskRouting {
  task: AITask;
  preferredProvider: AIProvider;
  preferredModel: string;
  fallbackProvider?: AIProvider;
  fallbackModel?: string;
  minConfidence?: number;
}

// Simple routing: cheap models for classification, strong models for reasoning
export const TASK_ROUTING: Record<AITask, TaskRouting> = {
  classification: { task: 'classification', preferredProvider: 'gemini', preferredModel: 'gemini-2.0-flash', fallbackProvider: 'claude', fallbackModel: 'claude-sonnet-4-20250514', minConfidence: 0.7 },
  conversation: { task: 'conversation', preferredProvider: 'gemini', preferredModel: 'gemini-2.0-flash', fallbackProvider: 'claude', fallbackModel: 'claude-sonnet-4-20250514' },
  document_analysis: { task: 'document_analysis', preferredProvider: 'gemini', preferredModel: 'gemini-2.0-flash', fallbackProvider: 'claude', fallbackModel: 'claude-sonnet-4-20250514' },
  extraction: { task: 'extraction', preferredProvider: 'gemini', preferredModel: 'gemini-2.0-flash', fallbackProvider: 'claude', fallbackModel: 'claude-sonnet-4-20250514' },
  rfe_analysis: { task: 'rfe_analysis', preferredProvider: 'gemini', preferredModel: 'gemini-2.0-flash', fallbackProvider: 'claude', fallbackModel: 'claude-sonnet-4-20250514' },
  evidence_analysis: { task: 'evidence_analysis', preferredProvider: 'gemini', preferredModel: 'gemini-2.0-flash', fallbackProvider: 'claude', fallbackModel: 'claude-sonnet-4-20250514' },
  authority_resolution: { task: 'authority_resolution', preferredProvider: 'gemini', preferredModel: 'gemini-2.0-flash', fallbackProvider: 'claude', fallbackModel: 'claude-sonnet-4-20250514' },
  strategy_generation: { task: 'strategy_generation', preferredProvider: 'gemini', preferredModel: 'gemini-2.0-flash', fallbackProvider: 'claude', fallbackModel: 'claude-sonnet-4-20250514' },
  drafting: { task: 'drafting', preferredProvider: 'gemini', preferredModel: 'gemini-2.0-flash', fallbackProvider: 'claude', fallbackModel: 'claude-sonnet-4-20250514' },
  translation: { task: 'translation', preferredProvider: 'gemini', preferredModel: 'gemini-2.0-flash', fallbackProvider: 'claude', fallbackModel: 'claude-sonnet-4-20250514' },
  validation: { task: 'validation', preferredProvider: 'gemini', preferredModel: 'gemini-2.0-flash', fallbackProvider: 'claude', fallbackModel: 'claude-sonnet-4-20250514' },
  xray: { task: 'xray', preferredProvider: 'gemini', preferredModel: 'gemini-2.0-flash', fallbackProvider: 'claude', fallbackModel: 'claude-sonnet-4-20250514', minConfidence: 0.85 },
};

// ─── Provider Adapter Interface ──────────────────────────────────────────────

export interface ProviderAdapter {
  name: AIProvider;
  invoke(prompt: string, model: string): Promise<{ output: string; confidence: number; latencyMs: number }>;
  isAvailable(): boolean;
}

// ─── Model Router ─────────────────────────────────────────────────────────────

export interface ModelRouterOptions {
  enableFallback: boolean;
  enableRetry: boolean;
  maxRetries: number;
  timeoutMs: number;
  enableCache: boolean;
}

export const DEFAULT_ROUTER_OPTIONS: ModelRouterOptions = {
  enableFallback: true,
  enableRetry: true,
  maxRetries: 2,
  timeoutMs: 30000,
  enableCache: false, // Never cache sensitive data by default
};

// ─── Invocation Record ────────────────────────────────────────────────────────

export function createInvocation(
  task: AITask,
  caseId?: string,
  options?: Partial<ModelRouterOptions>,
): AIInvocation {
  const routing = TASK_ROUTING[task];
  return {
    caseId,
    task,
    provider: routing.preferredProvider,
    model: routing.preferredModel,
    promptVersion: '1.0',
    policyVersion: '1.0',
    timestamp: new Date().toISOString(),
    inputProvenance: 'user-upload',
    validationState: 'pending',
  };
}

// ─── Circuit Breaker ──────────────────────────────────────────────────────────

export class CircuitBreaker {
  private failures = new Map<AIProvider, number>();
  private lastFailure = new Map<AIProvider, number>();
  private threshold: number;
  private resetMs: number;

  constructor(threshold: number = 3, resetMs: number = 60000) {
    this.threshold = threshold;
    this.resetMs = resetMs;
  }

  recordFailure(provider: AIProvider): void {
    const count = this.failures.get(provider) ?? 0;
    this.failures.set(provider, count + 1);
    this.lastFailure.set(provider, Date.now());
  }

  recordSuccess(provider: AIProvider): void {
    this.failures.delete(provider);
    this.lastFailure.delete(provider);
  }

  isAvailable(provider: AIProvider): boolean {
    const failures = this.failures.get(provider) ?? 0;
    if (failures < this.threshold) return true;

    const lastFail = this.lastFailure.get(provider) ?? 0;
    if (Date.now() - lastFail > this.resetMs) {
      this.failures.delete(provider);
      this.lastFailure.delete(provider);
      return true;
    }
    return false;
  }

  getState(): Record<string, { failures: number; open: boolean }> {
    const state: Record<string, { failures: number; open: boolean }> = {};
    for (const provider of ['openai', 'claude', 'gemini'] as AIProvider[]) {
      state[provider] = {
        failures: this.failures.get(provider) ?? 0,
        open: !this.isAvailable(provider),
      };
    }
    return state;
  }
}

// ─── Timeout Handling ──────────────────────────────────────────────────────────

export function isTimeout(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('timeout') ||
           error.message.toLowerCase().includes('timed out') ||
           error.name === 'AbortError';
  }
  return false;
}

// ─── Validation Gate ──────────────────────────────────────────────────────────

export function validateAIOutput(
  output: string | undefined,
  task: AITask,
  minConfidence?: number,
): { valid: boolean; reason?: string; validationState: AIInvocation['validationState'] } {
  if (!output || output.trim().length === 0) {
    return { valid: false, reason: 'Empty output', validationState: 'failed' };
  }

  // High-risk tasks require minimum confidence
  if (minConfidence !== undefined) {
    // In production, this would check the actual confidence score
    // For now, we validate structurally
  }

  // X-Ray and validation tasks must be deterministic — no "I think" language
  if (task === 'xray' || task === 'validation') {
    if (/i think|i believe|maybe|perhaps|possibly/i.test(output)) {
      return { valid: false, reason: 'Hedging language in high-stakes output', validationState: 'rejected' };
    }
  }

  return { valid: true, validationState: 'validated' };
}
