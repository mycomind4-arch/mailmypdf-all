/** Private outcome lifecycle above existing workflow matters. A successful action is not a resolved case. */
export type CaseGoalState = 'intake' | 'active' | 'waiting' | 'resolved' | 'cancelled'
export interface CaseMoney { amountMinor: number; currency: string }
export interface CaseGoal {
  schema: 'mailmypdf.case-goal/v1'
  id: string
  ownerId: string
  objective: string
  desiredOutcome: string
  category: string
  subject?: string
  soughtValue?: CaseMoney
  evidenceIds: readonly string[]
  matterIds: readonly string[]
  actionKeys: readonly string[]
  state: CaseGoalState
  revision: number
  createdAt: string
  updatedAt: string
  waiting?: { reason: string; dueAt?: string }
  resolution?: { outcome: string; evidenceIds: readonly string[]; recoveredValue?: CaseMoney; confirmedBy: string }
}
export type CaseGoalEvent =
  | { type: 'activate' }
  | { type: 'attach-evidence'; evidenceId: string }
  | { type: 'link-matter'; matterId: string }
  | { type: 'record-action'; actionKey: string }
  | { type: 'wait'; reason: string; dueAt?: string }
  | { type: 'resume' }
  | { type: 'resolve'; outcome: string; evidenceIds: readonly string[]; recoveredValue?: CaseMoney }
  | { type: 'cancel' }

function required(value: string, label: string, max = 4000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`CASE_${label}_INVALID`)
  return value.trim()
}
function time(value: string): number {
  const result = Date.parse(value)
  if (!Number.isFinite(result)) throw new Error('CASE_TIME_INVALID')
  return result
}
function money(value: CaseMoney): CaseMoney {
  if (!Number.isSafeInteger(value.amountMinor) || value.amountMinor < 0 || !/^[A-Z]{3}$/.test(value.currency)) throw new Error('CASE_MONEY_INVALID')
  return { amountMinor: value.amountMinor, currency: value.currency }
}
export function createCaseGoal(input: {
  id: string; ownerId: string; objective: string; desiredOutcome: string; category: string;
  subject?: string; soughtValue?: CaseMoney; now: string;
}): CaseGoal {
  time(input.now)
  return {
    schema: 'mailmypdf.case-goal/v1', id: required(input.id, 'ID', 256), ownerId: required(input.ownerId, 'OWNER', 256),
    objective: required(input.objective, 'OBJECTIVE'), desiredOutcome: required(input.desiredOutcome, 'OUTCOME'),
    category: required(input.category, 'CATEGORY', 100),
    ...(input.subject === undefined ? {} : { subject: required(input.subject, 'SUBJECT', 500) }),
    ...(input.soughtValue === undefined ? {} : { soughtValue: money(input.soughtValue) }),
    evidenceIds: [], matterIds: [], actionKeys: [], state: 'intake', revision: 1, createdAt: input.now, updatedAt: input.now,
  }
}
/** Caller must load an owned goal and authorize every linked evidence/matter/action separately. */
export function transitionCaseGoal(goal: CaseGoal, actorId: string, event: CaseGoalEvent, now: string): CaseGoal {
  if (actorId !== goal.ownerId) throw new Error('CASE_OWNERSHIP_DENIED')
  if (time(now) < time(goal.updatedAt)) throw new Error('CASE_TIME_REGRESSION')
  if (goal.state === 'resolved' || goal.state === 'cancelled') throw new Error('CASE_TERMINAL')
  const next: CaseGoal = structuredClone(goal)
  switch (event.type) {
    case 'activate':
      if (goal.state !== 'intake') throw new Error('CASE_TRANSITION_INVALID')
      next.state = 'active'; break
    case 'attach-evidence': next.evidenceIds = [...new Set([...goal.evidenceIds, required(event.evidenceId, 'EVIDENCE', 256)])]; break
    case 'link-matter': next.matterIds = [...new Set([...goal.matterIds, required(event.matterId, 'MATTER', 256)])]; break
    case 'record-action': next.actionKeys = [...new Set([...goal.actionKeys, required(event.actionKey, 'ACTION', 256)])]; break
    case 'wait':
      if (goal.state !== 'active') throw new Error('CASE_TRANSITION_INVALID')
      if (event.dueAt !== undefined && time(event.dueAt) <= time(now)) throw new Error('CASE_DEADLINE_INVALID')
      next.state = 'waiting'; next.waiting = { reason: required(event.reason, 'WAIT_REASON'), ...(event.dueAt ? { dueAt: event.dueAt } : {}) }; break
    case 'resume':
      if (goal.state !== 'waiting') throw new Error('CASE_TRANSITION_INVALID')
      next.state = 'active'; delete next.waiting; break
    case 'resolve': {
      if (goal.state === 'intake' || !event.evidenceIds.length || event.evidenceIds.some((id) => !goal.evidenceIds.includes(id))) throw new Error('CASE_RESOLUTION_EVIDENCE_REQUIRED')
      const recoveredValue = event.recoveredValue ? money(event.recoveredValue) : undefined
      if (recoveredValue && goal.soughtValue && recoveredValue.currency !== goal.soughtValue.currency) throw new Error('CASE_CURRENCY_MISMATCH')
      next.state = 'resolved'; delete next.waiting
      next.resolution = {
        outcome: required(event.outcome, 'RESOLUTION'), evidenceIds: [...new Set(event.evidenceIds)], confirmedBy: actorId,
        ...(recoveredValue ? { recoveredValue } : {}),
      }; break
    }
    case 'cancel': next.state = 'cancelled'; delete next.waiting; break
    default: throw new Error('CASE_EVENT_INVALID')
  }
  next.revision++; next.updatedAt = now
  return next
}
export interface CaseGoalRepository {
  /** Create atomically; reject duplicate ids. */
  create(goal: CaseGoal): Promise<void>
  loadOwned(ownerId: string, id: string): Promise<CaseGoal | undefined>
  /** Must enforce immutable identity, expected revision, and legal transition in durable storage. */
  save(goal: CaseGoal, expectedRevision: number): Promise<void>
}
