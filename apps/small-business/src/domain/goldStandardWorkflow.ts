import type { SmallBusinessWorkflowDefinition } from './workflows'

export type SmallBusinessGoldStage =
  | 'trigger'
  | 'document'
  | 'validation'
  | 'approval'
  | 'mailing'
  | 'tracking'
  | 'proof'
  | 'archive'

export type GoldGateResult = {
  passed: boolean
  evidenceIds: string[]
  message?: string
}

export type GoldStageResult = {
  stage: SmallBusinessGoldStage
  status: 'passed' | 'blocked' | 'failed'
  evidenceIds: string[]
  messages: string[]
}

export type GoldWorkflowDependencies = {
  evaluateTrigger: () => Promise<GoldGateResult>
  generateDocument: () => Promise<GoldGateResult>
  validate: () => Promise<GoldGateResult>
  requestApproval: () => Promise<GoldGateResult>
  sendMail: () => Promise<GoldGateResult>
  verifyTracking: () => Promise<GoldGateResult>
  verifyProof: () => Promise<GoldGateResult>
  archive: () => Promise<GoldGateResult>
}

export type GoldWorkflowResult = {
  workflowId: string
  status: 'completed' | 'blocked' | 'failed'
  stages: GoldStageResult[]
}

/**
 * Enforces the SMB lifecycle without pretending that an integration exists.
 * Every stage is an injected executable dependency; a missing/false result
 * blocks the workflow rather than being inferred from catalog metadata.
 */
export async function runSmallBusinessGoldWorkflow(
  workflow: SmallBusinessWorkflowDefinition,
  dependencies: GoldWorkflowDependencies,
): Promise<GoldWorkflowResult> {
  const stages: GoldStageResult[] = []

  const run = async (
    stage: SmallBusinessGoldStage,
    action: () => Promise<GoldGateResult>,
  ) => {
    try {
      const result = await action()
      const evidenceIds = result.evidenceIds.filter((id) => id.trim().length > 0)
      if (result.passed && evidenceIds.length === 0) {
        stages.push({
          stage,
          status: 'blocked',
          evidenceIds,
          messages: [result.message ?? `${stage} passed without evidence; provenance is required for Gold execution`],
        })
        return false
      }

      stages.push({
        stage,
        status: result.passed ? 'passed' : 'blocked',
        evidenceIds,
        messages: result.passed ? [] : [result.message ?? `${stage} gate did not pass`],
      })
      return result.passed
    } catch (error) {
      stages.push({
        stage,
        status: 'failed',
        evidenceIds: [],
        messages: [error instanceof Error ? error.message : String(error)],
      })
      return false
    }
  }

  if (!(await run('trigger', dependencies.evaluateTrigger))) return { workflowId: workflow.id, status: 'blocked', stages }
  if (!(await run('document', dependencies.generateDocument))) return { workflowId: workflow.id, status: 'blocked', stages }
  if (!(await run('validation', dependencies.validate))) return { workflowId: workflow.id, status: 'blocked', stages }

  if (workflow.requiresApproval && !(await run('approval', dependencies.requestApproval))) {
    return { workflowId: workflow.id, status: 'blocked', stages }
  }

  if (!(await run('mailing', dependencies.sendMail))) return { workflowId: workflow.id, status: 'blocked', stages }
  if (!(await run('tracking', dependencies.verifyTracking))) return { workflowId: workflow.id, status: 'blocked', stages }
  if (!(await run('proof', dependencies.verifyProof))) return { workflowId: workflow.id, status: 'blocked', stages }
  if (!(await run('archive', dependencies.archive))) return { workflowId: workflow.id, status: 'blocked', stages }

  return { workflowId: workflow.id, status: 'completed', stages }
}
