/**
 * Multi-Provider LLM Service — Actual Provider Implementations
 *
 * Supports three providers with automatic fallback:
 * - Google Gemini (gemini-2.0-flash / gemini-1.5-pro)
 * - Anthropic Claude (claude-sonnet-4-20250514 / claude-3-5-sonnet)
 * - OpenAI (gpt-4o / gpt-4o-mini)
 *
 * Architecture:
 *   - Task routing: each AI task has a preferred provider + fallback
 *   - Circuit breaker: failed providers are temporarily disabled
 *   - Validation gate: output is validated before use
 *   - Provider-neutral: the caller never knows which provider answered
 *
 * Security:
 *   - AI output is NEVER trusted directly — it passes through validation gates
 *   - Document text is wrapped as untrusted data
 *   - No caching of sensitive content
 */

import {
  type AIProvider,
  type AITask,
  type AIInvocation,
  TASK_ROUTING,
  createInvocation,
  validateAIOutput,
  CircuitBreaker,
} from './ai-provider';

// ── Types ────────────────────────────────────────────────────

export type LLMProvider = AIProvider;

export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  text: string;
  provider: LLMProvider;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  invocation?: AIInvocation;
}

// ── Provider availability ─────────────────────────────────────

export function getAvailableProviders(): LLMProvider[] {
  const providers: LLMProvider[] = [];
  if (process.env.GEMINI_API_KEY) providers.push('gemini');
  if (process.env.ANTHROPIC_API_KEY) providers.push('claude');
  if (process.env.OPENAI_API_KEY) providers.push('openai');
  return providers;
}

export function isProviderAvailable(provider: LLMProvider): boolean {
  switch (provider) {
    case 'gemini': return !!process.env.GEMINI_API_KEY;
    case 'claude': return !!process.env.ANTHROPIC_API_KEY;
    case 'openai': return !!process.env.OPENAI_API_KEY;
    case 'local': return !!process.env.LOCAL_LLM_URL;
    default: return false;
  }
}

export function getProviderLabel(provider: LLMProvider): string {
  const labels: Record<LLMProvider, string> = {
    gemini: 'Google Gemini',
    claude: 'Anthropic Claude',
    openai: 'OpenAI GPT-4o',
    local: 'Local Model',
    unknown: 'Unknown',
  };
  return labels[provider];
}

export function getDefaultModel(provider: LLMProvider): string {
  const models: Record<LLMProvider, string> = {
    gemini: 'gemini-2.0-flash',
    claude: 'claude-sonnet-4-20250514',
    openai: 'gpt-4o',
    local: 'local-model',
    unknown: 'unknown',
  };
  return models[provider];
}

// ── Circuit breaker (shared instance) ───────────────────────

const circuitBreaker = new CircuitBreaker(3, 60000);

// ── Provider implementations ─────────────────────────────────

async function callGemini(
  messages: LLMMessage[],
  config: LLMConfig,
): Promise<LLMResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key is not configured.');

  const model = config.model || getDefaultModel('gemini');
  const systemPrompt = messages.find((m) => m.role === 'system')?.content || '';
  const userMessages = messages.filter((m) => m.role !== 'system');

  const contents = userMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxTokens ?? 4096,
    },
  };

  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return {
    text,
    provider: 'gemini',
    model,
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount,
      outputTokens: data.usageMetadata?.candidatesTokenCount,
    },
  };
}

async function callClaude(
  messages: LLMMessage[],
  config: LLMConfig,
): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Anthropic API key is not configured.');

  const model = config.model || getDefaultModel('claude');
  const systemPrompt = messages.find((m) => m.role === 'system')?.content || '';
  const userMessages = messages.filter((m) => m.role !== 'system');

  const body: Record<string, unknown> = {
    model,
    max_tokens: config.maxTokens ?? 4096,
    messages: userMessages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  if (config.temperature !== undefined) {
    body.temperature = config.temperature;
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';

  return {
    text,
    provider: 'claude',
    model,
    usage: {
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
    },
  };
}

async function callOpenAI(
  messages: LLMMessage[],
  config: LLMConfig,
): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key is not configured.');

  const model = config.model || getDefaultModel('openai');

  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    max_tokens: config.maxTokens ?? 4096,
    temperature: config.temperature ?? 0.7,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';

  return {
    text,
    provider: 'openai',
    model,
    usage: {
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    },
  };
}

// ── Task-aware LLM call with routing + fallback ──────────────

export interface TaskLLMOptions {
  task: AITask;
  caseId?: string;
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: LLMProvider;
}

export async function callTaskLLM(
  messages: LLMMessage[],
  options: TaskLLMOptions,
): Promise<LLMResponse> {
  const routing = TASK_ROUTING[options.task];
  const preferred = options.preferredProvider || routing.preferredProvider;
  const available = getAvailableProviders();

  if (available.length === 0) {
    throw new Error('No LLM provider is configured. Set GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.');
  }

  // Build provider attempt order: preferred → fallback → any remaining
  const attemptOrder: LLMProvider[] = [preferred];
  if (routing.fallbackProvider && !attemptOrder.includes(routing.fallbackProvider)) {
    attemptOrder.push(routing.fallbackProvider);
  }
  for (const p of available) {
    if (!attemptOrder.includes(p)) attemptOrder.push(p);
  }

  // Filter to available + circuit-breaker-healthy providers
  const callable = attemptOrder.filter(
    (p) => isProviderAvailable(p) && circuitBreaker.isAvailable(p),
  );

  if (callable.length === 0) {
    throw new Error('All LLM providers are unavailable (circuit breaker open or no API keys).');
  }

  let lastError: Error | null = null;

  for (const provider of callable) {
    const config: LLMConfig = {
      provider,
      model: routing.preferredModel && provider === preferred
        ? routing.preferredModel
        : getDefaultModel(provider),
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    };

    try {
      const response = await callLLM(messages, config);
      circuitBreaker.recordSuccess(provider);

      // Validate output
      const validation = validateAIOutput(response.text, options.task, routing.minConfidence);
      if (!validation.valid) {
        // If validation fails, try next provider
        lastError = new Error(`Validation failed for ${provider}: ${validation.reason}`);
        continue;
      }

      // Attach invocation record
      response.invocation = createInvocation(options.task, options.caseId);
      response.invocation.validationState = validation.validationState;

      return response;
    } catch (err) {
      circuitBreaker.recordFailure(provider);
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }

  throw lastError || new Error('All LLM providers failed.');
}

// ── Main entry point (simple callLLM) ────────────────────────

export async function callLLM(
  messages: LLMMessage[],
  config: LLMConfig,
): Promise<LLMResponse> {
  const provider = config.provider;

  if (!isProviderAvailable(provider)) {
    const available = getAvailableProviders();
    if (available.length === 0) {
      throw new Error('No LLM provider is configured. Set GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.');
    }
    return callLLM(messages, { ...config, provider: available[0] });
  }

  switch (provider) {
    case 'gemini': return callGemini(messages, config);
    case 'claude': return callClaude(messages, config);
    case 'openai': return callOpenAI(messages, config);
    case 'local':
      throw new Error('Local LLM provider not yet implemented.');
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ── Circuit breaker status (for health endpoints) ───────────

export function getCircuitBreakerState() {
  return circuitBreaker.getState();
}
