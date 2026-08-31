import { describe, it } from 'vitest'
import assert from "node:assert/strict";
import {
  RECORDS_GOLD_STAGES,
  hasRecordsPreSendGate,
  isRecordsGoldResult,
  runRecordsGoldWorkflow,
  type RecordsGoldDependencies,
} from './gold-standard'

const makeDependencies = (): RecordsGoldDependencies =>
  Object.fromEntries(
    RECORDS_GOLD_STAGES.map((stage) => [stage, async () => ({ sourceIds: ['src-1'] })]),
  ) as RecordsGoldDependencies

describe('records-request gold standard lifecycle', () => {
  it('requires every stage to pass for completion', async () => {
    const result = await runRecordsGoldWorkflow(makeDependencies())
    assert.equal(result.status, 'completed')
    assert.deepEqual(result.stages.map((stage) => stage.stage), [...RECORDS_GOLD_STAGES])
    assert.equal(isRecordsGoldResult(result), true)
    assert.equal(hasRecordsPreSendGate(result), true)
  })

  it('blocks before later stages when a gate fails', async () => {
    const dependencies = makeDependencies()
    dependencies.validate = async () => ({ sourceIds: [] })

    const result = await runRecordsGoldWorkflow(dependencies)
    assert.equal(result.status, 'blocked')
    assert.deepEqual(result.stages.map((stage) => stage.stage), ['discover', 'draft', 'validate'])
    assert.equal(hasRecordsPreSendGate(result), false)
    assert.equal(isRecordsGoldResult(result), false)
  })

  it('does not treat a thrown integration error as success', async () => {
    const dependencies = makeDependencies()
    dependencies.send = async () => {
      throw new Error('mail provider unavailable')
    }

    const result = await runRecordsGoldWorkflow(dependencies)
    assert.equal(result.status, 'failed')
    assert.equal(result.stages.at(-1)?.stage, 'send')
    assert.equal(result.stages.at(-1)?.status, 'failed')
    assert.equal(isRecordsGoldResult(result), false)
  })
})
