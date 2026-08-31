import { describe, expect, it } from 'vitest'
import { getNextStage, planInsuranceWorkflow } from './insurance-workflow-engine'

describe('Insurance Claims workflow engine', () => {
  it('uses the canonical eight-stage domain sequence', () => {
    expect(getNextStage({ workflowId:'denied-claim', completedStages:[], documents:0, evidenceItems:0, timelineEvents:0, unresolvedGaps:0, draftReady:false, reviewed:false })).toBe('claim')
  })

  it('blocks consequential denial workflows when evidence is absent', () => {
    const result = planInsuranceWorkflow({ workflowId:'denied-claim', completedStages:['claim','coverage-documents'], documents:2, evidenceItems:0, timelineEvents:2, unresolvedGaps:0, draftReady:false, reviewed:false })
    expect(result.status).toBe('REVIEW_REQUIRED')
    expect(result.reasons).toContain('material evidence is required')
  })

  it('requires human review before fulfillment', () => {
    const result = planInsuranceWorkflow({ workflowId:'new-claim', completedStages:['claim','coverage-documents','evidence','timeline','gaps','response-appeal','review'], documents:2, evidenceItems:5, timelineEvents:4, unresolvedGaps:0, draftReady:true, reviewed:false })
    expect(result.status).toBe('BLOCKED')
    expect(result.reasons).toContain('human review is required before fulfillment')
  })

  it('reports complete only after all stages finish', () => {
    const stages = ['claim','coverage-documents','evidence','timeline','gaps','response-appeal','review','mail-proof'] as const
    const result = planInsuranceWorkflow({ workflowId:'new-claim', completedStages:stages, documents:2, evidenceItems:5, timelineEvents:4, unresolvedGaps:0, draftReady:true, reviewed:true })
    expect(result.status).toBe('COMPLETE')
    expect(result.nextStage).toBeNull()
  })
})
