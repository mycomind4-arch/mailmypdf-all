import type { Condition, MailJob, Schedule, WorkflowAction } from '../domain/models'

export type WorkflowContext = Record<string, unknown>

export function evaluateCondition(condition: Condition, context: WorkflowContext): boolean {
  const actual = context[condition.field]
  if (condition.operator === 'exists') return actual !== undefined && actual !== null
  if (condition.operator === 'equals') return actual === condition.value
  if (condition.operator === 'not_equals') return actual !== condition.value
  if (condition.operator === 'contains') return String(actual ?? '').toLowerCase().includes(String(condition.value).toLowerCase())
  if (condition.operator === 'greater_than') return Number(actual) > Number(condition.value)
  if (condition.operator === 'less_than') return Number(actual) < Number(condition.value)
  return false
}

export function conditionsPass(conditions: Condition[] | undefined, context: WorkflowContext): boolean {
  return !conditions?.length || conditions.every((condition) => evaluateCondition(condition, context))
}

export interface WorkflowPlan {
  shouldSend: boolean
  requiresApproval: boolean
  stop: boolean
  waitSeconds?: number
  mailClass?: MailJob['mailClass']
  notifications: Array<'email' | 'in_app'>
  generatedTemplateIds: string[]
  reason?: string
}

/**
 * Pure workflow planner. It deliberately performs no I/O so the same logic can
 * be used by the UI preview, API, Trigger.dev workers and future Temporal
 * adapter without creating provider coupling.
 */
export function planWorkflow(schedule: Schedule, context: WorkflowContext): WorkflowPlan {
  if (schedule.status !== 'active') {
    return { shouldSend: false, requiresApproval: false, stop: true, notifications: [], generatedTemplateIds: [], reason: 'Schedule is not active' }
  }
  if (!conditionsPass(schedule.trigger.conditions, context)) {
    return { shouldSend: false, requiresApproval: false, stop: true, notifications: [], generatedTemplateIds: [], reason: 'Trigger conditions did not pass' }
  }

  const plan: WorkflowPlan = {
    shouldSend: false,
    requiresApproval: false,
    stop: false,
    notifications: [],
    generatedTemplateIds: [],
  }

  for (const action of schedule.actions as WorkflowAction[]) {
    if (action.type === 'generate_document') plan.generatedTemplateIds.push(action.templateId)
    if (action.type === 'require_approval') plan.requiresApproval = true
    if (action.type === 'send_mail') {
      plan.shouldSend = true
      plan.mailClass = action.mailClass
    }
    if (action.type === 'wait') plan.waitSeconds = action.durationSeconds
    if (action.type === 'notify') plan.notifications.push(action.channel)
    if (action.type === 'stop_if' && conditionsPass(action.conditions, context)) {
      plan.stop = true
      plan.shouldSend = false
      plan.reason = 'A stop condition matched'
    }
  }

  return plan
}
