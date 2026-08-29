/**
 * Real Cost Accounting — tracks actual costs throughout a Foundry run.
 *
 * Costs are tracked by stage and by vertical. If a provider does not
 * expose actual cost, it is marked UNKNOWN rather than pretending it
 * is zero.
 */

import type { GateName } from './vertical-manifest.js'

// ── Cost Types ───────────────────────────────────────────────────────────────

export type CostSource =
  | 'model'
  | 'repository'
  | 'deployment'
  | 'registry'
  | 'repair'
  | 'retry'
  | 'other'

export type CostCertainty = 'known' | 'unknown'

export interface CostEntry {
  source: CostSource
  stage: GateName | string
  amount: number | null  // null = unknown
  currency: string
  certainty: CostCertainty
  description: string
  recordedAt: string
}

export interface VerticalCostReport {
  verticalId: string
  runId: string
  entries: CostEntry[]
  totalKnown: number
  totalUnknown: boolean
  costByStage: Record<string, { known: number; hasUnknown: boolean }>
  costBySource: Record<string, { known: number; hasUnknown: boolean }>
}

// ── Cost Tracker ─────────────────────────────────────────────────────────────

export class CostTracker {
  private entries: CostEntry[] = []
  private verticalId: string
  private runId: string

  constructor(verticalId: string, runId: string) {
    this.verticalId = verticalId
    this.runId = runId
  }

  recordModelCost(
    stage: GateName | string,
    usage: { costUsd?: number; inputTokens: number; outputTokens: number },
    model: string,
  ): void {
    const entry: CostEntry = {
      source: 'model',
      stage,
      amount: usage.costUsd ?? null,
      currency: 'USD',
      certainty: usage.costUsd !== undefined ? 'known' : 'unknown',
      description: `${model}: ${usage.inputTokens} in / ${usage.outputTokens} out tokens`,
      recordedAt: new Date().toISOString(),
    }
    this.entries.push(entry)
  }

  recordDeploymentCost(
    stage: GateName | string,
    cost: { amount?: number; description: string },
  ): void {
    this.entries.push({
      source: 'deployment',
      stage,
      amount: cost.amount ?? null,
      currency: 'USD',
      certainty: cost.amount !== undefined ? 'known' : 'unknown',
      description: cost.description,
      recordedAt: new Date().toISOString(),
    })
  }

  recordRetryCost(stage: GateName | string, attemptNumber: number): void {
    // Retries add model/compute cost but we may not know exact amount
    this.entries.push({
      source: 'retry',
      stage,
      amount: null,
      currency: 'USD',
      certainty: 'unknown',
      description: `Retry attempt ${attemptNumber}`,
      recordedAt: new Date().toISOString(),
    })
  }

  recordRepairCost(stage: GateName | string, description: string): void {
    this.entries.push({
      source: 'repair',
      stage,
      amount: null,
      currency: 'USD',
      certainty: 'unknown',
      description,
      recordedAt: new Date().toISOString(),
    })
  }

  recordGenericCost(
    source: CostSource,
    stage: GateName | string,
    amount: number | null,
    description: string,
  ): void {
    this.entries.push({
      source,
      stage,
      amount,
      currency: 'USD',
      certainty: amount !== null ? 'known' : 'unknown',
      description,
      recordedAt: new Date().toISOString(),
    })
  }

  getReport(): VerticalCostReport {
    const costByStage: Record<string, { known: number; hasUnknown: boolean }> = {}
    const costBySource: Record<string, { known: number; hasUnknown: boolean }> = {}
    let totalKnown = 0
    let totalUnknown = false

    for (const entry of this.entries) {
      const stageKey = String(entry.stage)
      if (!costByStage[stageKey]) costByStage[stageKey] = { known: 0, hasUnknown: false }
      if (!costBySource[entry.source]) costBySource[entry.source] = { known: 0, hasUnknown: false }

      if (entry.amount !== null) {
        costByStage[stageKey]!.known += entry.amount
        costBySource[entry.source]!.known += entry.amount
        totalKnown += entry.amount
      } else {
        costByStage[stageKey]!.hasUnknown = true
        costBySource[entry.source]!.hasUnknown = true
        totalUnknown = true
      }
    }

    return {
      verticalId: this.verticalId,
      runId: this.runId,
      entries: [...this.entries],
      totalKnown,
      totalUnknown,
      costByStage,
      costBySource,
    }
  }

  export(): string {
    return JSON.stringify(this.getReport(), null, 2)
  }
}
