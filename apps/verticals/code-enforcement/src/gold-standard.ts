export type CodeEnforcementGoldStage =
  | 'secure-ingest'
  | 'classify'
  | 'extract'
  | 'timeline'
  | 'evidence'
  | 'discrepancies'
  | 'strategy'
  | 'draft'
  | 'validate'
  | 'review'
  | 'authorization'
  | 'submit'
  | 'track'
  | 'proof'

export type CodeEnforcementGateResult = {
  passed: boolean
  evidenceIds: string[]
  message?: string
}

export type CodeEnforcementStageResult = {
  stage: CodeEnforcementGoldStage
  status: 'passed' | 'blocked' | 'failed'
  evidenceIds: string[]
  messages: string[]
}

export type CodeEnforcementGoldDependencies = Record<
  CodeEnforcementGoldStage,
  () => Promise<CodeEnforcementGateResult>
>

export async function runCodeEnforcementGoldWorkflow(
  dependencies: CodeEnforcementGoldDependencies,
) {
  const stages: CodeEnforcementStageResult[] = []
  const ordered: CodeEnforcementGoldStage[] = [
    'secure-ingest', 'classify', 'extract', 'timeline', 'evidence',
    'discrepancies', 'strategy', 'draft', 'validate', 'review',
    'authorization', 'submit', 'track', 'proof',
  ]

  for (const stage of ordered) {
    try {
      const result = await dependencies[stage]()
      const evidenceIds = result.evidenceIds.filter((id) => id.trim().length > 0)
      if (result.passed && evidenceIds.length === 0) {
        stages.push({
          stage,
          status: 'blocked',
          evidenceIds,
          messages: [result.message ?? `${stage} passed without evidence; provenance is required for Gold execution`],
        })
        return { status: 'blocked' as const, stages }
      }

      stages.push({
        stage,
        status: result.passed ? 'passed' : 'blocked',
        evidenceIds,
        messages: result.passed ? [] : [result.message ?? `${stage} gate did not pass`],
      })
      if (!result.passed) return { status: 'blocked' as const, stages }
    } catch (error) {
      stages.push({
        stage,
        status: 'failed',
        evidenceIds: [],
        messages: [error instanceof Error ? error.message : String(error)],
      })
      return { status: 'failed' as const, stages }
    }
  }

  return { status: 'completed' as const, stages }
}
