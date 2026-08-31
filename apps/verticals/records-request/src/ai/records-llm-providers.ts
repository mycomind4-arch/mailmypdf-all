import type { LlmProvider, LlmTask, LlmProviderResult } from './multi-llm-orchestrator'

const jsonInstruction = 'Return only valid JSON matching the requested output shape. Do not include markdown fences or commentary.'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`LLM_PROVIDER_NOT_CONFIGURED:${name}`)
  return value
}

async function parseJsonResponse(response: Response, provider: string): Promise<unknown> {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${provider}_HTTP_${response.status}:${text.slice(0, 500)}`)
  }
  const body = await response.json() as Record<string, unknown>
  const candidates = [
    body.output_text,
    body.content,
    Array.isArray(body.content) ? body.content.map((part) => typeof part === 'object' && part && 'text' in part ? String((part as Record<string, unknown>).text) : '').join('') : undefined,
    Array.isArray(body.candidates) ? body.candidates.map((candidate) => {
      if (!candidate || typeof candidate !== 'object') return ''
      const content = (candidate as Record<string, unknown>).content
      if (!content || typeof content !== 'object') return ''
      const parts = (content as Record<string, unknown>).parts
      return Array.isArray(parts) ? parts.map((part) => typeof part === 'object' && part && 'text' in part ? String((part as Record<string, unknown>).text) : '').join('') : ''
    }).join('') : undefined,
  ]
  const text = candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0)
  if (!text) throw new Error(`${provider}_EMPTY_RESPONSE`)
  try { return JSON.parse(text) } catch { throw new Error(`${provider}_INVALID_JSON_RESPONSE`) }
}

function promptFor(task: LlmTask, input: unknown): string {
  const instructions: Record<LlmTask, string> = {
    classification: 'Classify each record into the most appropriate code-enforcement record category and explain the classification.',
    extraction: 'Extract code-enforcement identifiers and material facts. Never invent a fact; use empty arrays when absent.',
    contradiction: 'Determine whether the supplied records materially contradict each other. Distinguish true contradiction from ambiguity or missing context.',
    strategy: 'Design a precise records-request strategy. Identify likely custodians, search terms, scope gaps, overbreadth risks, identifiers, and follow-up priorities. Do not assert jurisdiction-specific law unless it is explicitly supplied in the input.',
  }
  return `${jsonInstruction}\nTask: ${instructions[task]}\nInput:\n${JSON.stringify(input)}\nOutput shape must be inferred from the task and must be a single JSON object.`
}

async function openAiComplete<T>(task: LlmTask, input: unknown): Promise<LlmProviderResult<T>> {
  const apiKey = requireEnv('OPENAI_API_KEY')
  const model = process.env.OPENAI_RECORDS_MODEL ?? 'gpt-5.6'
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, input: promptFor(task, input) }),
  })
  const value = await parseJsonResponse(response, 'OPENAI') as T
  return { provider: 'openai', model, value, confidence: 0.85, warnings: [] }
}

async function anthropicComplete<T>(task: LlmTask, input: unknown): Promise<LlmProviderResult<T>> {
  const apiKey = requireEnv('ANTHROPIC_API_KEY')
  const model = process.env.ANTHROPIC_RECORDS_MODEL ?? 'claude-sonnet-4-20250514'
  const response = await fetch(process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content: promptFor(task, input) }] }),
  })
  const value = await parseJsonResponse(response, 'ANTHROPIC') as T
  return { provider: 'anthropic', model, value, confidence: 0.85, warnings: [] }
}

async function geminiComplete<T>(task: LlmTask, input: unknown): Promise<LlmProviderResult<T>> {
  const apiKey = requireEnv('GEMINI_API_KEY')
  const model = process.env.GEMINI_RECORDS_MODEL ?? 'gemini-3.7-flash'
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptFor(task, input) }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })
  const value = await parseJsonResponse(response, 'GEMINI') as T
  return { provider: 'gemini', model, value, confidence: 0.85, warnings: [] }
}

export const openAiRecordsProvider: LlmProvider = { id: 'openai', complete: openAiComplete }
export const anthropicRecordsProvider: LlmProvider = { id: 'anthropic', complete: anthropicComplete }
export const geminiRecordsProvider: LlmProvider = { id: 'gemini', complete: geminiComplete }

export function getConfiguredRecordsLlmProviders(): readonly LlmProvider[] {
  const providers: LlmProvider[] = []
  if (process.env.OPENAI_API_KEY) providers.push(openAiRecordsProvider)
  if (process.env.ANTHROPIC_API_KEY) providers.push(anthropicRecordsProvider)
  if (process.env.GEMINI_API_KEY) providers.push(geminiRecordsProvider)
  return providers
}
