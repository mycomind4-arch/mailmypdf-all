/**
 * AI Provider Architecture — Provider-Neutral Multi-LLM Layer
 *
 * Gemini is the DEFAULT/primary provider.
 * OpenAI and Claude are fallback/independent-review providers.
 *
 * Provider SDKs stay behind adapters. Model output is untrusted until validated.
 * Supports task-specific routing, independent review, and disagreement detection.
 */

// ─── Provider Types ──────────────────────────────────────────────────────────

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

// ─── Provider Health / Configuration Status ──────────────────────────────────

export function getProviderConfigs(): Record<AIProvider, ProviderConfig> {
  return {
    gemini: {
      provider: 'gemini',
      apiKeyEnvVar: 'GEMINI_API_KEY',
      defaultModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      available: !!process.env.GEMINI_API_KEY,
      reason: process.env.GEMINI_API_KEY ? undefined : 'GEMINI_API_KEY not set',
    },
    openai: {
      provider: 'openai',
      apiKeyEnvVar: 'OPENAI_API_KEY',
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4o',
      available: !!process.env.OPENAI_API_KEY,
      reason: process.env.OPENAI_API_KEY ? undefined : 'OPENAI_API_KEY not set',
    },
    claude: {
      provider: 'claude',
      apiKeyEnvVar: 'ANTHROPIC_API_KEY',
      defaultModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      available: !!process.env.ANTHROPIC_API_KEY,
      reason: process.env.ANTHROPIC_API_KEY ? undefined : 'ANTHROPIC_API_KEY not set',
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
  for (const [key, cfg] of Object.entries(configs)) {
    if (key === 'unknown') continue;
    result[key] = {
      configured: cfg.available,
      model: cfg.defaultModel,
      reason: cfg.reason,
    };
  }
  return result;
}

// ─── AI Task Definitions (Code-Enforcement Specific) ────────────────────────

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
  // Workflow 2 — Correction tasks
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

// ─── Task Routing Configuration ─────────────────────────────────────────────

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

export const AI_TASK_CONFIG: Record<CETask, TaskRoutingConfig> = {
  document_classification: {
    task: 'document_classification',
    preferredProvider: 'gemini',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 15000,
  },
  notice_extraction: {
    task: 'notice_extraction',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 30000,
  },
  complaint_extraction: {
    task: 'complaint_extraction',
    preferredProvider: 'gemini',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 20000,
  },
  authority_extraction: {
    task: 'authority_extraction',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: true,
    independentReviewProvider: 'claude',
    maxRetries: 2,
    timeoutMs: 30000,
  },
  scope_extraction: {
    task: 'scope_extraction',
    preferredProvider: 'gemini',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 20000,
  },
  deadline_extraction: {
    task: 'deadline_extraction',
    preferredProvider: 'gemini',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 15000,
  },
  property_identity_reconciliation: {
    task: 'property_identity_reconciliation',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 25000,
  },
  jurisdiction_identification: {
    task: 'jurisdiction_identification',
    preferredProvider: 'gemini',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 20000,
  },
  procedural_analysis: {
    task: 'procedural_analysis',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: true,
    independentReviewProvider: 'claude',
    maxRetries: 2,
    timeoutMs: 30000,
  },
  jurisdiction_research_synthesis: {
    task: 'jurisdiction_research_synthesis',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 30000,
  },
  evidence_gap_analysis: {
    task: 'evidence_gap_analysis',
    preferredProvider: 'gemini',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 20000,
  },
  contradiction_analysis: {
    task: 'contradiction_analysis',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: true,
    independentReviewProvider: 'claude',
    maxRetries: 2,
    timeoutMs: 30000,
  },
  response_strategy: {
    task: 'response_strategy',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: true,
    independentReviewProvider: 'claude',
    maxRetries: 2,
    timeoutMs: 30000,
  },
  draft_generation: {
    task: 'draft_generation',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 45000,
  },
  draft_critique: {
    task: 'draft_critique',
    preferredProvider: 'claude',
    preferredModel: undefined, // Use default for the critique provider
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 30000,
  },
  final_validation: {
    task: 'final_validation',
    preferredProvider: 'claude',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 20000,
  },
  // ── Workflow 2 — Correction Tasks ───────────────────────────────────────
  correction_issue_extraction: {
    task: 'correction_issue_extraction',
    preferredProvider: 'gemini',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 25000,
  },
  recipient_reconciliation: {
    task: 'recipient_reconciliation',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: true,
    independentReviewProvider: 'claude',
    maxRetries: 2,
    timeoutMs: 25000,
  },
  property_reconciliation: {
    task: 'property_reconciliation',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 25000,
  },
  case_identifier_reconciliation: {
    task: 'case_identifier_reconciliation',
    preferredProvider: 'gemini',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 20000,
  },
  scope_reconciliation: {
    task: 'scope_reconciliation',
    preferredProvider: 'gemini',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 20000,
  },
  deadline_reconciliation: {
    task: 'deadline_reconciliation',
    preferredProvider: 'gemini',
    fallbackProviders: ['openai'],
    requiresIndependentReview: true,
    independentReviewProvider: 'claude',
    maxRetries: 2,
    timeoutMs: 20000,
  },
  authority_reconciliation: {
    task: 'authority_reconciliation',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: true,
    independentReviewProvider: 'claude',
    maxRetries: 2,
    timeoutMs: 30000,
  },
  correction_strategy: {
    task: 'correction_strategy',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: true,
    independentReviewProvider: 'claude',
    maxRetries: 2,
    timeoutMs: 30000,
  },
  correction_draft_generation: {
    task: 'correction_draft_generation',
    preferredProvider: 'gemini',
    fallbackProviders: ['claude'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 45000,
  },
  correction_draft_critique: {
    task: 'correction_draft_critique',
    preferredProvider: 'claude',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 30000,
  },
  correction_final_validation: {
    task: 'correction_final_validation',
    preferredProvider: 'claude',
    fallbackProviders: ['openai'],
    requiresIndependentReview: false,
    maxRetries: 2,
    timeoutMs: 20000,
  },
};

// ─── Provider Adapter Interface ──────────────────────────────────────────────

export interface ProviderAdapter {
  name: AIProvider;
  invoke(prompt: string, model: string): Promise<{ output: string; confidence: number; latencyMs: number }>;
  isAvailable(): boolean;
}

// ─── AI Invocation Record ─────────────────────────────────────────────────────

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

export function createInvocation(
  task: CETask,
  caseId?: string,
): AIInvocation {
  const routing = AI_TASK_CONFIG[task];
  const configs = getProviderConfigs();
  const model = routing.preferredModel || configs[routing.preferredProvider].defaultModel;
  return {
    caseId,
    task,
    provider: routing.preferredProvider,
    model,
    promptVersion: '1.0',
    workflowVersion: '1.0.0',
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

  constructor(threshold = 3, resetMs = 60000) {
    this.threshold = threshold;
    this.resetMs = resetMs;
  }

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
      this.failures.delete(provider);
      this.lastFailure.delete(provider);
      return true;
    }
    return false;
  }

  getState(): Record<string, { failures: number; open: boolean }> {
    const state: Record<string, { failures: number; open: boolean }> = {};
    for (const provider of ['gemini', 'openai', 'claude'] as AIProvider[]) {
      state[provider] = {
        failures: this.failures.get(provider) ?? 0,
        open: !this.isAvailable(provider),
      };
    }
    return state;
  }
}

// ─── Timeout Detection ────────────────────────────────────────────────────────

export function isTimeout(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('timed out') ||
      error.name === 'AbortError'
    );
  }
  return false;
}

// ─── Output Validation Gate ──────────────────────────────────────────────────

export function validateAIOutput(
  output: string | undefined,
  task: CETask,
  minConfidence?: number,
): { valid: boolean; reason?: string; validationState: AIInvocation['validationState'] } {
  if (!output || output.trim().length === 0) {
    return { valid: false, reason: 'Empty output', validationState: 'failed' };
  }

  // Reject hedging language in high-stakes tasks
  const highStakes: CETask[] = ['procedural_analysis', 'authority_extraction', 'final_validation', 'contradiction_analysis'];
  if (highStakes.includes(task)) {
    // Allow hedging in analysis tasks (they SHOULD be cautious) but reject it in validation
    if (task === 'final_validation' && /i think|i believe|maybe|perhaps|possibly/i.test(output)) {
      return { valid: false, reason: 'Hedging language in validation output', validationState: 'rejected' };
    }
  }

  if (minConfidence !== undefined) {
    // In production, this would check actual confidence score
  }

  return { valid: true, validationState: 'validated' };
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
  enableCache: false,
};

// ─── Multi-Model Invocation Result ────────────────────────────────────────────

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
  // Simple semantic comparison — in production this would use embeddings or structured comparison
  const a = primary.output.trim().toLowerCase();
  const b = review.output.trim().toLowerCase();
  
  // For structured outputs, compare key fields
  // This is a simplified heuristic; real implementation would parse JSON schemas
  const similarity = computeSimilarity(a, b);
  
  if (similarity > 0.85) {
    return { agreement: 'AGREEMENT' };
  }

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
  // Jaccard similarity on word sets
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}
