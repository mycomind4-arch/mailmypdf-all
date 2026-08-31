/**
 * Multi-LLM Consensus Orchestrator for Immigration Mail
 *
 * Runs AI tasks across all configured providers (OpenAI, Claude, Gemini)
 * and selects the result with the highest cross-provider agreement.
 */

import type { AIProvider, AITask } from './ai-provider'

export type ImmigrationLlmResult<T> = {
  value: T
  provider: AIProvider
  model: string
  confidence: number
  agreement: number
  providers: AIProvider[]
  disagreements: AIProvider[]
  warnings: string[]
}

export type ImmigrationLlmPolicy = {
  minimumProviders: number
  agreementThreshold: number
  maxProviders: number
}

export const DEFAULT_IMMIGRATION_LLM_POLICY: ImmigrationLlmPolicy = {
  minimumProviders: 1,
  agreementThreshold: 0.67,
  maxProviders: 3,
}

export interface ImmigrationLlmExecutor<T> {
  provider: AIProvider
  model: string
  execute(task: AITask, input: unknown): Promise<{ value: T; confidence: number }>
}

function fingerprint(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as object).sort()).slice(0, 1000)
}

export function getAvailableImmigrationProviders(): AIProvider[] {
  const providers: AIProvider[] = []
  if (process.env.OPENAI_API_KEY) providers.push('openai')
  if (process.env.ANTHROPIC_API_KEY) providers.push('claude')
  if (process.env.GEMINI_API_KEY) providers.push('gemini')
  return providers
}

export async function runImmigrationMultiLlm<T>(
  executors: readonly ImmigrationLlmExecutor<T>[],
  task: AITask,
  input: unknown,
  policy: ImmigrationLlmPolicy = DEFAULT_IMMIGRATION_LLM_POLICY,
): Promise<ImmigrationLlmResult<T>> {
  const selected = executors.slice(0, Math.max(policy.minimumProviders, Math.min(policy.maxProviders, executors.length)))

  if (selected.length < policy.minimumProviders) {
    throw new Error(`MULTI_LLM_PROVIDER_QUORUM_NOT_MET: required ${policy.minimumProviders}, available ${selected.length}`)
  }

  const results = await Promise.allSettled(
    selected.map((exec) => exec.execute(task, input)),
  )

  const successful: { value: T; confidence: number; provider: AIProvider; model: string }[] = []
  const failures: string[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successful.push({
        value: result.value.value,
        confidence: result.value.confidence,
        provider: selected[index].provider,
        model: selected[index].model,
      })
    } else {
      failures.push(`LLM provider ${selected[index].provider} failed: ${String(result.reason)}`)
    }
  })

  if (successful.length < policy.minimumProviders) {
    throw new Error(`MULTI_LLM_RESULT_QUORUM_NOT_MET: required ${policy.minimumProviders}, succeeded ${successful.length}`)
  }

  const groups = new Map<string, typeof successful>()
  for (const item of successful) {
    const key = fingerprint(item.value)
    const existing = groups.get(key) ?? []
    existing.push(item)
    groups.set(key, existing)
  }

  const ranked = [...groups.values()].sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length
    return b.reduce((s, r) => s + r.confidence, 0) / b.length - a.reduce((s, r) => s + r.confidence, 0) / a.length
  })

  const winner = ranked[0] ?? []
  if (winner.length === 0) throw new Error('No LLM result available')

  const agreement = winner.length / successful.length
  const disagreements = ranked.slice(1).flatMap((group) => group.map((item) => item.provider))

  const result: ImmigrationLlmResult<T> = {
    value: winner[0].value,
    provider: winner[0].provider,
    model: winner[0].model,
    confidence: Math.min(1, agreement * 0.9 + 0.1),
    agreement,
    providers: successful.map((item) => item.provider),
    disagreements,
    warnings: failures,
  }

  if (agreement < policy.agreementThreshold) {
    result.warnings.push('MULTI_LLM_DISAGREEMENT_REQUIRES_REVIEW')
  }

  return result
}
