/**
 * Multi-LLM Orchestrator for Dispute Mail
 *
 * Provider-agnostic orchestration that runs analysis/drafting/validation
 * across multiple LLM providers (OpenAI, Anthropic, Gemini) and selects
 * the result with the highest cross-provider agreement.
 *
 * Failed providers are isolated and reported rather than silently discarded.
 * This prevents any single vendor outage from blocking the workflow pipeline.
 */

export type DisputeLlmTask = 'classification' | 'extraction' | 'contradiction' | 'strategy' | 'drafting' | 'validation'

export type LlmProviderResult<T> = {
  provider: string
  model: string
  value: T
  confidence: number
  warnings: string[]
}

export interface DisputeLlmProvider {
  id: string
  complete<T>(task: DisputeLlmTask, systemPrompt: string, input: unknown): Promise<LlmProviderResult<T>>
}

export type MultiLlmPolicy = {
  minimumProviders: number
  agreementThreshold: number
  maxProviders: number
}

export type MultiLlmResult<T> = {
  value: T
  confidence: number
  providers: string[]
  disagreements: string[]
  warnings: string[]
}

function stableFingerprint(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as object).sort())
}

export async function runMultiLlm<T>(
  providers: readonly DisputeLlmProvider[],
  task: DisputeLlmTask,
  systemPrompt: string,
  input: unknown,
  policy: MultiLlmPolicy,
): Promise<MultiLlmResult<T>> {
  const selected = providers.slice(0, Math.max(policy.minimumProviders, Math.min(policy.maxProviders, providers.length)))
  if (selected.length < policy.minimumProviders) {
    throw new Error(`MULTI_LLM_PROVIDER_QUORUM_NOT_MET: required ${policy.minimumProviders}, available ${selected.length}`)
  }

  const results = await Promise.allSettled(
    selected.map((provider) => provider.complete<T>(task, systemPrompt, input)),
  )
  const successful: LlmProviderResult<T>[] = []
  const failures: string[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value)
    } else {
      failures.push(`LLM provider ${selected[index]?.id ?? 'unknown'} failed: ${String(result.reason)}`)
    }
  })

  if (successful.length < policy.minimumProviders) {
    throw new Error(`MULTI_LLM_RESULT_QUORUM_NOT_MET: required ${policy.minimumProviders}, succeeded ${successful.length}`)
  }

  // Group results by fingerprint — providers that agree end up in the same group
  const groups = new Map<string, LlmProviderResult<T>[]>()
  for (const result of successful) {
    const key = stableFingerprint(result.value)
    const existing = groups.get(key) ?? []
    existing.push(result)
    groups.set(key, existing)
  }

  // Rank groups by size (agreement count), then by average confidence
  const ranked = [...groups.values()].sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length
    return (
      b.reduce((sum, r) => sum + r.confidence, 0) / b.length -
      a.reduce((sum, r) => sum + r.confidence, 0) / a.length
    )
  })

  const winner = ranked[0] ?? []
  if (winner.length === 0) throw new Error('No LLM result available')

  const agreement = winner.length / successful.length
  const disagreements = ranked.slice(1).flatMap((group) => group.map((r) => r.provider))

  const result: MultiLlmResult<T> = {
    value: winner[0].value,
    confidence: Math.min(1, winner.reduce((sum, r) => sum + r.confidence, 0) / winner.length),
    providers: successful.map((r) => r.provider),
    disagreements,
    warnings: failures,
  }

  if (agreement < policy.agreementThreshold) {
    result.warnings.push('MULTI_LLM_DISAGREEMENT_REQUIRES_REVIEW')
  }

  return result
}

export const DEFAULT_DISPUTE_LLM_POLICY: MultiLlmPolicy = {
  minimumProviders: 1,
  agreementThreshold: 0.67,
  maxProviders: 3,
}
