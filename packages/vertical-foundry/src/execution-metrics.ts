/**
 * Real Execution Metrics — measures pipeline performance across runs.
 *
 * Tracks per-stage durations, success rates, repair rates, and the
 * ultimate metric: time from approved opportunity → production-ready vertical.
 */

import type { GateName } from './vertical-manifest.js'

// ── Stage Metrics ────────────────────────────────────────────────────────────

export interface StageMetric {
  stage: GateName | string
  durationMs: number
  succeeded: boolean
  repairAttempts: number
}

export interface RunMetric {
  runId: string
  verticalId: string
  verticalName: string
  stages: StageMetric[]
  totalDurationMs: number
  waitingTimeMs: number
  modelExecutionMs: number
  buildTimeMs: number
  testTimeMs: number
  qaTimeMs: number
  repairTimeMs: number
  deploymentTimeMs: number
  firstPassSuccess: boolean
  totalRepairs: number
  succeeded: boolean
}

// ── Metrics Collector ─────────────────────────────────────────────────────────

export class MetricsCollector {
  private runs: RunMetric[] = []

  recordRun(metric: RunMetric): void {
    this.runs.push(metric)
  }

  getRuns(): readonly RunMetric[] {
    return [...this.runs]
  }

  getSummary(): ExecutionMetricsSummary {
    if (this.runs.length === 0) {
      return {
        totalRuns: 0,
        averageVerticalCreationMs: 0,
        medianVerticalCreationMs: 0,
        successRate: 0,
        firstPassSuccessRate: 0,
        repairRate: 0,
        deploymentSuccessRate: 0,
        averageStageDurationMs: {},
        totalRepairAttempts: 0,
        averageRepairsPerRun: 0,
      }
    }

    const runs = this.runs
    const total = runs.length
    const succeeded = runs.filter((r) => r.succeeded)
    const firstPass = runs.filter((r) => r.firstPassSuccess)
    const withRepairs = runs.filter((r) => r.totalRepairs > 0)
    const deployed = runs.filter((r) =>
      r.stages.some((s) => s.stage === 'deployment' && s.succeeded),
    )

    // Average and median creation time (for successful runs)
    const successDurations = succeeded.map((r) => r.totalDurationMs).sort((a, b) => a - b)
    const avg = successDurations.length > 0
      ? successDurations.reduce((a, b) => a + b, 0) / successDurations.length
      : 0
    const mid = Math.floor(successDurations.length / 2)
    const median = successDurations.length > 0
      ? successDurations.length % 2 === 0
        ? (successDurations[mid - 1]! + successDurations[mid]!) / 2
        : successDurations[mid]!
      : 0

    // Average stage duration
    const stageDurations: Record<string, number[]> = {}
    for (const run of runs) {
      for (const stage of run.stages) {
        const key = String(stage.stage)
        if (!stageDurations[key]) stageDurations[key] = []
        stageDurations[key].push(stage.durationMs)
      }
    }
    const avgStageDurationMs: Record<string, number> = {}
    for (const [stage, durations] of Object.entries(stageDurations)) {
      avgStageDurationMs[stage] = durations.reduce((a, b) => a + b, 0) / durations.length
    }

    const totalRepairAttempts = runs.reduce((sum, r) => sum + r.totalRepairs, 0)

    return {
      totalRuns: total,
      averageVerticalCreationMs: Math.round(avg),
      medianVerticalCreationMs: Math.round(median),
      successRate: total > 0 ? succeeded.length / total : 0,
      firstPassSuccessRate: total > 0 ? firstPass.length / total : 0,
      repairRate: total > 0 ? withRepairs.length / total : 0,
      deploymentSuccessRate: total > 0 ? deployed.length / total : 0,
      averageStageDurationMs: avgStageDurationMs,
      totalRepairAttempts,
      averageRepairsPerRun: total > 0 ? totalRepairAttempts / total : 0,
    }
  }

  export(): string {
    return JSON.stringify({ runs: this.runs, summary: this.getSummary() }, null, 2)
  }
}

export interface ExecutionMetricsSummary {
  totalRuns: number
  averageVerticalCreationMs: number
  medianVerticalCreationMs: number
  successRate: number
  firstPassSuccessRate: number
  repairRate: number
  deploymentSuccessRate: number
  averageStageDurationMs: Record<string, number>
  totalRepairAttempts: number
  averageRepairsPerRun: number
}

// ── Stage Timer Helper ───────────────────────────────────────────────────────

export class StageTimer {
  private stage: GateName | string
  private start: number
  private repairAttempts = 0

  constructor(stage: GateName | string) {
    this.stage = stage
    this.start = Date.now()
  }

  recordRepair(): void {
    this.repairAttempts++
  }

  finish(succeeded: boolean): StageMetric {
    const durationMs = Date.now() - this.start
    return {
      stage: this.stage,
      durationMs,
      succeeded,
      repairAttempts: this.repairAttempts,
    }
  }
}
