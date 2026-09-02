/**
 * LLM runtime configuration — environment-driven provider setup,
 * intelligence modes, and operation-level cost policies.
 *
 * Claude is the primary provider and Gemini is the first fallback. Provider selection is configurable
 * through environment variables without requiring workflow code changes.
 */

import type {
  LLMProviderId,
  LLMRuntimeConfig,
  IntelligenceMode,
  LLMOperation,
  ProviderConfig,
} from "./llm-types";
import {
  DEFAULT_PROVIDER,
  DEFAULT_INTELLIGENCE_MODE,
  DEFAULT_OPERATION_POLICIES,
  ALL_PROVIDERS,
  MODE_STRATEGIES,
} from "./llm-types";

/**
 * Build provider configuration from environment variables.
 *
 * Server-side only. Never expose provider credentials to the browser.
 */
export function buildProviderConfigs(): Partial<
  Record<LLMProviderId, ProviderConfig>
> {
  const configs: Partial<Record<LLMProviderId, ProviderConfig>> = {};

  // Gemini (first fallback)
  const geminiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (geminiKey) {
    configs.gemini = {
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      apiUrl: process.env.GEMINI_API_URL,
    };
  }

  // OpenAI (optional)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    configs.openai = {
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      apiUrl: process.env.OPENAI_API_URL,
    };
  }

  // Anthropic (optional)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    configs.anthropic = {
      apiKey: anthropicKey,
      model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022",
      apiUrl: process.env.ANTHROPIC_API_URL,
    };
  }

  return configs;
}

/**
 * Build the LLM runtime configuration from environment variables.
 */
export function buildLLMConfig(): LLMRuntimeConfig {
  const providers = buildProviderConfigs();
  const configuredProviders = Object.keys(providers) as LLMProviderId[];

  const requestedProvider = process.env.LLM_PROVIDER as LLMProviderId | undefined;
  const defaultProvider = requestedProvider
    ?? (providers.anthropic ? "anthropic" : providers.gemini ? "gemini" : DEFAULT_PROVIDER);

  // An explicit override must be configured. Without one, a Gemini-only
  // environment can operate as the documented fallback-only mode.
  if (requestedProvider && configuredProviders.length > 0 && !providers[defaultProvider]) {
    throw new Error(
      `Default LLM provider "${defaultProvider}" is not configured. ` +
        `Configured providers: ${configuredProviders.join(", ")}`,
    );
  }

  const mode = (process.env.LLM_INTELLIGENCE_MODE as IntelligenceMode | undefined) ??
    DEFAULT_INTELLIGENCE_MODE;

  // Parse operation-level policy overrides from env
  const operationPolicies = { ...DEFAULT_OPERATION_POLICIES };
  for (const op of Object.keys(operationPolicies) as LLMOperation[]) {
    const envKey = `LLM_POLICY_${op.toUpperCase()}`;
    const envVal = process.env[envKey] as IntelligenceMode | undefined;
    if (envVal && envVal in MODE_STRATEGIES) {
      operationPolicies[op] = envVal;
    }
  }

  return {
    defaultProvider,
    mode,
    providers,
    operationPolicies,
    fallbackEnabled: process.env.LLM_FALLBACK_ENABLED !== "false",
    maxRetries: parseInt(process.env.LLM_MAX_RETRIES ?? "1", 10),
    defaultTimeoutMs: parseInt(process.env.LLM_TIMEOUT_MS ?? "30000", 10),
    defaultTemperature: parseFloat(process.env.LLM_TEMPERATURE ?? "0.3"),
    defaultMaxTokens: parseInt(process.env.LLM_MAX_TOKENS ?? "2048", 10),
    promptVersion: process.env.LLM_PROMPT_VERSION ?? "1.0.0",
  };
}

/**
 * Get the intelligence mode for a specific operation, respecting
 * both global and operation-level configuration.
 */
export function getOperationMode(
  operation: LLMOperation,
  config: LLMRuntimeConfig,
): IntelligenceMode {
  return config.operationPolicies[operation] ?? config.mode;
}

/**
 * Get the list of providers to consult for a given operation,
 * based on the operation's intelligence mode and which providers
 * are actually configured.
 */
export function getProvidersForOperation(
  operation: LLMOperation,
  config: LLMRuntimeConfig,
): LLMProviderId[] {
  const mode = getOperationMode(operation, config);
  const strategy = MODE_STRATEGIES[mode];
  const configured = Object.keys(config.providers) as LLMProviderId[];

  // Filter strategy providers to only those configured
  const result = strategy.providers.filter((p) => configured.includes(p));

  // Always include at least the default if configured
  if (result.length === 0 && config.providers[config.defaultProvider]) {
    return [config.defaultProvider];
  }

  return result;
}

/**
 * Check if a provider is configured and available.
 */
export function isProviderConfigured(
  provider: LLMProviderId,
  config: LLMRuntimeConfig,
): boolean {
  return Boolean(config.providers[provider]);
}

/**
 * Get all configured provider IDs.
 */
export function getConfiguredProviders(config: LLMRuntimeConfig): LLMProviderId[] {
  return ALL_PROVIDERS.filter((p) => config.providers[p]);
}

// ── Test helpers ────────────────────────────────────────────────────────

let configOverride: LLMRuntimeConfig | null = null;

/**
 * Test-only: override the cached config.
 */
export function _setLLMConfig(config: LLMRuntimeConfig | null): void {
  configOverride = config;
}

/**
 * Get the runtime config (cached or overridden).
 */
let cachedConfig: LLMRuntimeConfig | null = null;

export function getLLMConfig(): LLMRuntimeConfig {
  if (configOverride) return configOverride;
  if (cachedConfig) return cachedConfig;
  cachedConfig = buildLLMConfig();
  return cachedConfig;
}

/**
 * Test-only: reset the cached config.
 */
export function _resetLLMConfig(): void {
  cachedConfig = null;
  configOverride = null;
}
