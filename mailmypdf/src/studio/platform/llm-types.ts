/**
 * Shared multi-LLM types for the Private Office intelligence architecture.
 *
 * These types extend the base LLM transport types with the provenance,
 * configuration, and structured-output metadata needed for a production-grade
 * multi-provider intelligence layer.
 *
 * Claude/Anthropic is the default provider, while the domain remains provider-neutral.
 */

// ── Provider Identity ───────────────────────────────────────────────────

export type LLMProviderId = "gemini" | "openai" | "anthropic";

export const ALL_PROVIDERS: readonly LLMProviderId[] = [
  "anthropic",
  "openai",
  "gemini",
] as const;

export const DEFAULT_PROVIDER: LLMProviderId = "anthropic";

// ── Extended Provenance ──────────────────────────────────────────────────

export interface LLMFullProvenance {
  provider: LLMProviderId;
  model: string;
  generatedAt: string;
  inputHash: string;
  outputHash: string;
  promptVersion: string;
  operation: LLMOperation;
  workflowId?: string;
  matterId?: string;
  fallbackUsed: boolean;
  fallbackChain: LLMProviderId[];
  durationMs?: number;
  temperature?: number;
  maxTokens?: number;
}

// ── Operations ──────────────────────────────────────────────────────────

export type LLMOperation =
  | "classify"
  | "extract"
  | "analyze"
  | "assess_risk"
  | "generate_strategy"
  | "assist_draft"
  | "reconcile"
  | "extract_timeline";

// ── Intelligence Modes ──────────────────────────────────────────────────

export type IntelligenceMode =
  | "standard"
  | "enhanced"
  | "consensus"
  | "maximum-assurance";

export const DEFAULT_INTELLIGENCE_MODE: IntelligenceMode = "standard";

/** Maps intelligence modes to Claude-first provider strategies. */
export const MODE_STRATEGIES: Record<
  IntelligenceMode,
  {
    providers: LLMProviderId[];
    consensus: boolean;
    fallback: boolean;
  }
> = {
  standard: {
    providers: ["anthropic"],
    consensus: false,
    fallback: false,
  },
  enhanced: {
    providers: ["anthropic"],
    consensus: false,
    fallback: true,
  },
  consensus: {
    providers: ["anthropic", "openai"],
    consensus: true,
    fallback: true,
  },
  "maximum-assurance": {
    providers: ["anthropic", "openai", "gemini"],
    consensus: true,
    fallback: true,
  },
};

// ── Operation-level Cost Policies ──────────────────────────────────────

export const DEFAULT_OPERATION_POLICIES: Record<LLMOperation, IntelligenceMode> = {
  classify: "standard",
  extract: "standard",
  "extract_timeline": "standard",
  analyze: "standard",
  assess_risk: "enhanced",
  generate_strategy: "standard",
  assist_draft: "standard",
  reconcile: "consensus",
};

// ── Provider Configuration ───────────────────────────────────────────────

export interface ProviderConfig {
  apiKey: string;
  model: string;
  apiUrl?: string;
}

export interface LLMRuntimeConfig {
  defaultProvider: LLMProviderId;
  mode: IntelligenceMode;
  providers: Partial<Record<LLMProviderId, ProviderConfig>>;
  operationPolicies: Record<LLMOperation, IntelligenceMode>;
  fallbackEnabled: boolean;
  maxRetries: number;
  defaultTimeoutMs: number;
  defaultTemperature: number;
  defaultMaxTokens: number;
  promptVersion: string;
}

// ── Fallback Result ─────────────────────────────────────────────────────

export interface FallbackChainEntry {
  provider: LLMProviderId;
  model: string;
  success: boolean;
  error?: string;
  durationMs?: number;
}

// ── Reconciliation ──────────────────────────────────────────────────────

export type ClaimStatus =
  | "confirmed"
  | "conflicting"
  | "unsupported"
  | "requires_verification"
  | "provider_specific";

export interface ProviderClaim {
  provider: LLMProviderId;
  model: string;
  claim: string;
  confidence: number;
  reasoning?: string;
}

export interface ReconciledClaim {
  claim: string;
  status: ClaimStatus;
  confidence: number;
  agreeingProviders: LLMProviderId[];
  conflictingProviders: LLMProviderId[];
  allClaims: ProviderClaim[];
}

export interface ReconciliationResult {
  claims: ReconciledClaim[];
  unanimous: boolean;
  conflictsDetected: boolean;
  providersConsulted: LLMProviderId[];
}
