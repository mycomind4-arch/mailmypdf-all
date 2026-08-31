/**
 * Notice Respond — Multi-LLM Provider implementations
 *
 * Three providers: OpenAI, Anthropic, Gemini.
 * Each wraps the vendor's API and normalizes to the shared LlmProviderResult shape.
 * Providers are only included when their API key is present in the environment.
 */

import type { NoticeLlmProvider, NoticeLlmTask, LlmProviderResult } from './multi-llm-orchestrator'

const JSON_INSTRUCTION = 'Return only valid JSON matching the requested output shape. Do not include markdown fences or commentary.'

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
  const body = (await response.json()) as Record<string, unknown>

  const candidates = [
    body.output_text,
    body.content,
    Array.isArray(body.content)
      ? body.content
          .map((part: unknown) =>
            typeof part === 'object' && part && 'text' in part
              ? String((part as Record<string, unknown>).text)
              : '',
          )
          .join('')
      : undefined,
    Array.isArray(body.candidates)
      ? body.candidates
          .map((candidate: unknown) => {
            if (!candidate || typeof candidate !== 'object') return ''
            const content = (candidate as Record<string, unknown>).content
            if (!content || typeof content !== 'object') return ''
            const parts = (content as Record<string, unknown>).parts
            return Array.isArray(parts)
              ? parts
                  .map((part: unknown) =>
                    typeof part === 'object' && part && 'text' in part
                      ? String((part as Record<string, unknown>).text)
                      : '',
                  )
                  .join('')
              : ''
          })
          .join('')
      : undefined,
  ]

  const text = candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0)
  if (!text) throw new Error(`${provider}_EMPTY_RESPONSE`)

  try {
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
    return JSON.parse(cleaned)
  } catch {
    throw new Error(`${provider}_INVALID_JSON_RESPONSE`)
  }
}

function taskInstruction(task: NoticeLlmTask): string {
  const instructions: Record<NoticeLlmTask, string> = {
    classification: 'Classify the government notice or document and identify the notice type, agency, and key identifiers.',
    extraction: 'Extract material facts, notice references, deadlines, and requested actions from the document. Never invent a fact; use empty arrays when absent.',
    contradiction: 'Determine whether the supplied document and user facts materially contradict each other. Distinguish true contradiction from ambiguity or missing context.',
    strategy: 'Design a response strategy. Identify the strongest grounds, required evidence, deadlines, and escalation paths. Do not assert legal conclusions unless explicitly supported.',
    drafting: 'Draft the complete response letter. Return only the letter body; do not include analysis or markdown fences. Use clear, professional language.',
    validation: 'Validate the draft against the analysis. Check for unsupported claims, missing references, deadline errors, and factual inconsistencies.',
  }
  return instructions[task]
}

function buildPrompt(task: NoticeLlmTask, systemPrompt: string, input: unknown): string {
  return `${JSON_INSTRUCTION}\n${systemPrompt}\nTask: ${taskInstruction(task)}\nInput:\n${JSON.stringify(input)}\nOutput must be a single JSON object.`
}

/* ── OpenAI ── */
async function openAiComplete<T>(task: NoticeLlmTask, systemPrompt: string, input: unknown): Promise<LlmProviderResult<T>> {
  const apiKey = requireEnv('OPENAI_API_KEY')
  const model = process.env.OPENAI_NOTICE_MODEL ?? 'gpt-5.6'
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, input: buildPrompt(task, systemPrompt, input) }),
  })
  const value = (await parseJsonResponse(response, 'OPENAI')) as T
  return { provider: 'openai', model, value, confidence: 0.85, warnings: [] }
}

/* ── Anthropic ── */
async function anthropicComplete<T>(task: NoticeLlmTask, systemPrompt: string, input: unknown): Promise<LlmProviderResult<T>> {
  const apiKey = requireEnv('ANTHROPIC_API_KEY')
  const model = process.env.ANTHROPIC_NOTICE_MODEL ?? 'claude-sonnet-4-20250514'
  const response = await fetch(process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: `${systemPrompt}\n${JSON_INSTRUCTION}`,
      messages: [{ role: 'user', content: buildPrompt(task, '', input) }],
    }),
  })
  const value = (await parseJsonResponse(response, 'ANTHROPIC')) as T
  return { provider: 'anthropic', model, value, confidence: 0.85, warnings: [] }
}

/* ── Gemini ── */
async function geminiComplete<T>(task: NoticeLlmTask, systemPrompt: string, input: unknown): Promise<LlmProviderResult<T>> {
  const apiKey = requireEnv('GEMINI_API_KEY')
  const model = process.env.GEMINI_NOTICE_MODEL ?? 'gemini-3.7-flash'
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(task, systemPrompt, input) }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    },
  )
  const value = (await parseJsonResponse(response, 'GEMINI')) as T
  return { provider: 'gemini', model, value, confidence: 0.85, warnings: [] }
}

export const openAiNoticeProvider: NoticeLlmProvider = { id: 'openai', complete: openAiComplete }
export const anthropicNoticeProvider: NoticeLlmProvider = { id: 'anthropic', complete: anthropicComplete }
export const geminiNoticeProvider: NoticeLlmProvider = { id: 'gemini', complete: geminiComplete }

/**
 * Returns only the providers that have their API key configured.
 */
export function getConfiguredNoticeLlmProviders(): readonly NoticeLlmProvider[] {
  const providers: NoticeLlmProvider[] = []
  if (process.env.OPENAI_API_KEY) providers.push(openAiNoticeProvider)
  if (process.env.ANTHROPIC_API_KEY) providers.push(anthropicNoticeProvider)
  if (process.env.GEMINI_API_KEY) providers.push(geminiNoticeProvider)
  return providers
}
