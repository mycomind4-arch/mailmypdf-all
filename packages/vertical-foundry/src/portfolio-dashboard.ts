/**
 * Vertical Portfolio Dashboard — operational command center for the
 * autonomous vertical ecosystem.
 *
 * Aggregates data from the portfolio manager, cost tracker, metrics
 * collector, and audit trail into a single dashboard view.
 */

import type { VerticalPortfolio, PortfolioEntry, VerticalStatus } from './portfolio-manager.js'
import type { MetricsCollector, ExecutionMetricsSummary } from './execution-metrics.js'
import type { CostTracker } from './cost-accounting.js'
import type { PipelineAuditTrail } from './pipeline-audit-trail.js'

// ── Dashboard Sections ───────────────────────────────────────────────────────

export interface PipelineSection {
  opportunities: number
  researching: number
  specifying: number
  building: number
  qa: number
  repairing: number
  preview: number
  verification: number
  production: number
}

export interface HealthSection {
  passing: number
  failed: number
  blocked: number
  awaitingApproval: number
}

export interface EconomicsSection {
  estimatedCost: number | 'UNKNOWN'
  actualKnownCost: number
  averageCostPerVertical: number | 'UNKNOWN'
  costPerSuccessfulVertical: number | 'UNKNOWN'
}

export interface ThroughputSection {
  verticalsPerDay: number
  averageBuildTimeMs: number
  successRate: number
  repairRate: number
}

export interface DeploymentSection {
  entries: Array<{
    verticalId: string
    name: string
    previewUrl?: string
    productionUrl?: string
    deploymentStatus: string
  }>
}

export interface QualitySection {
  entries: Array<{
    verticalId: string
    name: string
    qaScore: number
    securityStatus: string
    unresolvedBlockers: number
  }>
}

export interface DashboardData {
  pipeline: PipelineSection
  health: HealthSection
  economics: EconomicsSection
  throughput: ThroughputSection
  deployment: DeploymentSection
  quality: QualitySection
  generatedAt: string
}

// ── Dashboard Builder ────────────────────────────────────────────────────────

export function buildDashboard(
  portfolio: VerticalPortfolio,
  metrics: MetricsCollector,
  costTrackers: Map<string, CostTracker>,
  auditTrails: Map<string, PipelineAuditTrail>,
): DashboardData {
  const entries = portfolio.list()
  const summary = portfolio.getSummary()
  const metricsSummary = metrics.getSummary()

  // Pipeline counts by status
  const pipeline: PipelineSection = {
    opportunities: 0, // opportunities are external input, not tracked here
    researching: summary.byStatus.researching,
    specifying: 0, // specifying is transient, tracked via audit
    building: summary.byStatus.building,
    qa: 0, // qa is transient, tracked via audit
    repairing: 0, // repairing is transient, tracked via audit
    preview: summary.byStatus.previewing + summary.byStatus.registered,
    verification: 0, // verification is transient
    production: summary.byStatus.production,
  }

  // Count repairing/qa/specifying from audit trails
  for (const [, trail] of auditTrails) {
    const trailSummary = trail.getSummary()
    if (trailSummary.pipelineStatus === 'running') {
      const recent = trail.getByType('gate_failed')
      if (recent.length > 0) pipeline.repairing++
    }
  }

  // Health section
  const health: HealthSection = {
    passing: entries.filter((e) => e.allGatesPassed).length,
    failed: entries.filter((e) => e.status === 'rejected').length,
    blocked: entries.filter((e) => e.status === 'disabled').length,
    awaitingApproval: 0, // would come from approval gate
  }

  // Economics
  let totalKnown = 0
  let hasUnknown = false
  let successfulCount = 0
  let successfulCost = 0

  for (const entry of entries) {
    const tracker = costTrackers.get(entry.verticalId)
    if (tracker) {
      const report = tracker.getReport()
      totalKnown += report.totalKnown
      if (report.totalUnknown) hasUnknown = true
      if (entry.status === 'production' || entry.status === 'registered') {
        successfulCount++
        successfulCost += report.totalKnown
      }
    }
  }

  const economics: EconomicsSection = {
    estimatedCost: hasUnknown ? 'UNKNOWN' : totalKnown,
    actualKnownCost: totalKnown,
    averageCostPerVertical: entries.length > 0 ? totalKnown / entries.length : 0,
    costPerSuccessfulVertical: successfulCount > 0 ? successfulCost / successfulCount : 'UNKNOWN',
  }

  // Throughput
  const throughput: ThroughputSection = {
    verticalsPerDay: metricsSummary.totalRuns > 0
      ? Math.round(metricsSummary.totalRuns / Math.max(1, metricsSummary.averageVerticalCreationMs / (24 * 60 * 60 * 1000)) * 10) / 10
      : 0,
    averageBuildTimeMs: metricsSummary.averageVerticalCreationMs,
    successRate: metricsSummary.successRate,
    repairRate: metricsSummary.repairRate,
  }

  // Deployment
  const deployment: DeploymentSection = {
    entries: entries.map((e) => {
      const entry: { verticalId: string; name: string; previewUrl?: string; productionUrl?: string; deploymentStatus: string } = {
        verticalId: e.verticalId,
        name: e.name,
        deploymentStatus: e.status,
      }
      if (e.previewUrl) entry.previewUrl = e.previewUrl
      if (e.productionUrl) entry.productionUrl = e.productionUrl
      return entry
    }),
  }

  // Quality
  const quality: QualitySection = {
    entries: entries.map((e) => ({
      verticalId: e.verticalId,
      name: e.name,
      qaScore: e.allGatesPassed ? 100 : 0,
      securityStatus: e.allGatesPassed ? 'passing' : 'pending',
      unresolvedBlockers: e.allGatesPassed ? 0 : 1,
    })),
  }

  return {
    pipeline,
    health,
    economics,
    throughput,
    deployment,
    quality,
    generatedAt: new Date().toISOString(),
  }
}

// ── Render Dashboard as Text ─────────────────────────────────────────────────

export function renderDashboardText(data: DashboardData): string {
  const lines: string[] = []
  lines.push('═══ VERTICAL FOUNDRY DASHBOARD ═══')
  lines.push(`Generated: ${data.generatedAt}`)
  lines.push('')

  lines.push('─── Pipeline ───')
  lines.push(`  Opportunities:  ${data.pipeline.opportunities}`)
  lines.push(`  Researching:    ${data.pipeline.researching}`)
  lines.push(`  Building:       ${data.pipeline.building}`)
  lines.push(`  QA:             ${data.pipeline.qa}`)
  lines.push(`  Repairing:      ${data.pipeline.repairing}`)
  lines.push(`  Preview:        ${data.pipeline.preview}`)
  lines.push(`  Production:     ${data.pipeline.production}`)
  lines.push('')

  lines.push('─── Health ───')
  lines.push(`  Passing:          ${data.health.passing}`)
  lines.push(`  Failed:           ${data.health.failed}`)
  lines.push(`  Blocked:          ${data.health.blocked}`)
  lines.push(`  Awaiting Approval: ${data.health.awaitingApproval}`)
  lines.push('')

  lines.push('─── Economics ───')
  lines.push(`  Estimated Cost:       ${typeof data.economics.estimatedCost === 'number' ? `$${data.economics.estimatedCost.toFixed(2)}` : 'UNKNOWN'}`)
  lines.push(`  Actual Known Cost:     $${data.economics.actualKnownCost.toFixed(2)}`)
  lines.push(`  Avg Cost/Vertical:     ${typeof data.economics.averageCostPerVertical === 'number' ? `$${data.economics.averageCostPerVertical.toFixed(2)}` : 'UNKNOWN'}`)
  lines.push(`  Cost/Successful Vert:  ${typeof data.economics.costPerSuccessfulVertical === 'number' ? `$${data.economics.costPerSuccessfulVertical.toFixed(2)}` : 'UNKNOWN'}`)
  lines.push('')

  lines.push('─── Throughput ───')
  lines.push(`  Verticals/Day:     ${data.throughput.verticalsPerDay}`)
  lines.push(`  Avg Build Time:    ${data.throughput.averageBuildTimeMs}ms`)
  lines.push(`  Success Rate:      ${(data.throughput.successRate * 100).toFixed(1)}%`)
  lines.push(`  Repair Rate:       ${(data.throughput.repairRate * 100).toFixed(1)}%`)
  lines.push('')

  lines.push('─── Deployment ───')
  for (const entry of data.deployment.entries) {
    lines.push(`  ${entry.name} (${entry.verticalId})`)
    lines.push(`    Status:   ${entry.deploymentStatus}`)
    if (entry.previewUrl) lines.push(`    Preview:  ${entry.previewUrl}`)
    if (entry.productionUrl) lines.push(`    Prod:     ${entry.productionUrl}`)
  }
  lines.push('')

  lines.push('─── Quality ───')
  for (const entry of data.quality.entries) {
    lines.push(`  ${entry.name} (${entry.verticalId})`)
    lines.push(`    QA Score:         ${entry.qaScore}`)
    lines.push(`    Security:          ${entry.securityStatus}`)
    lines.push(`    Unresolved Block:  ${entry.unresolvedBlockers}`)
  }
  lines.push('')
  lines.push('═══ END DASHBOARD ═══')

  return lines.join('\n')
}
