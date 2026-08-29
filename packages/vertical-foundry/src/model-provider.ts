/**
 * OpenAI-Compatible Model Provider — real implementation.
 *
 * Supports model-class routing: FAST, REASONING, VISION, CODE, MULTILINGUAL.
 * Uses the OpenAI Chat Completions API (compatible with OpenAI, Azure OpenAI,
 * Ollama, vLLM, and other OpenAI-compatible endpoints).
 *
 * Credentials: MODEL_API_KEY, MODEL_API_BASE (optional, defaults to OpenAI)
 * The provider never logs API keys or full prompt content.
 */

import type { ModelProvider, ModelRequest, ModelResult } from './provider-contracts.js'

interface ModelConfig {
  apiKey: string
  apiBase?: string
  defaultModels?: Partial<Record<string, string>>
}

const MODEL_CLASS_MAP: Record<string, string> = {
  FAST: 'gpt-4o-mini',
  REASONING: 'gpt-4o',
  VISION: 'gpt-4o',
  CODE: 'gpt-4o',
  MULTILINGUAL: 'gpt-4o',
  EMBEDDING: 'text-embedding-3-small',
}

export class OpenAIModelProvider implements ModelProvider {
  private apiKey: string
  private apiBase: string
  private modelOverrides: Partial<Record<string, string>>

  constructor(config: ModelConfig) {
    if (!config.apiKey) throw new Error('OpenAIModelProvider requires an API key')
    this.apiKey = config.apiKey
    this.apiBase = config.apiBase ?? 'https://api.openai.com/v1'
    this.modelOverrides = config.defaultModels ?? {}
  }

  private resolveModel(modelClass: string): string {
    return this.modelOverrides[modelClass] ?? MODEL_CLASS_MAP[modelClass] ?? 'gpt-4o'
  }

  async run(request: ModelRequest): Promise<ModelResult> {
    const model = this.resolveModel(request.modelClass)
    const systemContent = request.systemPrompt ?? `You are a ${request.role}. Your objective: ${request.objective}`
    const userContent = typeof request.input === 'string' ? request.input : JSON.stringify(request.input ?? '')

    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
    }

    const start = Date.now()
    const res = await fetch(`${this.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Model API call failed: ${res.status} ${res.statusText} ${text}`)
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
      model: string
    }

    const content = data.choices[0]?.message?.content ?? ''
    const durationMs = Date.now() - start

    // Attempt to parse structured output if the content looks like JSON
    let structured: unknown
    const trimmed = content.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        structured = JSON.parse(trimmed)
      } catch {
        // Not valid JSON, leave structured undefined
      }
    }

    return {
      content,
      structured,
      model: data.model ?? model,
      modelClass: request.modelClass,
      ...(data.usage ? { usage: { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } } : {}),
      durationMs,
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; models: string[] }> {
    try {
      const res = await fetch(`${this.apiBase}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      })
      if (!res.ok) return { healthy: false, models: [] }
      const data = await res.json() as { data: Array<{ id: string }> }
      const models = data.data.map((m) => m.id).sort()
      return { healthy: true, models }
    } catch {
      return { healthy: false, models: [] }
    }
  }
}

/**
 * Stub Model Provider — returns deterministic responses without an API key.
 * Useful for CI and local development when no model API is available.
 */
export class StubModelProvider implements ModelProvider {
  async run(request: ModelRequest): Promise<ModelResult> {
    return {
      content: `[stub] ${request.role}: ${request.objective}`,
      model: 'stub',
      modelClass: request.modelClass,
      durationMs: 0,
      warnings: ['Using stub model provider — no real model API configured'],
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; models: string[] }> {
    return { healthy: true, models: ['stub'] }
  }
}
