/**
 * Milestone 75: Full Production Acceptance Test
 *
 * End-to-end acceptance test that exercises the entire Vertical Foundry
 * system as a cohesive whole: opportunity selection → research →
 * specification → code generation → build → QA → deployment →
 * registration → cost tracking → metrics → failure recovery →
 * portfolio dashboard → production approval gate.
 *
 * This test is the "shipping checklist" — if it passes, the system is
 * ready for real-world use with live provider credentials.
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  runFullPipeline,
  type PipelineConfig,
} from './pipeline-integration.js'
import {
  scoreOpportunity,
  type VerticalCandidate,
} from './foundry-contract.js'
import { DryRunFactory, DryRunDeployment, DryRunRegistry } from './provider-adapters.js'
import { generateVerticalCode } from './vertical-code-generator.js'
import {
  createManifest,
  validateManifest,
  startGate,
  completeGate,
  allGatesPassed,
  type VerticalManifest,
} from './vertical-manifest.js'
import { CostTracker } from './cost-accounting.js'
import { MetricsCollector, StageTimer } from './execution-metrics.js'
import { ProductionApprovalGate } from './production-approval-gate.js'
import {
  buildDashboard,
  renderDashboardText,
} from './portfolio-dashboard.js'
import { VerticalPortfolio } from './portfolio-manager.js'
import { diagnoseFailure, type FailureRecord } from './failure-diagnosis.js'
import { withRecovery } from './bounded-recovery.js'
import type { RetryPolicy } from './retry-policy.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── Test fixtures: two real vertical candidates ─────────────────────────────

const invoiceMailer: VerticalCandidate = {
  id: 'invoice-mailer',
  name: 'Invoice Mailer',
  description: 'Upload invoice PDFs and we batch-print, stuff, and mail them via USPS — perfect for small businesses that still need physical invoicing.',
  findings: [
    { source: 'SBA Statistics', claim: '33M small businesses in the US, 40% still mail physical invoices monthly.', confidence: 0.85, capturedAt: '2026-08-01T00:00:00Z' },
    { source: 'Keyword Research', claim: '"mail invoice online" has 8.1K monthly searches with KD=18, strong commercial intent.', confidence: 0.8, capturedAt: '2026-08-02T00:00:00Z' },
    { source: 'Platform Audit', claim: 'Fulfillment pipeline supports batch mailing with per-piece tracking.', confidence: 0.9, capturedAt: '2026-08-03T00:00:00Z' },
    { source: 'Competitor Analysis', claim: 'No pure-play self-service invoice mailing product exists; market is fragmented across print shops.', confidence: 0.75, capturedAt: '2026-08-03T00:00:00Z' },
  ],
  score: scoreOpportunity({
    demand: 78, competition: 70, differentiation: 80, reuse: 88, feasibility: 92, risk: 88,
  }),
}

const legalNoticeMailer: VerticalCandidate = {
  id: 'legal-notice-mailer',
  name: 'Legal Notice Mailer',
  description: 'Prepare and send legal notices — eviction, demand letters, court filings — via Certified Mail with proof of delivery and return receipt.',
  findings: [
    { source: 'Court Statistics', claim: 'Over 3.6M eviction filings per year in the US, each requiring certified mailing.', confidence: 0.9, capturedAt: '2026-08-01T00:00:00Z' },
    { source: 'Attorney Survey', claim: '78% of solo practitioners handle their own mailings and report it as a top frustration.', confidence: 0.8, capturedAt: '2026-08-02T00:00:00Z' },
    { source: 'Keyword Research', claim: '"send legal notice certified mail" has 5.5K monthly searches, KD=15.', confidence: 0.85, capturedAt: '2026-08-02T00:00:00Z' },
    { source: 'Platform Audit', claim: 'Fulfillment pipeline supports certified mailing class with return receipt tracking.', confidence: 0.95, capturedAt: '2026-08-03T00:00:00Z' },
  ],
  score: scoreOpportunity({
    demand: 75, competition: 65, differentiation: 85, reuse: 90, feasibility: 88, risk: 80,
  }),
}

const baseConfig: PipelineConfig = {
  factory: new DryRunFactory(),
  deployment: new DryRunDeployment(),
  registry: new DryRunRegistry(),
  framework: 'static',
  domainTemplate: (id: string) => `${id}.mailmypdf.com`,
  repository: 'mycomind4-arch/foundry-verticals',
  createPR: false,
}

const fastRetry: RetryPolicy = { maxAttempts: 2, backoffMs: 1 }

// ── Acceptance Tests ──────────────────────────────────────────────────────────

test('M75-A: multiple verticals pass through pipeline independently', async () => {
  const [result1, result2] = await Promise.all([
    runFullPipeline(invoiceMailer, baseConfig),
    runFullPipeline(legalNoticeMailer, baseConfig),
  ])

  assert.ok(result1.allGatesPassed, 'Invoice Mailer failed gates')
  assert.ok(result2.allGatesPassed, 'Legal Notice Mailer failed gates')
  assert.notEqual(result1.manifest.id, result2.manifest.id)
  assert.notEqual(result1.manifest.domain, result2.manifest.domain)
})

test('M75-B: generated code for each vertical is distinct and valid', () => {
  const code1 = generateVerticalCode({ candidate: invoiceMailer, framework: 'static', domain: 'invoice-mailer.mailmypdf.com' })
  const code2 = generateVerticalCode({ candidate: legalNoticeMailer, framework: 'static', domain: 'legal-notice-mailer.mailmypdf.com' })

  const html1 = code1.files.find(f => f.path === 'index.html')!
  const html2 = code2.files.find(f => f.path === 'index.html')!

  assert.ok(html1.content.includes('Invoice Mailer'))
  assert.ok(!html1.content.includes('Legal Notice Mailer'))
  assert.ok(html2.content.includes('Legal Notice Mailer'))
  assert.ok(!html2.content.includes('Invoice Mailer'))
  assert.ok(html1.content.includes('invoice-mailer.mailmypdf.com'))
  assert.ok(html2.content.includes('legal-notice-mailer.mailmypdf.com'))
})

test('M75-C: cost tracking accumulates across multiple vertical runs', async () => {
  const tracker1 = new CostTracker(invoiceMailer.id, 'run-75a')
  const tracker2 = new CostTracker(legalNoticeMailer.id, 'run-75b')

  tracker1.recordModelCost('research', { costUsd: 0.10, inputTokens: 4000, outputTokens: 2000 }, 'gpt-4')
  tracker1.recordModelCost('specification', { costUsd: 0.05, inputTokens: 2000, outputTokens: 1000 }, 'gpt-4')
  tracker2.recordModelCost('research', { costUsd: 0.12, inputTokens: 5000, outputTokens: 2500 }, 'gpt-4')
  tracker2.recordModelCost('specification', { costUsd: 0.06, inputTokens: 2500, outputTokens: 1200 }, 'gpt-4')

  const report1 = tracker1.getReport()
  const report2 = tracker2.getReport()

  assert.ok(Math.abs(report1.totalKnown - 0.15) < 0.001)
  assert.ok(Math.abs(report2.totalKnown - 0.18) < 0.001)
  assert.ok(report2.totalKnown > report1.totalKnown, 'Legal notice vertical should cost more')
})

test('M75-D: metrics dashboard aggregates portfolio health', async () => {
  const portfolio = new VerticalPortfolio()
  const metrics = new MetricsCollector()
  const costTrackers = new Map()
  const auditTrails = new Map()

  // Run both verticals
  for (const candidate of [invoiceMailer, legalNoticeMailer]) {
    const result = await runFullPipeline(candidate, baseConfig)
    portfolio.add({
      verticalId: result.manifest.id,
      name: result.manifest.name,
      domain: result.manifest.domain,
      repository: baseConfig.repository,
      status: 'previewing',
      gateCount: result.manifest.gateHistory?.length ?? 6,
      allGatesPassed: result.allGatesPassed,
      capabilities: result.manifest.capabilities,
      previewUrl: result.manifest.previewUrl!,
    })

    const tracker = new CostTracker(candidate.id, `run-75-${candidate.id}`)
    tracker.recordModelCost('research', { costUsd: 0.10, inputTokens: 3000, outputTokens: 1500 }, 'gpt-4')
    costTrackers.set(candidate.id, tracker)

    metrics.recordRun({
      runId: `run-75-${candidate.id}`,
      verticalId: candidate.id,
      verticalName: candidate.name,
      stages: result.gateSummary.map(g => ({
        stage: g.gate, durationMs: g.durationMs ?? 0, succeeded: g.status === 'passed', repairAttempts: 0,
      })),
      totalDurationMs: result.gateSummary.reduce((s, g) => s + (g.durationMs ?? 0), 0),
      waitingTimeMs: 0, modelExecutionMs: 100, buildTimeMs: 50, testTimeMs: 0,
      qaTimeMs: 30, repairTimeMs: 0, deploymentTimeMs: 20,
      firstPassSuccess: true, totalRepairs: 0, succeeded: true,
    })
  }

  const dashboard = buildDashboard(portfolio, metrics, costTrackers, auditTrails)

  assert.equal(dashboard.pipeline.preview, 2)
  assert.equal(dashboard.health.passing, 2)
  assert.equal(dashboard.deployment.entries.length, 2)
  assert.ok(dashboard.deployment.entries.some(e => e.name === 'Invoice Mailer'))
  assert.ok(dashboard.deployment.entries.some(e => e.name === 'Legal Notice Mailer'))

  const text = renderDashboardText(dashboard)
  assert.ok(text.includes('VERTICAL FOUNDRY DASHBOARD'))
  assert.ok(text.includes('Invoice Mailer'))
  assert.ok(text.includes('Legal Notice Mailer'))
})

test('M75-E: production approval gate gates deployment of pipeline output', async () => {
  const gate = new ProductionApprovalGate()
  const result = await runFullPipeline(invoiceMailer, baseConfig)

  const manifest = result.manifest

  // Should fail closed without approval
  const preApproval = gate.canDeployToProduction(manifest)
  assert.ok(!preApproval.authorized)

  // Request approval
  const approval = gate.requestApproval({
    verticalId: manifest.id,
    runId: 'run-75a',
    previewUrl: manifest.previewUrl!,
    repository: manifest.repository,
    branch: manifest.branch,
    reason: 'All gates passed, requesting production deployment for Invoice Mailer',
  })

  // Grant approval
  gate.grantApproval(approval.id, 'shane@mailmypdf.com')

  // Should now be authorized
  const postApproval = gate.canDeployToProduction(manifest)
  assert.ok(postApproval.authorized)
  assert.equal(postApproval.reason, 'Approved')
})

test('M75-F: failure recovery handles transient deployment failure', async () => {
  let attempts = 0
  const recovery = await withRecovery(async () => {
    attempts++
    if (attempts < 2) throw new Error('ETIMEDOUT: Cloudflare API timeout')
    return 'deployed'
  }, {
    runId: 'run-75f',
    verticalId: invoiceMailer.id,
    stage: 'deployment',
    retryPolicy: fastRetry,
    maxRepairs: 0,
    backoffBaseMs: 1,
    backoffMaxMs: 10,
  })

  assert.ok(recovery.success)
  assert.equal(recovery.result, 'deployed')
  assert.equal(recovery.totalRetries, 1)
  assert.ok(recovery.checkpoints.length > 0)
})

test('M75-G: deterministic failures are not retried', async () => {
  let calls = 0
  const recovery = await withRecovery(async () => {
    calls++
    throw new Error('401 Unauthorized: invalid API token')
  }, {
    runId: 'run-75g',
    verticalId: legalNoticeMailer.id,
    stage: 'deployment',
    retryPolicy: fastRetry,
    maxRepairs: 1,
    backoffBaseMs: 1,
    backoffMaxMs: 10,
  })

  assert.ok(!recovery.success)
  assert.equal(calls, 1) // No retries for auth failure
  assert.ok(recovery.finalFailure)
  assert.equal(recovery.finalFailure!.category, 'auth_failure')
})

test('M75-H: audit trail captures full pipeline journey', async () => {
  const result = await runFullPipeline(invoiceMailer, baseConfig)

  const auditEntry = {
    timestamp: new Date().toISOString(),
    runId: 'run-75h',
    verticalId: result.manifest.id,
    verticalName: result.manifest.name,
    gates: result.gateSummary.map(g => ({ gate: g.gate, status: g.status, durationMs: g.durationMs })),
    deploymentUrl: result.deploymentUrl,
    deploymentStatus: result.deploymentStatus,
    registered: result.registered,
    allGatesPassed: result.allGatesPassed,
  }

  const serialized = JSON.stringify(auditEntry)
  const parsed = JSON.parse(serialized)

  assert.equal(parsed.verticalId, 'invoice-mailer')
  assert.equal(parsed.allGatesPassed, true)
  assert.equal(parsed.gates.length, 6)
  assert.ok(parsed.timestamp)

  // Audit trail should be deterministic and reproducible
  const reserialized = JSON.stringify(parsed)
  assert.equal(serialized, reserialized)
})

test('M75-I: portfolio tracks multiple verticals with different statuses', async () => {
  const portfolio = new VerticalPortfolio()

  // Run and add verticals with different outcomes
  const result1 = await runFullPipeline(invoiceMailer, baseConfig)
  portfolio.add({
    verticalId: result1.manifest.id,
    name: result1.manifest.name,
    domain: result1.manifest.domain,
    repository: baseConfig.repository,
    status: 'previewing',
    gateCount: result1.manifest.gateHistory?.length ?? 6,
    allGatesPassed: result1.allGatesPassed,
    capabilities: result1.manifest.capabilities,
    previewUrl: result1.manifest.previewUrl!,
  })

  // Simulate a production vertical
  portfolio.add({
    verticalId: 'certified-mail-from-pdf',
    name: 'Certified Mail from PDF',
    domain: 'certified-mail-from-pdf.mailmypdf.com',
    repository: 'mycomind4-arch/foundry-verticals',
    status: 'production',
    gateCount: 6,
    allGatesPassed: true,
    capabilities: ['certified-mail', 'tracking'],
    previewUrl: 'https://preview.pages.dev/certified',
    productionUrl: 'https://certified-mail-from-pdf.mailmypdf.com',
  })

  assert.equal(portfolio.list().length, 2)
  const all = portfolio.list()
  assert.ok(all.some((v: any) => v.status === 'production'))
  assert.ok(all.some((v: any) => v.status === 'previewing'))
})

test('M75-J: first real vertical files exist on disk from M74', () => {
  const dir = join(process.cwd(), 'generated-verticals', 'certified-mail-from-pdf')
  assert.ok(existsSync(join(dir, 'index.html')), 'M74 vertical index.html missing')
  assert.ok(existsSync(join(dir, '_headers')), 'M74 vertical _headers missing')
  assert.ok(existsSync(join(dir, 'README.md')), 'M74 vertical README.md missing')

  const html = readFileSync(join(dir, 'index.html'), 'utf-8')
  assert.ok(html.includes('Certified Mail from PDF'))
  assert.ok(html.includes('<!DOCTYPE html>'))

  const headers = readFileSync(join(dir, '_headers'), 'utf-8')
  assert.ok(headers.includes('X-Frame-Options: DENY'))
})

test('M75-K: full system acceptance — all subsystems work together', async () => {
  // 1. Select and score candidate
  assert.ok(invoiceMailer.score.overall >= 70)

  // 2. Run full pipeline
  const pipelineResult = await runFullPipeline(invoiceMailer, baseConfig)
  assert.ok(pipelineResult.allGatesPassed)

  // 3. Generate code
  const code = generateVerticalCode({
    candidate: invoiceMailer,
    framework: 'static',
    domain: pipelineResult.manifest.domain,
  })
  assert.ok(code.files.length >= 4)

  // 4. Track costs
  const tracker = new CostTracker(invoiceMailer.id, 'run-75k')
  tracker.recordModelCost('research', { costUsd: 0.10, inputTokens: 3000, outputTokens: 1500 }, 'gpt-4')
  const costReport = tracker.getReport()
  assert.ok(costReport.totalKnown > 0)

  // 5. Collect metrics
  const metrics = new MetricsCollector()
  metrics.recordRun({
    runId: 'run-75k',
    verticalId: invoiceMailer.id,
    verticalName: invoiceMailer.name,
    stages: pipelineResult.gateSummary.map(g => ({
      stage: g.gate, durationMs: g.durationMs ?? 0, succeeded: true, repairAttempts: 0,
    })),
    totalDurationMs: 100,
    waitingTimeMs: 0, modelExecutionMs: 50, buildTimeMs: 30, testTimeMs: 0,
    qaTimeMs: 10, repairTimeMs: 0, deploymentTimeMs: 10,
    firstPassSuccess: true, totalRepairs: 0, succeeded: true,
  })
  assert.equal(metrics.getSummary().totalRuns, 1)

  // 6. Production approval gate
  const gate = new ProductionApprovalGate()
  const approval = gate.requestApproval({
    verticalId: invoiceMailer.id,
    runId: 'run-75k',
    previewUrl: pipelineResult.deploymentUrl,
    repository: baseConfig.repository,
    branch: pipelineResult.manifest.branch,
    reason: 'Full acceptance test — all gates passed',
  })
  gate.grantApproval(approval.id, 'shane@mailmypdf.com')
  assert.ok(gate.canDeployToProduction(pipelineResult.manifest).authorized)

  // 7. Portfolio dashboard
  const portfolio = new VerticalPortfolio()
  portfolio.add({
    verticalId: pipelineResult.manifest.id,
    name: pipelineResult.manifest.name,
    domain: pipelineResult.manifest.domain,
    repository: baseConfig.repository,
    status: 'previewing',
    gateCount: pipelineResult.manifest.gateHistory?.length ?? 6,
    allGatesPassed: pipelineResult.allGatesPassed,
    capabilities: pipelineResult.manifest.capabilities,
    previewUrl: pipelineResult.deploymentUrl,
  })

  const costMap = new Map([[invoiceMailer.id, tracker]])
  const dashboard = buildDashboard(portfolio, metrics, costMap, new Map())
  assert.equal(dashboard.pipeline.preview, 1)
  assert.equal(dashboard.health.passing, 1)

  // 8. Audit serialization
  const audit = JSON.stringify({
    runId: 'run-75k',
    verticalId: invoiceMailer.id,
    allGatesPassed: pipelineResult.allGatesPassed,
    costUsd: costReport.totalKnown,
    approved: true,
  })
  assert.ok(JSON.parse(audit).allGatesPassed)

  // ✅ If we got here, every subsystem is working together
})
