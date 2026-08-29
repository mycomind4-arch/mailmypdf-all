/**
 * Milestone 80: Production Scheduler
 *
 * Schedules approved opportunities for production builds, respecting:
 * - Maximum concurrent builds
 * - Maximum launches/day
 * - Provider capacity
 * - Budget limits
 * - Domain uniqueness
 * - Repository uniqueness
 * - Quality thresholds
 * - Approval requirements
 * - Protected repository boundaries
 * - Existing lifecycle state
 *
 * All scheduling decisions are auditable.
 */

import type { VerticalCandidate } from './foundry-contract.js'
import type { VerticalStatus } from './portfolio-manager.js'
import type { LifecycleManager } from './lifecycle-manager.js'

export interface SchedulerConfig {
  maxConcurrentBuilds: number
  maxLaunchesPerDay: number
  providerCapacity: number           // max simultaneous provider operations
  budgetLimitUsd: number
  minQualityScore: number
  requireApproval: boolean
  protectedRepositories: string[]
  allowedRepositoryPattern: string   // e.g. 'mycomind4-arch/foundry-*'
}

export interface SchedulerState {
  activeBuilds: number
  launchedToday: number
  spentTodayUsd: number
  usedDomains: string[]
  usedRepositories: string[]
  lastResetDate: string
}

export interface ScheduleDecision {
  candidate: VerticalCandidate
  approved: boolean
  reason: string
  checks: ScheduleCheck[]
  timestamp: string
}

export interface ScheduleCheck {
  name: string
  passed: boolean
  detail: string
}

export class ProductionScheduler {
  private config: SchedulerConfig
  private state: SchedulerState
  private lifecycle: LifecycleManager
  private decisions: ScheduleDecision[] = []

  constructor(config: SchedulerConfig, lifecycle: LifecycleManager, state?: Partial<SchedulerState>) {
    this.config = config
    this.lifecycle = lifecycle
    this.state = {
      activeBuilds: state?.activeBuilds ?? 0,
      launchedToday: state?.launchedToday ?? 0,
      spentTodayUsd: state?.spentTodayUsd ?? 0,
      usedDomains: state?.usedDomains ?? [],
      usedRepositories: state?.usedRepositories ?? [],
      lastResetDate: state?.lastResetDate ?? new Date().toISOString().split('T')[0]!,
    }
  }

  /**
   * Evaluates whether a candidate can be scheduled.
   * Returns a decision with all check results.
   */
  evaluate(candidate: VerticalCandidate, estimatedCostUsd: number, repository: string, domain: string): ScheduleDecision {
    const checks: ScheduleCheck[] = []
    const now = new Date().toISOString()

    // Reset daily counters if new day
    this.maybeResetDaily()

    // Check 1: Quality threshold
    const qualityPass = candidate.score.overall >= this.config.minQualityScore
    checks.push({
      name: 'quality_threshold',
      passed: qualityPass,
      detail: `Score ${candidate.score.overall} vs minimum ${this.config.minQualityScore}`,
    })

    // Check 2: Concurrency
    const concurrencyPass = this.state.activeBuilds < this.config.maxConcurrentBuilds
    checks.push({
      name: 'concurrent_builds',
      passed: concurrencyPass,
      detail: `${this.state.activeBuilds} active vs max ${this.config.maxConcurrentBuilds}`,
    })

    // Check 3: Daily launch limit
    const launchPass = this.state.launchedToday < this.config.maxLaunchesPerDay
    checks.push({
      name: 'daily_launch_limit',
      passed: launchPass,
      detail: `${this.state.launchedToday} launched today vs max ${this.config.maxLaunchesPerDay}`,
    })

    // Check 4: Provider capacity
    const capacityPass = this.state.activeBuilds < this.config.providerCapacity
    checks.push({
      name: 'provider_capacity',
      passed: capacityPass,
      detail: `${this.state.activeBuilds} active vs capacity ${this.config.providerCapacity}`,
    })

    // Check 5: Budget
    const budgetPass = this.state.spentTodayUsd + estimatedCostUsd <= this.config.budgetLimitUsd
    checks.push({
      name: 'budget_limit',
      passed: budgetPass,
      detail: `$${(this.state.spentTodayUsd + estimatedCostUsd).toFixed(2)} would exceed $${this.config.budgetLimitUsd}`,
    })

    // Check 6: Domain uniqueness
    const domainPass = !this.state.usedDomains.includes(domain)
    checks.push({
      name: 'domain_unique',
      passed: domainPass,
      detail: domainPass ? 'Domain not in use' : `Domain ${domain} already in use`,
    })

    // Check 7: Repository uniqueness
    const repoPass = !this.state.usedRepositories.includes(repository)
    checks.push({
      name: 'repository_unique',
      passed: repoPass,
      detail: repoPass ? 'Repository not in use' : `Repository ${repository} already in use`,
    })

    // Check 8: Protected repository
    const protectedPass = !this.config.protectedRepositories.includes(repository)
    checks.push({
      name: 'protected_repository',
      passed: protectedPass,
      detail: protectedPass ? 'Not a protected repository' : `Repository ${repository} is protected`,
    })

    // Check 9: Repository pattern
    const patternPass = this.matchesPattern(repository, this.config.allowedRepositoryPattern)
    checks.push({
      name: 'repository_pattern',
      passed: patternPass,
      detail: patternPass ? `Matches ${this.config.allowedRepositoryPattern}` : `Does not match ${this.config.allowedRepositoryPattern}`,
    })

    // Check 10: Lifecycle state (must be in researching or building)
    const lifecycleHistory = this.lifecycle.get(candidate.id)
    let lifecyclePass = true
    let lifecycleDetail = 'No lifecycle entry — new vertical'
    if (lifecycleHistory) {
      const blockedStates: VerticalStatus[] = ['rejected', 'disabled']
      lifecyclePass = !blockedStates.includes(lifecycleHistory.currentState)
      lifecycleDetail = lifecyclePass
        ? `Lifecycle state: ${lifecycleHistory.currentState}`
        : `Lifecycle state ${lifecycleHistory.currentState} is blocked`
    }
    checks.push({ name: 'lifecycle_state', passed: lifecyclePass, detail: lifecycleDetail })

    // Check 11: Approval (if required)
    let approvalPass = true
    let approvalDetail = 'Approval not required'
    if (this.config.requireApproval) {
      // Approval is checked at gate time, not scheduling time
      // But we verify the candidate has a high enough score to be approval-worthy
      approvalPass = candidate.score.overall >= 75
      approvalDetail = approvalPass
        ? 'Score sufficient for approval consideration'
        : 'Score too low for approval consideration'
    }
    checks.push({ name: 'approval_eligible', passed: approvalPass, detail: approvalDetail })

    const allPassed = checks.every(c => c.passed)
    const failedChecks = checks.filter(c => !c.passed)

    const decision: ScheduleDecision = {
      candidate,
      approved: allPassed,
      reason: allPassed
        ? 'All scheduling checks passed'
        : `Failed: ${failedChecks.map(c => c.name).join(', ')}`,
      checks,
      timestamp: now,
    }

    this.decisions.push(decision)
    return decision
  }

  /**
   * Schedules an approved candidate — updates internal state.
   */
  schedule(decision: ScheduleDecision, repository: string, domain: string, costUsd: number): void {
    if (!decision.approved) throw new Error(`Cannot schedule rejected candidate: ${decision.reason}`)

    this.state.activeBuilds++
    this.state.launchedToday++
    this.state.spentTodayUsd += costUsd
    this.state.usedDomains.push(domain)
    this.state.usedRepositories.push(repository)
  }

  /**
   * Marks a build as complete, freeing a concurrency slot.
   */
  completeBuild(): void {
    if (this.state.activeBuilds > 0) this.state.activeBuilds--
  }

  /**
   * Returns all scheduling decisions for audit.
   */
  getDecisions(): ScheduleDecision[] {
    return [...this.decisions]
  }

  getState(): SchedulerState {
    return { ...this.state }
  }

  private maybeResetDaily(): void {
    const today = new Date().toISOString().split('T')[0]!
    if (this.state.lastResetDate !== today) {
      this.state.launchedToday = 0
      this.state.spentTodayUsd = 0
      this.state.lastResetDate = today
    }
  }

  private matchesPattern(repo: string, pattern: string): boolean {
    // Simple glob: 'mycomind4-arch/foundry-*' matches 'mycomind4-arch/foundry-verticals'
    const regex = pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
    return new RegExp(`^${regex}$`).test(repo)
  }
}

/**
 * Default scheduler config — all values explicit, no hidden capacity assumptions.
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  maxConcurrentBuilds: 3,
  maxLaunchesPerDay: 5,
  providerCapacity: 3,
  budgetLimitUsd: 50.00,
  minQualityScore: 60,
  requireApproval: true,
  protectedRepositories: ['mycomind4-arch/mailmypdf'],
  allowedRepositoryPattern: 'mycomind4-arch/foundry-*',
}
