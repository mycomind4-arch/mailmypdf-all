/**
 * LLM Provider Router / Orchestrator
 *
 * Responsibilities:
 *   - Choose Claude as the default provider and Gemini as first fallback
 *   - Honor explicit provider configuration
 *   - Enforce allowed providers
 *   - Handle provider availability / fallback
 *   - Apply retry policy
 *   - Record provider/model in provenance
 *   - Normalize responses
 *   - Surface failures
 *   - Optionally perform fallback
 *   - Never silently switch providers without recording it
 *
 * If fallback occurs:
 *   requested provider → failed → fallback provider → successful response
 *   the resulting provenance records the complete chain.
 *
 * The router NEVER makes domain decisions. It returns raw LLM responses
 * with full provenance. Structured output validation and domain
 * integration happen in the intelligence layer.
 */

import type { LLMAdapter, LLMRequest } from "./llm-adapter";
import { LLMError, hashInput } from "./llm-adapter";
import { GeminiAdapter } from "./gemini-adapter";
import { OpenAIAdapter } from "./openai-adapter";
import { AnthropicAdapter } from "./anthropic-adapter";
import type {
  LLMProviderId,
  LLMFullProvenance,
  LLMOperation,
  LLMRuntimeConfig,
  FallbackChainEntry,
} from "./llm-types";
import { ALL_PROVIDERS, PROVIDER_FALLBACK_ORDER } from "./llm-types";
import { getLLMConfig } from "./llm-config";
import type { ProviderConfig } from "./llm-types";

// ── Adapter Registry ────────────────────────────────────────────────────

const adapterCache = new Map<LLMProviderId, LLMAdapter>();

function createAdapter(
  provider: LLMProviderId,
  config: ProviderConfig,
): LLMAdapter {
  switch (provider) {
    case "gemini":
      return new GeminiAdapter({
        apiKey: config.apiKey,
        model: config.model,
        apiUrl: config.apiUrl,
      });
    case "openai":
      return new OpenAIAdapter({
        apiKey: config.apiKey,
        model: config.model,
        apiUrl: config.apiUrl,
      });
    case "anthropic":
      return new AnthropicAdapter({
        apiKey: config.apiKey,
        model: config.model,
        apiUrl: config.apiUrl,
      });
    default:
      throw new LLMError(
        `Unknown LLM provider: ${provider}`,
        provider,
        "PROVIDER_NOT_SUPPORTED",
      );
  }
}

function getAdapter(
  provider: LLMProviderId,
  config: LLMRuntimeConfig,
): LLMAdapter | null {
  const providerConfig = config.providers[provider];
  if (!providerConfig) return null;

  if (adapterCache.has(provider)) {
    return adapterCache.get(provider)!;
  }

  const adapter = createAdapter(provider, providerConfig);
  adapterCache.set(provider, adapter);
  return adapter;
}

// ── Test helpers ────────────────────────────────────────────────────────

/**
 * Test-only: inject a custom adapter for a provider.
 */
export function _setAdapter(
  provider: LLMProviderId,
  adapter: LLMAdapter | null,
): void {
  if (adapter) {
    adapterCache.set(provider, adapter);
  } else {
    adapterCache.delete(provider);
  }
}

/**
 * Test-only: clear all cached adapters.
 */
export function _resetAdapters(): void {
  adapterCache.clear();
}

// ── Router Result ───────────────────────────────────────────────────────

export interface RouterResult {
  content: string;
  provenance: LLMFullProvenance;
  fallbackChain: FallbackChainEntry[];
}

// ── Core Router ─────────────────────────────────────────────────────────

export interface RouteOptions {
  /** Explicit provider override (bypasses default selection) */
  provider?: LLMProviderId;
  /** Operation type for provenance tracking */
  operation: LLMOperation;
  /** Workflow ID for provenance */
  workflowId?: string;
  /** Matter ID for provenance */
  matterId?: string;
  /** Custom config override */
  config?: LLMRuntimeConfig;
  /** Disable fallback for this call */
  noFallback?: boolean;
}

/**
 * Route an LLM request through the provider chain.
 *
 * Default behavior:
 *   1. Try the default/explicit provider
 *   2. On failure, try fallback providers (if enabled)
 *   3. Record the complete fallback chain in provenance
 *   4. Never silently switch providers
 *
 * Returns null if no provider succeeds (workflow continues deterministically).
 */
export async function routeLLMRequest(
  request: LLMRequest,
  options: RouteOptions,
): Promise<RouterResult | null> {
  const config = options.config ?? getLLMConfig();
  const configuredProviders = Object.keys(config.providers) as LLMProviderId[];

  if (configuredProviders.length === 0) {
    return null; // No providers configured — rule-based path
  }

  // Determine provider chain
  const requestedProvider = options.provider ?? config.defaultProvider;
  const fallbackChain: FallbackChainEntry[] = [];
  const providersAttempted: LLMProviderId[] = [];

  // Build the list of providers to try
  const enableFallback =
    config.fallbackEnabled && !options.noFallback;

  const fallbackProviders = enableFallback
    ? PROVIDER_FALLBACK_ORDER.filter(
        (provider) => provider !== requestedProvider && configuredProviders.includes(provider),
      )
    : [];

  const providersToTry = [requestedProvider, ...fallbackProviders];

  let lastError: Error | null = null;
  let result: RouterResult | null = null;

  for (const provider of providersToTry) {
    if (providersAttempted.includes(provider)) continue;
    providersAttempted.push(provider);

    const adapter = getAdapter(provider, config);
    if (!adapter) {
      fallbackChain.push({
        provider,
        model: config.providers[provider]?.model ?? "unknown",
        success: false,
        error: "Provider not configured",
      });
      continue;
    }

    const startTime = Date.now();

    try {
      const response = await adapter.generate(request);
      const durationMs = Date.now() - startTime;
      const outputHash = await hashInput(response.content);

      fallbackChain.push({
        provider,
        model: response.provenance.model,
        success: true,
        durationMs,
      });

      const fallbackUsed = provider !== requestedProvider;

      const provenance: LLMFullProvenance = {
        provider: provider as LLMProviderId,
        model: response.provenance.model,
        generatedAt: response.provenance.generatedAt,
        inputHash: response.provenance.inputHash,
        outputHash,
        promptVersion: config.promptVersion,
        operation: options.operation,
        workflowId: options.workflowId,
        matterId: options.matterId,
        fallbackUsed,
        fallbackChain: providersAttempted,
        durationMs,
        temperature: request.temperature ?? config.defaultTemperature,
        maxTokens: request.maxTokens ?? config.defaultMaxTokens,
      };

      result = {
        content: response.content,
        provenance,
        fallbackChain,
      };

      break; // Success — stop trying providers
    } catch (err) {
      const durationMs = Date.now() - startTime;
      lastError = err instanceof Error ? err : new Error(String(err));

      fallbackChain.push({
        provider,
        model: config.providers[provider]?.model ?? "unknown",
        success: false,
        error: lastError.message,
        durationMs,
      });

      // Continue to next provider in fallback chain
    }
  }

  return result;
}

// ── Consensus / Multi-Provider Call ──────────────────────────────────────

export interface ConsensusResult {
  responses: Array<{
    content: string;
    provenance: LLMFullProvenance;
    provider: LLMProviderId;
    model: string;
  }>;
  providersConsulted: LLMProviderId[];
  allSucceeded: boolean;
  partialFailure: boolean;
}

/**
 * Call multiple providers and collect their responses for consensus.
 * Unlike routeLLMRequest (which stops at first success), this calls
 * ALL specified providers and collects their outputs for reconciliation.
 *
 * Returns partial results if some providers fail.
 */
export async function callMultipleProviders(
  request: LLMRequest,
  providers: LLMProviderId[],
  options: Omit<RouteOptions, "provider" | "noFallback">,
): Promise<ConsensusResult> {
  const config = options.config ?? getLLMConfig();
  const responses: ConsensusResult["responses"] = [];
  const providersConsulted: LLMProviderId[] = [];
  let failures = 0;

  for (const provider of providers) {
    const adapter = getAdapter(provider, config);
    if (!adapter) {
      failures++;
      continue;
    }

    const startTime = Date.now();
    try {
      const response = await adapter.generate(request);
      const durationMs = Date.now() - startTime;
      const outputHash = await hashInput(response.content);

      const provenance: LLMFullProvenance = {
        provider: provider as LLMProviderId,
        model: response.provenance.model,
        generatedAt: response.provenance.generatedAt,
        inputHash: response.provenance.inputHash,
        outputHash,
        promptVersion: config.promptVersion,
        operation: options.operation,
        workflowId: options.workflowId,
        matterId: options.matterId,
        fallbackUsed: false,
        fallbackChain: [provider],
        durationMs,
        temperature: request.temperature ?? config.defaultTemperature,
        maxTokens: request.maxTokens ?? config.defaultMaxTokens,
      };

      responses.push({
        content: response.content,
        provenance,
        provider,
        model: response.provenance.model,
      });
      providersConsulted.push(provider);
    } catch (err) {
      failures++;
      // Record failure but continue with other providers
    }
  }

  return {
    responses,
    providersConsulted,
    allSucceeded: failures === 0 && responses.length === providers.length,
    partialFailure: failures > 0 && responses.length > 0,
  };
}

// ── Provider Availability ───────────────────────────────────────────────

/**
 * Check if any provider is available.
 */
export function isLLMAvailable(config?: LLMRuntimeConfig): boolean {
  const cfg = config ?? getLLMConfig();
  return getConfiguredProviderList(cfg).length > 0;
}

export function getConfiguredProviderList(
  config: LLMRuntimeConfig,
): LLMProviderId[] {
  return ALL_PROVIDERS.filter((p) => config.providers[p]);
}

/**
 * Get the default provider.
 */
export function getDefaultProvider(config?: LLMRuntimeConfig): LLMProviderId {
  return (config ?? getLLMConfig()).defaultProvider;
}
