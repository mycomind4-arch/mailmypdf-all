export const RECORDS_GOLD_STAGES = [
  'discover',
  'draft',
  'validate',
  'review',
  'approval',
  'send',
  'track',
  'follow-up',
  'receive',
  'organize',
  'analyze',
  'escalate',
  'preserve',
] as const

export type RecordsGoldStage = (typeof RECORDS_GOLD_STAGES)[number]
export type RecordsGoldStatus = 'completed' | 'blocked' | 'failed'

export type RecordsGoldEvidence = {
  sourceIds: string[]
  notes?: string[]
}

export type RecordsGoldStageResult = {
  stage: RecordsGoldStage
  status: 'passed' | 'blocked' | 'failed'
  evidence: RecordsGoldEvidence
  messages: string[]
}

export type RecordsGoldDependencies = Record<
  RecordsGoldStage,
  () => Promise<RecordsGoldEvidence>
>

export async function runRecordsGoldWorkflow(
  dependencies: RecordsGoldDependencies,
) {
  const stages: RecordsGoldStageResult[] = []

  for (const stage of RECORDS_GOLD_STAGES) {
    try {
      const evidence = await dependencies[stage]()
      const validEvidence = Array.isArray(evidence.sourceIds) && evidence.sourceIds.length > 0
      if (!validEvidence) {
        stages.push({
          stage,
          status: 'blocked',
          evidence: { sourceIds: [] },
          messages: [`${stage} gate requires at least one evidence/source reference`],
        })
        return { status: 'blocked' as const, stages }
      }

      stages.push({
        stage,
        status: 'passed',
        evidence,
        messages: evidence.notes ?? [],
      })
    } catch (error) {
      stages.push({
        stage,
        status: 'failed',
        evidence: { sourceIds: [] },
        messages: [error instanceof Error ? error.message : String(error)],
      })
      return { status: 'failed' as const, stages }
    }
  }

  return { status: 'completed' as const, stages }
}

export function isRecordsGoldResult(
  result: { status: RecordsGoldStatus; stages: readonly RecordsGoldStageResult[] },
): boolean {
  return result.status === 'completed'
    && RECORDS_GOLD_STAGES.every((stage) =>
      result.stages.some((candidate) => candidate.stage === stage && candidate.status === 'passed'),
    )
}

export function hasRecordsPreSendGate(
  result: { stages: readonly RecordsGoldStageResult[] },
): boolean {
  const required = ['discover', 'draft', 'validate', 'review', 'approval'] as const
  return required.every((stage) =>
    result.stages.some((candidate) => candidate.stage === stage && candidate.status === 'passed'),
  )
}
