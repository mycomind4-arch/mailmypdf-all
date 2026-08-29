import assert from 'node:assert/strict'
import test from 'node:test'
import {
  diagnoseFailure,
  isDeterministicFailure,
  withRecovery,
  CostTracker,
  MetricsCollector,
  StageTimer,
  ProductionApprovalGate,
  buildDashboard,
  renderDashboardText,
  VerticalPortfolio,
} from './index.js'
import type { RetryPolicy } from './retry-policy.js'

// ── Milestone 66: Failure Diagnosis Tests ────────────────────────────────────

test('diagnoseFailure classifies auth errors as non-retryable', () => {
  const record = diagnoseFailure(new Error('401 Unauthorized: invalid token'), {
    runId: 'run-1',
    verticalId: 'vert-1',
    stage: 'deployment',
    provider: 'cloudflare',
  })
  assert.equal(record.category, 'auth_failure')
  assert.equal(record.retryable, false)
  assert.equal(record.recommendedAction, 'fix_credentials')
})

test('diagnoseFailure classifies rate limiting as transient retryable', () => {
  const record = diagnoseFailure('429 Too Many Requests', {
    runId: 'run-1',
    verticalId: 'vert-1',
    stage: 'research',
    provider: 'model',
  })
  assert.equal(record.category, 'transient_infrastructure_failure')
  assert.equal(record.retryable, true)
  assert.equal(record.recommendedAction, 'wait_and_retry')
})

test('diagnoseFailure classifies build failures as retryable with code fix', () => {
  const record = diagnoseFailure('Build failed: module not found', {
    runId: 'run-1',
    verticalId: 'vert-1',
    stage: 'implementation',
  })
  assert.equal(record.category, 'build_failure')
  assert.equal(record.retryable, true)
  assert.equal(record.recommendedAction, 'fix_code')
})

test('diagnoseFailure classifies policy violations as non-retryable', () => {
  const record = diagnoseFailure('Policy violation: excluded repository', {
    runId: 'run-1',
    verticalId: 'vert-1',
    stage: 'implementation',
  })
  assert.equal(record.category, 'policy_failure')
  assert.equal(record.retryable, false)
  assert.equal(record.recommendedAction, 'escalate')
})

test('diagnoseFailure classifies budget overruns as non-retryable', () => {
  const record = diagnoseFailure('Budget exceeded: cost limit reached', {
    runId: 'run-1',
    verticalId: 'vert-1',
    stage: 'qa',
  })
  assert.equal(record.category, 'budget_failure')
  assert.equal(record.retryable, false)
  assert.equal(record.recommendedAction, 'increase_budget')
})

test('diagnoseFailure defaults to provider_failure when provider specified', () => {
  const record = diagnoseFailure('Some unknown error', {
    runId: 'run-1',
    verticalId: 'vert-1',
    stage: 'deployment',
    provider: 'cloudflare',
  })
  assert.equal(record.category, 'provider_failure')
  assert.equal(record.retryable, true)
})

test('isDeterministicFailure correctly identifies non-retryable categories', () => {
  assert.ok(isDeterministicFailure('auth_failure'))
  assert.ok(isDeterministicFailure('policy_failure'))
  assert.ok(isDeterministicFailure('budget_failure'))
  assert.ok(isDeterministicFailure('integrity_failure'))
  assert.ok(!isDeterministicFailure('transient_infrastructure_failure'))
  assert.ok(!isDeterministicFailure('build_failure'))
})

test('diagnoseFailure includes checkpoint when provided', () => {
  const cp = { runId: 'run-1', stage: 'deployment', state: { progress: '50%' }, createdAt: new Date().toISOString() }
  const record = diagnoseFailure('Deploy failed', {
    runId: 'run-1',
    verticalId: 'vert-1',
    stage: 'deployment',
    checkpoint: cp,
  })
  assert.ok(record.checkpoint)
  assert.equal(record.checkpoint!.stage, 'deployment')
})

// ── Milestone 67: Bounded Recovery Tests ─────────────────────────────────────

const fastRetryPolicy: RetryPolicy = { maxAttempts: 3, backoffMs: 1 }

test('withRecovery succeeds on first attempt (no retries needed)', async () => {
  let calls = 0
  const result = await withRecovery(async () => {
    calls++
    return 'success'
  }, {
    runId: 'run-1',
    verticalId: 'vert-1',
    stage: 'research',
    retryPolicy: fastRetryPolicy,
    maxRepairs: 2,
    backoffBaseMs: 1,
    backoffMaxMs: 10,
  })

  assert.ok(result.success)
  assert.equal(result.result, 'success')
  assert.equal(result.totalRetries, 0)
  assert.equal(result.totalRepairs, 0)
  assert.equal(calls, 1)
})

test('withRecovery retries transient failures and eventually succeeds', async () => {
  let calls = 0
  const result = await withRecovery(async () => {
    calls++
    if (calls < 3) throw new Error('ETIMEDOUT: connection timeout')
    return 'recovered'
  }, {
    runId: 'run-2',
    verticalId: 'vert-2',
    stage: 'deployment',
    retryPolicy: fastRetryPolicy,
    maxRepairs: 0,
    backoffBaseMs: 1,
    backoffMaxMs: 10,
  })

  assert.ok(result.success)
  assert.equal(result.result, 'recovered')
  assert.equal(result.totalRetries, 2)
  assert.ok(result.attempts.length >= 2)
})

test('withRecovery does NOT retry deterministic failures (auth)', async () => {
  let calls = 0
  const result = await withRecovery(async () => {
    calls++
    throw new Error('401 Unauthorized: invalid token')
  }, {
    runId: 'run-3',
    verticalId: 'vert-3',
    stage: 'deployment',
    retryPolicy: fastRetryPolicy,
    maxRepairs: 2,
    backoffBaseMs: 1,
    backoffMaxMs: 10,
  })

  assert.ok(!result.success)
  assert.equal(calls, 1)
  assert.ok(result.finalFailure)
  assert.equal(result.finalFailure!.category, 'auth_failure')
})

test('withRecovery exhausts retry budget and fails', async () => {
  let calls = 0
  const result = await withRecovery(async () => {
    calls++
    throw new Error('500 Internal Server Error')
  }, {
    runId: 'run-4',
    verticalId: 'vert-4',
    stage: 'research',
    retryPolicy: { maxAttempts: 2, backoffMs: 1 },
    maxRepairs: 0,
    backoffBaseMs: 1,
    backoffMaxMs: 5,
  })

  assert.ok(!result.success)
  assert.equal(calls, 3) // 1 initial + 2 retries
  assert.ok(result.finalFailure)
})

test('withRecovery uses repair function for repairable failures', async () => {
  let calls = 0
  let repairCalls = 0
  const result = await withRecovery(async () => {
    calls++
    if (calls === 1) throw new Error('QA failure: quality score too low')
    return 'fixed'
  }, {
    runId: 'run-5',
    verticalId: 'vert-5',
    stage: 'qa',
    retryPolicy: fastRetryPolicy,
    repairFn: async () => {
      repairCalls++
      return true
    },
    maxRepairs: 2,
    backoffBaseMs: 1,
    backoffMaxMs: 10,
  })

  assert.ok(result.success)
  assert.equal(result.result, 'fixed')
  assert.equal(repairCalls, 1)
  assert.equal(result.totalRepairs, 1)
})

test('withRecovery preserves original failure in attempts', async () => {
  const result = await withRecovery(async () => {
    throw new Error('503 Service Unavailable')
  }, {
    runId: 'run-6',
    verticalId: 'vert-6',
    stage: 'deployment',
    retryPolicy: { maxAttempts: 1, backoffMs: 1 },
    maxRepairs: 0,
    backoffBaseMs: 1,
    backoffMaxMs: 5,
  })

  assert.ok(!result.success)
  assert.ok(result.attempts.length > 0)
  assert.equal(result.attempts[0]!.failure.error, '503 Service Unavailable')
})

test('withRecovery creates checkpoints', async () => {
  const result = await withRecovery(async () => {
    throw new Error('500 server error')
  }, {
    runId: 'run-7',
    verticalId: 'vert-7',
    stage: 'deployment',
    retryPolicy: { maxAttempts: 1, backoffMs: 1 },
    maxRepairs: 0,
    backoffBaseMs: 1,
    backoffMaxMs: 5,
  })

  assert.ok(!result.success)
  assert.ok(result.checkpoints.length > 0)
  assert.ok(result.checkpoints.some((cp) => cp.stage.includes('failure')))
})

// ── Milestone 69: Cost Accounting Tests ──────────────────────────────────────

test('CostTracker records known model costs', () => {
  const tracker = new CostTracker('vert-1', 'run-1')
  tracker.recordModelCost('research', { costUsd: 0.05, inputTokens: 1000, outputTokens: 500 }, 'gpt-4')

  const report = tracker.getReport()
  assert.equal(report.totalKnown, 0.05)
  assert.equal(report.totalUnknown, false)
  assert.equal(report.costByStage['research']!.known, 0.05)
  assert.equal(report.costBySource['model']!.known, 0.05)
})

test('CostTracker records unknown costs as UNKNOWN', () => {
  const tracker = new CostTracker('vert-1', 'run-1')
  tracker.recordModelCost('research', { inputTokens: 1000, outputTokens: 500 }, 'unknown-model')

  const report = tracker.getReport()
  assert.equal(report.totalKnown, 0)
  assert.equal(report.totalUnknown, true)
})

test('CostTracker aggregates costs by stage and source', () => {
  const tracker = new CostTracker('vert-1', 'run-1')
  tracker.recordModelCost('research', { costUsd: 0.10, inputTokens: 100, outputTokens: 50 }, 'gpt-4')
  tracker.recordModelCost('specification', { costUsd: 0.20, inputTokens: 200, outputTokens: 100 }, 'gpt-4')
  tracker.recordDeploymentCost('deployment', { amount: 0.50, description: 'Cloudflare Pages' })
  tracker.recordRetryCost('implementation', 1)

  const report = tracker.getReport()
  assert.equal(report.totalKnown, 0.80)
  assert.equal(report.totalUnknown, true) // retry cost is unknown
  assert.equal(Object.keys(report.costByStage).length, 4)
  assert.ok(Math.abs(report.costBySource['model']!.known - 0.30) < 0.001)
  assert.equal(report.costBySource['deployment']!.known, 0.50)
})

test('CostTracker export produces valid JSON', () => {
  const tracker = new CostTracker('vert-1', 'run-1')
  tracker.recordModelCost('research', { costUsd: 0.05, inputTokens: 100, outputTokens: 50 }, 'gpt-4')
  const exported = tracker.export()
  const parsed = JSON.parse(exported)
  assert.equal(parsed.verticalId, 'vert-1')
  assert.equal(parsed.totalKnown, 0.05)
})

// ── Milestone 70: Execution Metrics Tests ────────────────────────────────────

test('MetricsCollector tracks run metrics', () => {
  const collector = new MetricsCollector()
  collector.recordRun({
    runId: 'run-1',
    verticalId: 'v1',
    verticalName: 'V1',
    stages: [
      { stage: 'research', durationMs: 1000, succeeded: true, repairAttempts: 0 },
      { stage: 'implementation', durationMs: 5000, succeeded: true, repairAttempts: 1 },
    ],
    totalDurationMs: 6000,
    waitingTimeMs: 500,
    modelExecutionMs: 2000,
    buildTimeMs: 3000,
    testTimeMs: 1000,
    qaTimeMs: 500,
    repairTimeMs: 200,
    deploymentTimeMs: 1000,
    firstPassSuccess: false,
    totalRepairs: 1,
    succeeded: true,
  })

  collector.recordRun({
    runId: 'run-2',
    verticalId: 'v2',
    verticalName: 'V2',
    stages: [
      { stage: 'research', durationMs: 800, succeeded: true, repairAttempts: 0 },
      { stage: 'implementation', durationMs: 4000, succeeded: true, repairAttempts: 0 },
    ],
    totalDurationMs: 4800,
    waitingTimeMs: 300,
    modelExecutionMs: 1500,
    buildTimeMs: 2500,
    testTimeMs: 800,
    qaTimeMs: 400,
    repairTimeMs: 0,
    deploymentTimeMs: 800,
    firstPassSuccess: true,
    totalRepairs: 0,
    succeeded: true,
  })

  const summary = collector.getSummary()
  assert.equal(summary.totalRuns, 2)
  assert.equal(summary.successRate, 1.0)
  assert.equal(summary.firstPassSuccessRate, 0.5)
  assert.equal(summary.repairRate, 0.5)
  assert.equal(summary.totalRepairAttempts, 1)
  assert.equal(summary.averageRepairsPerRun, 0.5)
  // Average creation time: (6000 + 4800) / 2 = 5400
  assert.equal(summary.averageVerticalCreationMs, 5400)
})

test('MetricsCollector handles empty state', () => {
  const collector = new MetricsCollector()
  const summary = collector.getSummary()
  assert.equal(summary.totalRuns, 0)
  assert.equal(summary.successRate, 0)
})

test('StageTimer measures duration and tracks repairs', () => {
  const timer = new StageTimer('implementation')
  timer.recordRepair()
  const metric = timer.finish(true)
  assert.ok(metric.durationMs >= 0)
  assert.equal(metric.repairAttempts, 1)
  assert.equal(metric.succeeded, true)
})

// ── Milestone 71: Production Approval Gate Tests ──────────────────────────────

test('ProductionApprovalGate fails closed without approval', () => {
  const gate = new ProductionApprovalGate()
  const manifest = {
    id: 'vert-1',
    name: 'Test',
    domain: 'test.com',
    repository: 'org/repo',
    branch: 'foundry/vert-1',
    capabilities: [],
    generatedAt: new Date().toISOString(),
    previewUrl: 'https://preview.test.com',
  }

  const result = gate.canDeployToProduction(manifest)
  assert.ok(!result.authorized)
  assert.ok(result.reason.includes('No approval'))
})

test('ProductionApprovalGate grants and checks scoped approval', () => {
  const gate = new ProductionApprovalGate()
  const manifest = {
    id: 'vert-1',
    name: 'Test',
    domain: 'test.com',
    repository: 'org/repo',
    branch: 'foundry/vert-1',
    capabilities: [],
    generatedAt: new Date().toISOString(),
    previewUrl: 'https://preview.test.com',
  }

  const approval = gate.requestApproval({
    verticalId: 'vert-1',
    runId: 'run-1',
    previewUrl: 'https://preview.test.com',
    repository: 'org/repo',
    branch: 'foundry/vert-1',
    reason: 'All gates passed, requesting production deployment',
  })

  // Should not be authorized yet
  assert.ok(!gate.canDeployToProduction(manifest).authorized)

  // Grant approval
  gate.grantApproval(approval.id, 'admin@example.com')

  // Should now be authorized
  const result = gate.canDeployToProduction(manifest)
  assert.ok(result.authorized)
  assert.equal(result.reason, 'Approved')
})

test('ProductionApprovalGate denies after rejection', () => {
  const gate = new ProductionApprovalGate()
  const manifest = {
    id: 'vert-1',
    name: 'Test',
    domain: 'test.com',
    repository: 'org/repo',
    branch: 'foundry/vert-1',
    capabilities: [],
    generatedAt: new Date().toISOString(),
    previewUrl: 'https://preview.test.com',
  }

  const approval = gate.requestApproval({
    verticalId: 'vert-1',
    runId: 'run-1',
    previewUrl: 'https://preview.test.com',
    repository: 'org/repo',
    branch: 'foundry/vert-1',
    reason: 'Requesting',
  })

  gate.denyApproval(approval.id, 'admin@example.com', 'Quality too low')

  assert.ok(!gate.canDeployToProduction(manifest).authorized)
})

test('ProductionApprovalGate enforces scope matching', () => {
  const gate = new ProductionApprovalGate()

  const manifest = {
    id: 'vert-1',
    name: 'Test',
    domain: 'test.com',
    repository: 'org/different-repo', // Different from approval scope
    branch: 'foundry/vert-1',
    capabilities: [],
    generatedAt: new Date().toISOString(),
    previewUrl: 'https://preview.test.com',
  }

  const approval = gate.requestApproval({
    verticalId: 'vert-1',
    runId: 'run-1',
    previewUrl: 'https://preview.test.com',
    repository: 'org/original-repo',
    branch: 'foundry/vert-1',
    reason: 'Requesting',
  })

  gate.grantApproval(approval.id, 'admin@example.com')

  const result = gate.canDeployToProduction(manifest)
  assert.ok(!result.authorized)
  assert.ok(result.reason.includes('repository'))
})

test('ProductionApprovalGate supports expiring approvals', async () => {
  const gate = new ProductionApprovalGate()
  const manifest = {
    id: 'vert-1',
    name: 'Test',
    domain: 'test.com',
    repository: 'org/repo',
    branch: 'foundry/vert-1',
    capabilities: [],
    generatedAt: new Date().toISOString(),
    previewUrl: 'https://preview.test.com',
  }

  // Create approval that expires in 1ms
  const approval = gate.requestApproval({
    verticalId: 'vert-1',
    runId: 'run-1',
    previewUrl: 'https://preview.test.com',
    repository: 'org/repo',
    branch: 'foundry/vert-1',
    reason: 'Requesting',
    expiresInMs: 1,
  })

  gate.grantApproval(approval.id, 'admin@example.com')

  // Wait for expiry
  await new Promise((resolve) => setTimeout(resolve, 10))

  const result = gate.canDeployToProduction(manifest)
  assert.ok(!result.authorized)
  assert.ok(result.reason.includes('expired'))
})

// ── Milestone 72: Portfolio Dashboard Tests ──────────────────────────────────

test('buildDashboard aggregates portfolio data', () => {
  const portfolio = new VerticalPortfolio()
  portfolio.add({
    verticalId: 'v1',
    name: 'V1',
    domain: 'v1.com',
    repository: 'org/r1',
    status: 'production',
    gateCount: 6,
    allGatesPassed: true,
    capabilities: [],
    previewUrl: 'https://v1.preview.pages.dev',
    productionUrl: 'https://v1.com',
  })
  portfolio.add({
    verticalId: 'v2',
    name: 'V2',
    domain: 'v2.com',
    repository: 'org/r2',
    status: 'building',
    gateCount: 3,
    allGatesPassed: false,
    capabilities: [],
  })

  const metrics = new MetricsCollector()
  const costTrackers = new Map()
  const auditTrails = new Map()

  const dashboard = buildDashboard(portfolio, metrics, costTrackers, auditTrails)

  assert.equal(dashboard.pipeline.production, 1)
  assert.equal(dashboard.pipeline.building, 1)
  assert.equal(dashboard.health.passing, 1)
  assert.equal(dashboard.deployment.entries.length, 2)
  assert.equal(dashboard.deployment.entries[0]!.name, 'V1')
})

test('renderDashboardText produces readable output', () => {
  const portfolio = new VerticalPortfolio()
  portfolio.add({
    verticalId: 'v1',
    name: 'TestVertical',
    domain: 'test.com',
    repository: 'org/repo',
    status: 'production',
    gateCount: 6,
    allGatesPassed: true,
    capabilities: [],
    previewUrl: 'https://preview.test.com',
    productionUrl: 'https://test.com',
  })

  const metrics = new MetricsCollector()
  const dashboard = buildDashboard(portfolio, metrics, new Map(), new Map())
  const text = renderDashboardText(dashboard)

  assert.ok(text.includes('VERTICAL FOUNDRY DASHBOARD'))
  assert.ok(text.includes('TestVertical'))
  assert.ok(text.includes('Production:     1'))
})
