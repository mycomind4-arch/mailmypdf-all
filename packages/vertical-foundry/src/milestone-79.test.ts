/**
 * Milestone 79: Batch Foundry Runner — Tests
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { BatchFoundryRunner, serializeBatchResult } from './batch-foundry-runner.js'
import { LifecycleManager } from './lifecycle-manager.js'
import { MetricsCollector } from './execution-metrics.js'
import { DryRunFactory, DryRunDeployment, DryRunRegistry } from './provider-adapters.js'
import type { PipelineConfig } from './pipeline-integration.js'
import type { DiscoveryInput } from './discovery-pipeline.js'

const config: PipelineConfig = {
  factory: new DryRunFactory(),
  deployment: new DryRunDeployment(),
  registry: new DryRunRegistry(),
  framework: 'static',
  domainTemplate: (id: string) => `${id}.mailmypdf.com`,
  repository: 'mycomind4-arch/foundry-verticals',
  createPR: false,
}

const input: DiscoveryInput = {
  keywords: [
    { keyword: 'send certified mail online', monthlyVolume: 18000, keywordDifficulty: 22, cpc: 3.50, intent: 'transactional', trend: 'rising' },
    { keyword: 'mail invoice online', monthlyVolume: 8100, keywordDifficulty: 18, cpc: 2.50, intent: 'transactional', trend: 'rising' },
    { keyword: 'send legal notice certified mail', monthlyVolume: 5500, keywordDifficulty: 15, cpc: 4.00, intent: 'transactional', trend: 'rising' },
    { keyword: 'postcard marketing service', monthlyVolume: 12100, keywordDifficulty: 28, cpc: 4.50, intent: 'commercial', trend: 'rising' },
  ],
  competitors: [
    { competitor: 'LegalZoom', whatTheyDo: 'Online legal docs', whatTheyMiss: 'No self-service PDF upload for certified mailing', gapScore: 75 },
    { competitor: 'Click2Mail', whatTheyDo: 'Online mailing', whatTheyMiss: 'No certified mail option', gapScore: 70 },
  ],
  capabilities: [
    { capability: 'USPS Certified Mail with tracking', supported: true, notes: 'Full USPS API integration' },
    { capability: 'Batch printing and inserting', supported: true, notes: 'Industrial printing facility' },
    { capability: 'Postcard printing and mailing', supported: true, notes: 'Standard and oversized formats' },
    { capability: 'Generic document mailing', supported: true, notes: 'Any PDF via First Class or Priority' },
  ],
}

test('M79: batch runner discovers and processes multiple verticals', async () => {
  const runner = new BatchFoundryRunner(config)
  const result = await runner.runBatch('batch-001', input)

  assert.ok(result.processed.length >= 3, `Expected ≥3 processed, got ${result.processed.length}`)
  assert.ok(result.summary.totalDiscovered >= 3)
  assert.equal(result.summary.totalSkipped, 0)
})

test('M79: all processed verticals pass gates', async () => {
  const runner = new BatchFoundryRunner(config)
  const result = await runner.runBatch('batch-002', input)

  for (const p of result.processed) {
    assert.ok(p.pipelineResult.allGatesPassed, `${p.candidate.name} did not pass all gates`)
  }
  assert.equal(result.summary.totalPassed, result.processed.length)
  assert.equal(result.summary.totalFailed, 0)
})

test('M79: batch runner skips already-produced verticals', async () => {
  const runner = new BatchFoundryRunner(config)
  runner.markProduced('certified-mail') // Pre-mark as produced

  const result = await runner.runBatch('batch-003', input)

  assert.ok(result.skipped.length >= 1, 'Should skip pre-marked vertical')
  assert.ok(result.skipped.includes('certified-mail'))
  assert.ok(!result.processed.some(p => p.candidate.id === 'certified-mail'))
})

test('M79: second batch run skips all from first run', async () => {
  const runner = new BatchFoundryRunner(config)

  const firstRun = await runner.runBatch('batch-a', input)
  const firstRunIds = firstRun.processed.map(p => p.candidate.id)

  const secondRun = await runner.runBatch('batch-b', input)
  assert.equal(secondRun.summary.totalProcessed, 0)
  assert.equal(secondRun.summary.totalSkipped, firstRunIds.length)
})

test('M79: batch result tracks cost per vertical', async () => {
  const runner = new BatchFoundryRunner(config)
  const result = await runner.runBatch('batch-004', input)

  for (const p of result.processed) {
    assert.ok(p.costUsd > 0, `${p.candidate.name} should have cost > 0`)
  }
  assert.ok(result.summary.totalCostUsd > 0)
})

test('M79: lifecycle manager tracks all processed verticals', async () => {
  const lifecycle = new LifecycleManager()
  const runner = new BatchFoundryRunner(config, lifecycle)
  const result = await runner.runBatch('batch-005', input)

  for (const p of result.processed) {
    const history = lifecycle.get(p.candidate.id)
    assert.ok(history, `No lifecycle for ${p.candidate.id}`)
    assert.equal(history!.currentState, 'registered')
  }
})

test('M79: metrics collector records all runs', async () => {
  const metrics = new MetricsCollector()
  const runner = new BatchFoundryRunner(config, undefined, metrics)
  const result = await runner.runBatch('batch-006', input)

  const summary = metrics.getSummary()
  assert.equal(summary.totalRuns, result.processed.length)
  assert.equal(summary.successRate, 1.0)
})

test('M79: batch result is serializable', async () => {
  const runner = new BatchFoundryRunner(config)
  const result = await runner.runBatch('batch-007', input)

  const serialized = serializeBatchResult(result)
  const parsed = JSON.parse(serialized)

  assert.equal(parsed.runId, 'batch-007')
  assert.ok(parsed.summary.totalDiscovered >= 3)
  assert.ok(parsed.processed.length >= 3)
  for (const p of parsed.processed) {
    assert.ok(p.id)
    assert.ok(p.name)
    assert.ok(p.score >= 60)
    assert.equal(p.allGatesPassed, true)
    assert.ok(p.deploymentUrl)
  }
})

test('M79: produced verticals list is accessible', async () => {
  const runner = new BatchFoundryRunner(config)
  await runner.runBatch('batch-008', input)

  const produced = runner.getProducedVerticals()
  assert.ok(produced.length >= 3)
  assert.ok(produced.some(id => id.includes('certified')))
  assert.ok(produced.some(id => id.includes('invoice')))
})

test('M79: batch handles empty discovery input gracefully', async () => {
  const runner = new BatchFoundryRunner(config)
  const result = await runner.runBatch('batch-empty', { keywords: [], competitors: [], capabilities: [] })

  assert.equal(result.processed.length, 0)
  assert.equal(result.summary.totalDiscovered, 0)
  assert.equal(result.summary.totalCostUsd, 0)
})
