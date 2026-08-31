/**
 * Shared multi-LLM types for the Private Office intelligence architecture.
 *
 * These types extend the base LLM transport types with the provenance,
 * configuration, and structured-output metadata needed for a production-grade
 * multi-provider intelligence layer.
 *
 * Gemini is the default provider, but the domain is provider-neutral.
 */

// ── Provider Identity ───────────────────────────────────────────────────

export type LLMProviderId = "gemini" | "openai" | "anthropic";

export const ALL_PROVIDERS: readonly LLMProviderId[] = [
  "gemini",
  "openai",
  "anthropic",
] as const;

export const DEFAULT_PROVIDER: LLMProviderId = "gemini";

// ── Extended Provenance ──────────────────────────────────────────────────

/**
 * Full provenance record for an LLM operation.
 *
 * Extends the base LLMProvenance with prompt versioning, output hashing,
 * operation context, and fallback chain tracking.
 */
export interface LLMFullProvenance {
  /** Provider identifier: "gemini", "openai", "anthropic" */
  provider: LLMProviderId;
  /** Model identifier used for generation */
  model: string;
  /** ISO-8601 generation timestamp */
  generatedAt: string;
  /** SHA-256 hash of the canonical input that produced this artifact */
  inputHash: string;
  /** SHA-256 hash of the LLM output content */
  outputHash: string;
  /** Versioned prompt identifier for reproducibility */
  promptVersion: string;
  /** Operation type */
  operation: LLMOperation;
  /** Workflow ID that triggered this operation */
  workflowId?: string;
  /** Matter ID that triggered this operation */
  matterId?: string;
  /** Whether a fallback provider was used */
  fallbackUsed: boolean;
  /** Chain of providers attempted (in order) */
  fallbackChain: LLMProviderId[];
  /** Time taken in milliseconds */
  durationMs?: number;
  /** Temperature used */
  temperature?: number;
  /** Max tokens configured */
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

/**
 * Maps intelligence modes to provider strategies.
 */
export const MODE_STRATEGIES: Record<
  IntelligenceMode,
  {
    providers: LLMProviderId[];
    consensus: boolean;
    fallback: boolean;
  }
> = {
  standard: {
    providers: ["gemini"],
    consensus: false,
    fallback: false,
  },
  enhanced: {
    providers: ["gemini"],
    consensus: false,
    fallback: true,
  },
  consensus: {
    providers: ["gemini", "openai"],
    consensus: true,
    fallback: true,
  },
  "maximum-assurance": {
    providers: ["gemini", "openai", "anthropic"],
    consensus: true,
    fallback: true,
  },
};

// ── Operation-level Cost Policies ──────────────────────────────────────

/**
 * Default operation-to-mode mapping.
 * Controls which intelligence mode is used for each operation type,
 * preventing every workflow from fanning out to multiple providers.
 */
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
  /** Default provider (must be configured) */
  defaultProvider: LLMProviderId;
  /** Intelligence mode */
  mode: IntelligenceMode;
  /** Provider configurations (only configured providers are included) */
  providers: Partial<Record<LLMProviderId, ProviderConfig>>;
  /** Operation-level mode overrides */
  operationPolicies: Record<LLMOperation, IntelligenceMode>;
  /** Whether fallback is enabled globally */
  fallbackEnabled: boolean;
  /** Max retries per provider before fallback */
  maxRetries: number;
  /** Default timeout in ms */
  defaultTimeoutMs: number;
  /** Default temperature */
  defaultTemperature: number;
  /** Default max tokens */
  defaultMaxTokens: number;
  /** Prompt version for reproducibility */
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
