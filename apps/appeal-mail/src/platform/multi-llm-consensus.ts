/**
 * Multi-LLM Consensus Orchestrator for Appeal Mail
 *
 * Runs analysis/drafting/validation across all configured LLM providers
 * and selects the result with the highest cross-provider agreement.
 *
 * This wraps the existing llm-service.ts callLLM function with consensus logic.
 */

import { callLLM, getAvailableProviders, type LLMConfig, LLMMessage, LLMResponse, LLMProvider } from './llm-service'

export type MultiLlmConsensusPolicy = {
  minimumProviders: number
  agreementThreshold: number
  maxProviders: number
}

export type MultiLlmConsensusResult = {
  text: string
  provider: LLMProvider
  model: string
  confidence: number
  agreement: number
  providers: LLMProvider[]
  disagreements: LLMProvider[]
  warnings: string[]
}

export const DEFAULT_APPEAL_LLM_POLICY: MultiLlmConsensusPolicy = {
  minimumProviders: 1,
  agreementThreshold: 0.67,
  maxProviders: 3,
}

function fingerprint(text: string): string {
  // Normalize whitespace and case for comparison
  return text.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 500)
}

export async function runMultiLlmConsensus(
  messages: LLMMessage[],
  baseConfig: Omit<LLMConfig, 'provider'>,
  policy: MultiLlmConsensusPolicy = DEFAULT_APPEAL_LLM_POLICY,
): Promise<MultiLlmConsensusResult> {
  const available = getAvailableProviders()
  const selected = available.slice(0, Math.max(policy.minimumProviders, Math.min(policy.maxProviders, available.length)))

  if (selected.length < policy.minimumProviders) {
    throw new Error(`MULTI_LLM_PROVIDER_QUORUM_NOT_MET: required ${policy.minimumProviders}, available ${selected.length}`)
  }

  const results = await Promise.allSettled(
    selected.map((provider) => callLLM(messages, { ...baseConfig, provider })),
  )

  const successful: { response: LLMResponse; provider: LLMProvider }[] = []
  const failures: string[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successful.push({ response: result.value, provider: selected[index] })
    } else {
      failures.push(`LLM provider ${selected[index]} failed: ${String(result.reason)}`)
    }
  })

  if (successful.length < policy.minimumProviders) {
    throw new Error(`MULTI_LLM_RESULT_QUORUM_NOT_MET: required ${policy.minimumProviders}, succeeded ${successful.length}`)
  }

  // Group by fingerprint similarity
  const groups = new Map<string, { response: LLMResponse; provider: LLMProvider }[]>()
  for (const item of successful) {
    const key = fingerprint(item.response.text)
    const existing = groups.get(key) ?? []
    existing.push(item)
    groups.set(key, existing)
  }

  // Rank by group size (agreement), then by text length (longer = more complete)
  const ranked = [...groups.values()].sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length
    return b[0].response.text.length - a[0].response.text.length
  })

  const winner = ranked[0] ?? []
  if (winner.length === 0) throw new Error('No LLM result available')

  const agreement = winner.length / successful.length
  const disagreements = ranked.slice(1).flatMap((group) => group.map((item) => item.provider))

  const result: MultiLlmConsensusResult = {
    text: winner[0].response.text,
    provider: winner[0].response.provider,
    model: winner[0].response.model,
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
