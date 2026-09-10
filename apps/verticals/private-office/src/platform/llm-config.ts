/**
 * LLM runtime configuration — environment-driven provider setup,
 * intelligence modes, and operation-level cost policies.
 *
 * Claude/Anthropic is the primary provider. OpenAI and Gemini remain
 * configurable fallback/consensus providers without workflow code changes.
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
 * Server-side only. Never expose provider credentials to the browser.
 * Insertion order is intentional because it also defines fallback priority.
 */
export function buildProviderConfigs(): Partial<
  Record<LLMProviderId, ProviderConfig>
> {
  const configs: Partial<Record<LLMProviderId, ProviderConfig>> = {};

  // Anthropic / Claude (primary)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    configs.anthropic = {
      apiKey: anthropicKey,
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
      apiUrl: process.env.ANTHROPIC_API_URL,
    };
  }

  // OpenAI (first fallback / consensus peer)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    configs.openai = {
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL ?? "gpt-5.6",
      apiUrl: process.env.OPENAI_API_URL,
    };
  }

  // Gemini (second fallback / maximum-assurance peer)
  const geminiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (geminiKey) {
    configs.gemini = {
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL ?? "gemini-3.7-flash",
      apiUrl: process.env.GEMINI_API_URL,
    };
  }

  return configs;
}

/** Build the LLM runtime configuration from environment variables. */
export function buildLLMConfig(): LLMRuntimeConfig {
  const providers = buildProviderConfigs();
  const configuredProviders = Object.keys(providers) as LLMProviderId[];
  const explicitProvider = process.env.LLM_PROVIDER as LLMProviderId | undefined;

  if (explicitProvider && configuredProviders.length > 0 && !providers[explicitProvider]) {
    throw new Error(
      `Default LLM provider "${explicitProvider}" is not configured. ` +
        `Configured providers: ${configuredProviders.join(", ")}`,
    );
  }

  // Claude is the default when configured. If it is unavailable, degrade to the
  // next configured provider rather than breaking deterministic workflow execution.
  const defaultProvider = explicitProvider ??
    (providers[DEFAULT_PROVIDER] ? DEFAULT_PROVIDER : configuredProviders[0] ?? DEFAULT_PROVIDER);

  const mode = (process.env.LLM_INTELLIGENCE_MODE as IntelligenceMode | undefined) ??
    DEFAULT_INTELLIGENCE_MODE;

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

export function getOperationMode(
  operation: LLMOperation,
  config: LLMRuntimeConfig,
): IntelligenceMode {
  return config.operationPolicies[operation] ?? config.mode;
}

export function getProvidersForOperation(
  operation: LLMOperation,
  config: LLMRuntimeConfig,
): LLMProviderId[] {
  const mode = getOperationMode(operation, config);
  const strategy = MODE_STRATEGIES[mode];
  const configured = Object.keys(config.providers) as LLMProviderId[];
  const result = strategy.providers.filter((p) => configured.includes(p));

  if (result.length === 0 && config.providers[config.defaultProvider]) {
    return [config.defaultProvider];
  }
  return result;
}

export function isProviderConfigured(
  provider: LLMProviderId,
  config: LLMRuntimeConfig,
): boolean {
  return Boolean(config.providers[provider]);
}

export function getConfiguredProviders(config: LLMRuntimeConfig): LLMProviderId[] {
  return ALL_PROVIDERS.filter((p) => config.providers[p]);
}

let configOverride: LLMRuntimeConfig | null = null;

export function _setLLMConfig(config: LLMRuntimeConfig | null): void {
  configOverride = config;
}

let cachedConfig: LLMRuntimeConfig | null = null;

export function getLLMConfig(): LLMRuntimeConfig {
  if (configOverride) return configOverride;
  if (cachedConfig) return cachedConfig;
  cachedConfig = buildLLMConfig();
  return cachedConfig;
}

export function _resetLLMConfig(): void {
  cachedConfig = null;
  configOverride = null;
}
