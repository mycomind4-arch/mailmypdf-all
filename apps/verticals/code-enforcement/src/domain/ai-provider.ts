/**
 * AI Provider Architecture — Provider-Neutral Multi-LLM Layer
 *
 * Claude is the production primary provider. OpenAI is the first fallback and
 * independent-review provider; Gemini remains an additional fallback.
 *
 * Provider SDKs stay behind adapters. Model output is untrusted until validated.
 * Deterministic authority, evidence, deadline, validation, and human-review gates
 * remain authoritative regardless of which model answers.
 */

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'unknown';

export interface ModelInfo {
  provider: AIProvider;
  model: string;
  version?: string;
}

export interface ProviderConfig {
  provider: AIProvider;
  apiKeyEnvVar: string;
  defaultModel: string;
  available: boolean;
  reason?: string;
}

export function getProviderConfigs(): Record<AIProvider, ProviderConfig> {
  return {
    claude: {
      provider: 'claude',
      apiKeyEnvVar: 'ANTHROPIC_API_KEY',
      defaultModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      available: !!process.env.ANTHROPIC_API_KEY,
      reason: process.env.ANTHROPIC_API_KEY ? undefined : 'ANTHROPIC_API_KEY not set',
    },
    openai: {
      provider: 'openai',
      apiKeyEnvVar: 'OPENAI_API_KEY',
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4o',
      available: !!process.env.OPENAI_API_KEY,
      reason: process.env.OPENAI_API_KEY ? undefined : 'OPENAI_API_KEY not set',
    },
    gemini: {
      provider: 'gemini',
      apiKeyEnvVar: 'GEMINI_API_KEY',
      defaultModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      available: !!process.env.GEMINI_API_KEY,
      reason: process.env.GEMINI_API_KEY ? undefined : 'GEMINI_API_KEY not set',
    },
    unknown: {
      provider: 'unknown',
      apiKeyEnvVar: '',
      defaultModel: '',
      available: false,
      reason: 'Unknown provider',
    },
  };
}

export function getProviderStatus(): Record<string, { configured: boolean; model: string; reason?: string }> {
  const configs = getProviderConfigs();
  const result: Record<string, { configured: boolean; model: string; reason?: string }> = {};
  for (const provider of ['claude', 'openai', 'gemini'] as AIProvider[]) {
    const cfg = configs[provider];
    result[provider] = {
      configured: cfg.available,
      model: cfg.defaultModel,
      reason: cfg.reason,
    };
  }
  return result;
}

export type CETask =
  | 'document_classification'
  | 'notice_extraction'
  | 'complaint_extraction'
  | 'authority_extraction'
  | 'scope_extraction'
  | 'deadline_extraction'
  | 'property_identity_reconciliation'
  | 'jurisdiction_identification'
  | 'procedural_analysis'
  | 'jurisdiction_research_synthesis'
  | 'evidence_gap_analysis'
  | 'contradiction_analysis'
  | 'response_strategy'
  | 'draft_generation'
  | 'draft_critique'
  | 'final_validation'
  | 'correction_issue_extraction'
  | 'recipient_reconciliation'
  | 'property_reconciliation'
  | 'case_identifier_reconciliation'
  | 'scope_reconciliation'
  | 'deadline_reconciliation'
  | 'authority_reconciliation'
  | 'correction_strategy'
  | 'correction_draft_generation'
  | 'correction_draft_critique'
  | 'correction_final_validation';

export interface TaskRoutingConfig {
  task: CETask;
  preferredProvider: AIProvider;
  preferredModel?: string;
  fallbackProviders: AIProvider[];
  requiresIndependentReview: boolean;
  independentReviewProvider?: AIProvider;
  temperature?: number;
  maxRetries: number;
  timeoutMs: number;
  structuredSchema?: string;
}

type RouteOptions = Pick<TaskRoutingConfig, 'requiresIndependentReview' | 'timeoutMs'> &
  Partial<Pick<TaskRoutingConfig, 'temperature' | 'maxRetries' | 'structuredSchema'>>;

function claudeRoute(task: CETask, options: RouteOptions): TaskRoutingConfig {
  return {
    task,
    preferredProvider: 'claude',
    preferredModel: 'claude-sonnet-5',
    fallbackProviders: ['openai', 'gemini'],
    requiresIndependentReview: options.requiresIndependentReview,
    independentReviewProvider: options.requiresIndependentReview ? 'openai' : undefined,
    temperature: options.temperature,
    maxRetries: options.maxRetries ?? 2,
    timeoutMs: options.timeoutMs,
    structuredSchema: options.structuredSchema,
  };
}

export const AI_TASK_CONFIG: Record<CETask, TaskRoutingConfig> = {
  document_classification: claudeRoute('document_classification', { requiresIndependentReview: false, timeoutMs: 15000 }),
  notice_extraction: claudeRoute('notice_extraction', { requiresIndependentReview: false, timeoutMs: 30000 }),
  complaint_extraction: claudeRoute('complaint_extraction', { requiresIndependentReview: false, timeoutMs: 20000 }),
  authority_extraction: claudeRoute('authority_extraction', { requiresIndependentReview: true, timeoutMs: 30000 }),
  scope_extraction: claudeRoute('scope_extraction', { requiresIndependentReview: false, timeoutMs: 20000 }),
  deadline_extraction: claudeRoute('deadline_extraction', { requiresIndependentReview: false, timeoutMs: 15000 }),
  property_identity_reconciliation: claudeRoute('property_identity_reconciliation', { requiresIndependentReview: false, timeoutMs: 25000 }),
  jurisdiction_identification: claudeRoute('jurisdiction_identification', { requiresIndependentReview: false, timeoutMs: 20000 }),
  procedural_analysis: claudeRoute('procedural_analysis', { requiresIndependentReview: true, timeoutMs: 30000 }),
  jurisdiction_research_synthesis: claudeRoute('jurisdiction_research_synthesis', { requiresIndependentReview: false, timeoutMs: 30000 }),
  evidence_gap_analysis: claudeRoute('evidence_gap_analysis', { requiresIndependentReview: false, timeoutMs: 20000 }),
  contradiction_analysis: claudeRoute('contradiction_analysis', { requiresIndependentReview: true, timeoutMs: 30000 }),
  response_strategy: claudeRoute('response_strategy', { requiresIndependentReview: true, timeoutMs: 30000 }),
  draft_generation: claudeRoute('draft_generation', { requiresIndependentReview: false, timeoutMs: 45000 }),
  draft_critique: claudeRoute('draft_critique', { requiresIndependentReview: false, timeoutMs: 30000 }),
  final_validation: claudeRoute('final_validation', { requiresIndependentReview: false, timeoutMs: 20000 }),
  correction_issue_extraction: claudeRoute('correction_issue_extraction', { requiresIndependentReview: false, timeoutMs: 25000 }),
  recipient_reconciliation: claudeRoute('recipient_reconciliation', { requiresIndependentReview: true, timeoutMs: 25000 }),
  property_reconciliation: claudeRoute('property_reconciliation', { requiresIndependentReview: false, timeoutMs: 25000 }),
  case_identifier_reconciliation: claudeRoute('case_identifier_reconciliation', { requiresIndependentReview: false, timeoutMs: 20000 }),
  scope_reconciliation: claudeRoute('scope_reconciliation', { requiresIndependentReview: false, timeoutMs: 20000 }),
  deadline_reconciliation: claudeRoute('deadline_reconciliation', { requiresIndependentReview: true, timeoutMs: 20000 }),
  authority_reconciliation: claudeRoute('authority_reconciliation', { requiresIndependentReview: true, timeoutMs: 30000 }),
  correction_strategy: claudeRoute('correction_strategy', { requiresIndependentReview: true, timeoutMs: 30000 }),
  correction_draft_generation: claudeRoute('correction_draft_generation', { requiresIndependentReview: false, timeoutMs: 45000 }),
  correction_draft_critique: claudeRoute('correction_draft_critique', { requiresIndependentReview: false, timeoutMs: 30000 }),
  correction_final_validation: claudeRoute('correction_final_validation', { requiresIndependentReview: false, timeoutMs: 20000 }),
};

/** Provider order for a task. Unknown is never returned. */
export function getProviderAttemptOrder(task: CETask): Exclude<AIProvider, 'unknown'>[] {
  const route = AI_TASK_CONFIG[task];
  const order = [route.preferredProvider, ...route.fallbackProviders]
    .filter((provider): provider is Exclude<AIProvider, 'unknown'> => provider !== 'unknown');
  return [...new Set(order)];
}

export interface ProviderAdapter {
  name: AIProvider;
  invoke(prompt: string, model: string): Promise<{ output: string; confidence: number; latencyMs: number }>;
  isAvailable(): boolean;
}

export interface AIInvocation {
  caseId?: string;
  task: CETask;
  provider: AIProvider;
  model: string;
  modelVersion?: string;
  promptVersion?: string;
  workflowVersion?: string;
  timestamp: string;
  inputProvenance?: string;
  output?: string;
  confidence?: number;
  validationState: 'pending' | 'validated' | 'rejected' | 'failed';
  fallbackUsed?: boolean;
  latencyMs?: number;
  error?: string;
  correlationId?: string;
}

export function createInvocation(task: CETask, caseId?: string): AIInvocation {
  const routing = AI_TASK_CONFIG[task];
  const configs = getProviderConfigs();
  const model = routing.preferredModel || configs[routing.preferredProvider].defaultModel;
  return {
    caseId,
    task,
    provider: routing.preferredProvider,
    model,
    promptVersion: '1.1',
    workflowVersion: '1.0.0',
    timestamp: new Date().toISOString(),
    inputProvenance: 'user-upload',
    validationState: 'pending',
  };
}

export class CircuitBreaker {
  private failures = new Map<AIProvider, number>();
  private lastFailure = new Map<AIProvider, number>();

  constructor(private threshold = 3, private resetMs = 60000) {}

  recordFailure(provider: AIProvider): void {
    this.failures.set(provider, (this.failures.get(provider) ?? 0) + 1);
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
      this.recordSuccess(provider);
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

export function isTimeout(error: unknown): boolean {
  return error instanceof Error && (
    error.message.toLowerCase().includes('timeout') ||
    error.message.toLowerCase().includes('timed out') ||
    error.name === 'AbortError'
  );
}

export function validateAIOutput(
  output: string | undefined,
  task: CETask,
  minConfidence?: number,
): { valid: boolean; reason?: string; validationState: AIInvocation['validationState'] } {
  if (!output || output.trim().length === 0) {
    return { valid: false, reason: 'Empty output', validationState: 'failed' };
  }

  const finalValidationTasks: CETask[] = ['final_validation', 'correction_final_validation'];
  if (finalValidationTasks.includes(task) && /i think|i believe|maybe|perhaps|possibly/i.test(output)) {
    return { valid: false, reason: 'Hedging language in validation output', validationState: 'rejected' };
  }

  void minConfidence;
  return { valid: true, validationState: 'validated' };
}

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
  enableCache: false,
};

export interface MultiModelResult {
  primary: AIInvocation & { output: string; confidence: number };
  independentReview?: AIInvocation & { output: string; confidence: number };
  agreement: 'AGREEMENT' | 'DISAGREEMENT' | 'NO_REVIEW';
  disagreement?: ModelDisagreement;
}

export interface ModelDisagreement {
  task: CETask;
  providerA: AIProvider;
  modelA: string;
  resultA: string;
  providerB: AIProvider;
  modelB: string;
  resultB: string;
  sourceEvidence: string;
  disagreementType: string;
  severity: 'high' | 'medium' | 'low';
  requiresHumanReview: boolean;
}

export function compareResults(
  primary: { output: string; provider: AIProvider; model: string },
  review: { output: string; provider: AIProvider; model: string },
  task: CETask,
  sourceEvidence: string,
): { agreement: 'AGREEMENT' | 'DISAGREEMENT'; disagreement?: ModelDisagreement } {
  const a = primary.output.trim().toLowerCase();
  const b = review.output.trim().toLowerCase();
  const similarity = computeSimilarity(a, b);
  if (similarity > 0.85) return { agreement: 'AGREEMENT' };

  return {
    agreement: 'DISAGREEMENT',
    disagreement: {
      task,
      providerA: primary.provider,
      modelA: primary.model,
      resultA: primary.output,
      providerB: review.provider,
      modelB: review.model,
      resultB: review.output,
      sourceEvidence,
      disagreementType: 'semantic_divergence',
      severity: 'high',
      requiresHumanReview: true,
    },
  };
}

function computeSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  const intersection = [...wordsA].filter((word) => wordsB.has(word)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}
