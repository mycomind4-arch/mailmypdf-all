import { insuranceWorkflowMap, type InsuranceWorkflowId, type InsuranceWorkflowDefinition } from './insurance-workflows'

export const INSURANCE_STAGES = ['claim','coverage-documents','evidence','timeline','gaps','response-appeal','review','mail-proof'] as const
export type InsuranceStage = typeof INSURANCE_STAGES[number]

export interface InsuranceCaseState {
  workflowId: InsuranceWorkflowId
  completedStages: readonly InsuranceStage[]
  documents: number
  evidenceItems: number
  timelineEvents: number
  unresolvedGaps: number
  draftReady: boolean
  reviewed: boolean
}

export interface InsuranceExecutionPlan {
  workflow: InsuranceWorkflowDefinition
  nextStage: InsuranceStage | null
  status: 'READY' | 'BLOCKED' | 'REVIEW_REQUIRED' | 'COMPLETE'
  reasons: string[]
}

export function getNextStage(state: InsuranceCaseState): InsuranceStage | null {
  return INSURANCE_STAGES.find(stage => !state.completedStages.includes(stage)) ?? null
}

export function planInsuranceWorkflow(state: InsuranceCaseState): InsuranceExecutionPlan {
  const workflow = insuranceWorkflowMap[state.workflowId]
  if (!workflow) throw new Error(`Unknown insurance workflow: ${state.workflowId}`)
  const reasons: string[] = []
  const nextStage = getNextStage(state)

  if (state.documents === 0) reasons.push('source documents are required')
  if (state.evidenceItems === 0 && ['denied-claim','underpaid-claim','claim-dispute','coverage-denial'].includes(state.workflowId)) reasons.push('material evidence is required')
  if (state.unresolvedGaps > 0 && nextStage === 'review') reasons.push('unresolved evidence gaps require human review')
  if (nextStage === 'mail-proof' && !state.reviewed) reasons.push('human review is required before fulfillment')

  let status: InsuranceExecutionPlan['status'] = 'READY'
  if (reasons.length > 0) status = nextStage === 'mail-proof' || workflow.risk === 'CRITICAL' ? 'BLOCKED' : 'REVIEW_REQUIRED'
  else if (nextStage === null) status = 'COMPLETE'

  return { workflow, nextStage, status, reasons }
}
