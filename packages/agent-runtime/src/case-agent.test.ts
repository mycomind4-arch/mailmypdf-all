import assert from 'node:assert/strict'
import test from 'node:test'
import { planCaseAgent } from './case-agent.js'

test('case agent planner turns deterministic assessment into executable tasks', () => {
  const plan = planCaseAgent({
    caseId: 'case-1',
    findings: [],
    contradictions: [],
    deadlines: [],
    evidenceItems: [],
    submitted: false,
  })

  assert.equal(plan.assessment.caseId, 'case-1')
  assert.ok(Array.isArray(plan.tasks))
  assert.equal(plan.tasks.length, plan.assessment.recommendedActions.length)
  for (const task of plan.tasks) {
    assert.equal(task.role, 'case-agent')
    assert.equal(task.modelClass, 'REASONING')
    assert.ok(task.id.startsWith('case-action:'))
  }
})
