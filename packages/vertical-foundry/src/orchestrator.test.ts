import assert from 'node:assert/strict'
import test from 'node:test'
import { applyStageResult, createFoundryRun } from './orchestrator.js'

test('advances a passing run to the next autonomous stage', () => {
  const state = applyStageResult(createFoundryRun('run-1', 'candidate-1'), { stage: 'RESEARCH', score: 92, reviewer: 'market-researcher' })
  assert.equal(state.status, 'RUNNABLE')
  assert.equal(state.currentStage, 'SELECT')
})

test('blocks a failed quality gate', () => {
  const state = applyStageResult(createFoundryRun('run-2', 'candidate-2'), { stage: 'QA', score: 71, blockers: ['critical UX defect'], reviewer: 'ux-qa' })
  assert.equal(state.status, 'BLOCKED')
  assert.equal(state.currentStage, 'QA')
})

test('stops for human approval before deployment', () => {
  const state = applyStageResult(createFoundryRun('run-3', 'candidate-3'), { stage: 'VERIFY', score: 95, reviewer: 'release-judge' })
  assert.equal(state.status, 'HUMAN_REVIEW')
  assert.equal(state.currentStage, 'DEPLOY')
})
