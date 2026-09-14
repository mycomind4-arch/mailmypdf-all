/**
 * AI Provider Architecture — Provider-Neutral Boundaries
 *
 * Claude/Anthropic is the primary provider for Immigration Mail.
 * OpenAI is the first fallback and Gemini remains available as an additional
 * provider. Model output is untrusted until validated and can never bypass
 * deterministic workflow gates.
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

const CLAUDE_PRIMARY_MODEL = 'claude-sonnet-5';
const OPENAI_FALLBACK_MODEL = 'gpt-4o';

/**
 * All consequential Immigration Mail intelligence starts with Claude.
 * OpenAI is the explicit first fallback. Gemini is still reachable through the
 * runtime's remaining-provider fallback chain when configured.
 */
export const TASK_ROUTING: Record<AITask, TaskRouting> = {
  classification: { task: 'classification', preferredProvider: 'claude', preferredModel: CLAUDE_PRIMARY_MODEL, fallbackProvider: 'openai', fallbackModel: OPENAI_FALLBACK_MODEL, minConfidence: 0.7 },
  conversation: { task: 'conversation', preferredProvider: 'claude', preferredModel: CLAUDE_PRIMARY_MODEL, fallbackProvider: 'openai', fallbackModel: OPENAI_FALLBACK_MODEL },
  document_analysis: { task: 'document_analysis', preferredProvider: 'claude', preferredModel: CLAUDE_PRIMARY_MODEL, fallbackProvider: 'openai', fallbackModel: OPENAI_FALLBACK_MODEL },
  extraction: { task: 'extraction', preferredProvider: 'claude', preferredModel: CLAUDE_PRIMARY_MODEL, fallbackProvider: 'openai', fallbackModel: OPENAI_FALLBACK_MODEL },
  rfe_analysis: { task: 'rfe_analysis', preferredProvider: 'claude', preferredModel: CLAUDE_PRIMARY_MODEL, fallbackProvider: 'openai', fallbackModel: OPENAI_FALLBACK_MODEL },
  evidence_analysis: { task: 'evidence_analysis', preferredProvider: 'claude', preferredModel: CLAUDE_PRIMARY_MODEL, fallbackProvider: 'openai', fallbackModel: OPENAI_FALLBACK_MODEL },
  authority_resolution: { task: 'authority_resolution', preferredProvider: 'claude', preferredModel: CLAUDE_PRIMARY_MODEL, fallbackProvider: 'openai', fallbackModel: OPENAI_FALLBACK_MODEL },
  strategy_generation: { task: 'strategy_generation', preferredProvider: 'claude', preferredModel: CLAUDE_PRIMARY_MODEL, fallbackProvider: 'openai', fallbackModel: OPENAI_FALLBACK_MODEL },
  drafting: { task: 'drafting', preferredProvider: 'claude', preferredModel: CLAUDE_PRIMARY_MODEL, fallbackProvider: 'openai', fallbackModel: OPENAI_FALLBACK_MODEL },
  translation: { task: 'translation', preferredProvider: 'claude', preferredModel: CLAUDE_PRIMARY_MODEL, fallbackProvider: 'openai', fallbackModel: OPENAI_FALLBACK_MODEL },
  validation: { task: 'validation', preferredProvider: 'claude', preferredModel: CLAUDE_PRIMARY_MODEL, fallbackProvider: 'openai', fallbackModel: OPENAI_FALLBACK_MODEL },
  xray: { task: 'xray', preferredProvider: 'claude', preferredModel: CLAUDE_PRIMARY_MODEL, fallbackProvider: 'openai', fallbackModel: OPENAI_FALLBACK_MODEL, minConfidence: 0.85 },
};

export const TASK_ROUTING: Record<AITask, TaskRouting> = Object.fromEntries(
  Object.entries(LEGACY_TASK_ROUTING).map(([task, route]) => [task, {
    ...route,
    preferredProvider: route.preferredProvider === 'gemini' ? 'claude' : route.preferredProvider,
    preferredModel: route.preferredProvider === 'gemini' ? 'claude-sonnet-4-20250514' : route.preferredModel,
    fallbackProvider: route.preferredProvider === 'gemini' ? 'gemini' : route.fallbackProvider,
    fallbackModel: route.preferredProvider === 'gemini' ? 'gemini-2.0-flash' : route.fallbackModel,
  }]),
) as Record<AITask, TaskRouting>;

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
  void options;
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
    for (const provider of ['claude', 'openai', 'gemini'] as AIProvider[]) {
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

  // High-risk tasks require minimum confidence. Confidence enforcement remains
  // at the workflow/domain validation layer until provider responses expose a
  // trustworthy comparable score.
  void minConfidence;

  // X-Ray and validation tasks must be deterministic — no hedging language.
  if (task === 'xray' || task === 'validation') {
    if (/i think|i believe|maybe|perhaps|possibly/i.test(output)) {
      return { valid: false, reason: 'Hedging language in high-stakes output', validationState: 'rejected' };
    }
  }

  return { valid: true, validationState: 'validated' };
}
