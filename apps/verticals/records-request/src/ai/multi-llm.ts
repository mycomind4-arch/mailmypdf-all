export type LlmProviderId = string

export type LlmTask<I, O> = {
  id: string
  input: I
  outputSchema: string
  metadata?: Record<string, string>
}

export type LlmResult<O> = {
  provider: LlmProviderId
  model: string
  output: O
  confidence: number
  warnings: readonly string[]
}

export interface LlmProvider {
  readonly id: LlmProviderId
  execute<I, O>(task: LlmTask<I, O>): Promise<LlmResult<O>>
}

export type MultiLlmResult<O> = {
  selected: LlmResult<O>
  candidates: readonly LlmResult<O>[]
  agreement: number
  warnings: readonly string[]
}

export type MultiLlmOptions<O> = {
  minProviders?: number
  quorum?: number
  fingerprint?: (output: O) => string
}

/**
 * Provider-agnostic orchestration. Providers are injected at runtime, so the
 * workflow is not coupled to OpenAI, Anthropic, Google, or any single vendor.
 * Failed providers are isolated and reported rather than silently discarded.
 */
export async function executeWithMultipleLlmProviders<I, O>(
  providers: readonly LlmProvider[],
  task: LlmTask<I, O>,
  options: MultiLlmOptions<O> = {},
): Promise<MultiLlmResult<O>> {
  const minProviders = options.minProviders ?? 1
  const fingerprint = options.fingerprint ?? ((output: O) => JSON.stringify(output))
  const settled = await Promise.allSettled(providers.map((provider) => provider.execute(task)))
  const candidates: LlmResult<O>[] = []
  const warnings: string[] = []

  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      candidates.push(result.value)
    } else {
      warnings.push(`LLM provider ${providers[index]?.id ?? 'unknown'} failed: ${String(result.reason)}`)
    }
  })

  if (candidates.length < minProviders) {
    throw new Error(`Insufficient LLM providers succeeded: ${candidates.length}/${minProviders}`)
  }

  const groups = new Map<string, LlmResult<O>[]>()
  for (const candidate of candidates) {
    const key = fingerprint(candidate.output)
    groups.set(key, [...(groups.get(key) ?? []), candidate])
  }

  const ranked = [...groups.values()].sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length
    return (b.reduce((sum, item) => sum + item.confidence, 0) / b.length) -
      (a.reduce((sum, item) => sum + item.confidence, 0) / a.length)
  })
  const winningGroup = ranked[0] ?? []
  const selected = [...winningGroup].sort((a, b) => b.confidence - a.confidence)[0]
  if (!selected) throw new Error('No LLM result available')

  const agreement = winningGroup.length / candidates.length
  const quorum = options.quorum ?? 0
  if (agreement < quorum) {
    warnings.push(`LLM consensus below required quorum: ${agreement.toFixed(2)} < ${quorum.toFixed(2)}`)
  }
  if (groups.size > 1) {
    warnings.push(`LLM providers disagreed across ${groups.size} distinct outputs`)
  }

  return { selected, candidates, agreement, warnings }
}
