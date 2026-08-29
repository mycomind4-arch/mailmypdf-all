import {
  computeCaseAssessment,
  type CaseAssessment,
  type CaseAssessmentInput,
} from '@mailmypdf/intelligence'
import type { AgentTask, ModelClass } from './index.js'

export interface CaseAgentPlan {
  assessment: CaseAssessment
  tasks: readonly AgentTask[]
}

export interface CaseAgentPlannerOptions {
  modelClass?: ModelClass
  role?: string
}

/**
 * Turns the platform's deterministic case assessment into an executable agent
 * plan. The intelligence engine remains the source of truth for what needs to
 * happen; the agent runtime is responsible for executing those actions.
 */
export function planCaseAgent(
  input: CaseAssessmentInput,
  options: CaseAgentPlannerOptions = {},
): CaseAgentPlan {
  const assessment = computeCaseAssessment(input)
  const modelClass = options.modelClass ?? 'REASONING'
  const role = options.role ?? 'case-agent'

  const tasks: AgentTask[] = assessment.recommendedActions.map((action) => ({
    id: `case-action:${String(action.id)}`,
    role,
    objective: action.description,
    modelClass,
    input: {
      caseId: assessment.caseId,
      actionType: action.actionType,
      expectedOutcome: action.expectedOutcome,
      priority: action.priority,
      relatedFactIds: action.relatedFactIds ?? [],
      relatedFindingIds: action.relatedFindingIds ?? [],
      relatedContradictionIds: action.relatedContradictionIds ?? [],
      relatedDeadlineRuleIds: action.relatedDeadlineRuleIds ?? [],
      relatedEvidenceIds: action.relatedEvidenceIds ?? [],
      sourceRefs: action.sourceRefs ?? [],
    },
  }))

  return { assessment, tasks }
}
