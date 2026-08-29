export type LlmTask = 'classification' | 'extraction' | 'contradiction' | 'strategy'

export type LlmProviderResult<T> = {
  provider: string
  model: string
  value: T
  confidence: number
  warnings: string[]
}

export interface LlmProvider {
  id: string
  complete<T>(task: LlmTask, input: unknown): Promise<LlmProviderResult<T>>
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

function stable(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as object).sort())
}

export async function runMultiLlm<T>(
  providers: readonly LlmProvider[],
  task: LlmTask,
  input: unknown,
  policy: MultiLlmPolicy,
): Promise<MultiLlmResult<T>> {
  const selected = providers.slice(0, Math.max(policy.minimumProviders, Math.min(policy.maxProviders, providers.length)))
  if (selected.length < policy.minimumProviders) {
    throw new Error(`MULTI_LLM_PROVIDER_QUORUM_NOT_MET: required ${policy.minimumProviders}, available ${selected.length}`)
  }

  const results = await Promise.allSettled(selected.map((provider) => provider.complete<T>(task, input)))
  const successful = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
  const failures = results.flatMap((result) => result.status === 'rejected' ? [String(result.reason)] : [])

  if (successful.length < policy.minimumProviders) {
    throw new Error(`MULTI_LLM_RESULT_QUORUM_NOT_MET: required ${policy.minimumProviders}, succeeded ${successful.length}`)
  }

  const groups = new Map<string, LlmProviderResult<T>[]>()
  for (const result of successful) {
    const key = stable(result.value)
    groups.set(key, [...(groups.get(key) ?? []), result])
  }

  const ranked = [...groups.values()].sort((a, b) => b.reduce((sum, r) => sum + r.confidence, 0) - a.reduce((sum, r) => sum + r.confidence, 0))
  const winner = ranked[0]
  const agreement = winner.length / successful.length
  if (agreement < policy.agreementThreshold) {
    return {
      value: winner[0].value,
      confidence: Math.min(...winner.map((r) => r.confidence)),
      providers: successful.map((r) => r.provider),
      disagreements: ranked.slice(1).flatMap((group) => group.map((r) => r.provider)),
      warnings: [...failures, 'MULTI_LLM_DISAGREEMENT_REQUIRES_REVIEW'],
    }
  }

  return {
    value: winner[0].value,
    confidence: Math.min(1, winner.reduce((sum, r) => sum + r.confidence, 0) / winner.length),
    providers: successful.map((r) => r.provider),
    disagreements: ranked.slice(1).flatMap((group) => group.map((r) => r.provider)),
    warnings: failures,
  }
}
