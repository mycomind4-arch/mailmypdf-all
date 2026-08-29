/**
 * Milestone 80: Production Scheduler — Tests
 *
 * Tests: normal scheduling, capacity exhaustion, budget exhaustion,
 * duplicate prevention, blocked candidate, approval requirement,
 * independent candidate execution, protected repository rejection.
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { ProductionScheduler, DEFAULT_SCHEDULER_CONFIG, type SchedulerConfig } from './production-scheduler.js'
import { LifecycleManager } from './lifecycle-manager.js'
import type { VerticalCandidate } from './foundry-contract.js'

function makeCandidate(id: string, score: number = 80): VerticalCandidate {
  return {
    id,
    name: id.replace(/-/g, ' '),
    description: `Test vertical ${id}`,
    findings: [],
    score: {
      demand: 80, competition: 70, differentiation: 75, reuse: 80,
      feasibility: 90, risk: 85,
      overall: score,
    },
  }
}

const baseConfig: SchedulerConfig = {
  ...DEFAULT_SCHEDULER_CONFIG,
  maxConcurrentBuilds: 2,
  maxLaunchesPerDay: 3,
  budgetLimitUsd: 10.00,
  minQualityScore: 60,
}

test('M80: normal scheduling succeeds for qualified candidate', () => {
  const lifecycle = new LifecycleManager()
  const scheduler = new ProductionScheduler(baseConfig, lifecycle)
  const candidate = makeCandidate('invoice-mailer', 85)
  const decision = scheduler.evaluate(candidate, 1.50, 'mycomind4-arch/foundry-invoice-mailer', 'invoice-mailer.mailmypdf.com')

  assert.ok(decision.approved, `Expected approval, got: ${decision.reason}`)
  assert.equal(decision.checks.length, 11)
  for (const check of decision.checks) {
    assert.ok(check.passed, `Check ${check.name} should pass: ${check.detail}`)
  }
})

test('M80: scheduling updates state when scheduled', () => {
  const lifecycle = new LifecycleManager()
  const scheduler = new ProductionScheduler(baseConfig, lifecycle)
  const candidate = makeCandidate('test-v1')
  const decision = scheduler.evaluate(candidate, 1.00, 'mycomind4-arch/foundry-test-v1', 'test-v1.mailmypdf.com')

  assert.ok(decision.approved)
  scheduler.schedule(decision, 'mycomind4-arch/foundry-test-v1', 'test-v1.mailmypdf.com', 1.00)

  const state = scheduler.getState()
  assert.equal(state.activeBuilds, 1)
  assert.equal(state.launchedToday, 1)
  assert.equal(state.spentTodayUsd, 1.00)
  assert.ok(state.usedDomains.includes('test-v1.mailmypdf.com'))
  assert.ok(state.usedRepositories.includes('mycomind4-arch/foundry-test-v1'))
})

test('M80: capacity exhaustion blocks new builds', () => {
  const lifecycle = new LifecycleManager()
  const scheduler = new ProductionScheduler(baseConfig, lifecycle)

  // Schedule 2 (max concurrent)
  for (let i = 0; i < 2; i++) {
    const d = scheduler.evaluate(makeCandidate(`v-${i}`), 1.00, `mycomind4-arch/foundry-v-${i}`, `v-${i}.mailmypdf.com`)
    assert.ok(d.approved)
    scheduler.schedule(d, `mycomind4-arch/foundry-v-${i}`, `v-${i}.mailmypdf.com`, 1.00)
  }

  // 3rd should fail on concurrency
  const d3 = scheduler.evaluate(makeCandidate('v-3'), 1.00, 'mycomind4-arch/foundry-v-3', 'v-3.mailmypdf.com')
  assert.ok(!d3.approved)
  assert.ok(d3.checks.some(c => c.name === 'concurrent_builds' && !c.passed))
})

test('M80: completing a build frees a slot', () => {
  const lifecycle = new LifecycleManager()
  const scheduler = new ProductionScheduler(baseConfig, lifecycle)

  for (let i = 0; i < 2; i++) {
    const d = scheduler.evaluate(makeCandidate(`v-${i}`), 1.00, `mycomind4-arch/foundry-v-${i}`, `v-${i}.mailmypdf.com`)
    scheduler.schedule(d, `mycomind4-arch/foundry-v-${i}`, `v-${i}.mailmypdf.com`, 1.00)
  }

  scheduler.completeBuild()
  assert.equal(scheduler.getState().activeBuilds, 1)

  // Now we can schedule another
  const d3 = scheduler.evaluate(makeCandidate('v-3'), 1.00, 'mycomind4-arch/foundry-v-3', 'v-3.mailmypdf.com')
  assert.ok(d3.approved, `Expected approval after completion, got: ${d3.reason}`)
})

test('M80: budget exhaustion blocks new builds', () => {
  const lifecycle = new LifecycleManager()
  const scheduler = new ProductionScheduler({ ...baseConfig, maxConcurrentBuilds: 5, maxLaunchesPerDay: 10, budgetLimitUsd: 3.00 }, lifecycle)

  // Schedule enough to exhaust budget
  for (let i = 0; i < 3; i++) {
    const d = scheduler.evaluate(makeCandidate(`v-${i}`), 1.00, `mycomind4-arch/foundry-v-${i}`, `v-${i}.mailmypdf.com`)
    if (d.approved) scheduler.schedule(d, `mycomind4-arch/foundry-v-${i}`, `v-${i}.mailmypdf.com`, 1.00)
  }

  // 4th should fail on budget
  const d4 = scheduler.evaluate(makeCandidate('v-4'), 1.00, 'mycomind4-arch/foundry-v-4', 'v-4.mailmypdf.com')
  assert.ok(!d4.approved)
  assert.ok(d4.checks.some(c => c.name === 'budget_limit' && !c.passed))
})

test('M80: duplicate domain is rejected', () => {
  const lifecycle = new LifecycleManager()
  const scheduler = new ProductionScheduler(baseConfig, lifecycle)

  const d1 = scheduler.evaluate(makeCandidate('v-1'), 1.00, 'mycomind4-arch/foundry-v-1', 'dup.mailmypdf.com')
  assert.ok(d1.approved)
  scheduler.schedule(d1, 'mycomind4-arch/foundry-v-1', 'dup.mailmypdf.com', 1.00)

  const d2 = scheduler.evaluate(makeCandidate('v-2'), 1.00, 'mycomind4-arch/foundry-v-2', 'dup.mailmypdf.com')
  assert.ok(!d2.approved)
  assert.ok(d2.checks.some(c => c.name === 'domain_unique' && !c.passed))
})

test('M80: duplicate repository is rejected', () => {
  const lifecycle = new LifecycleManager()
  const scheduler = new ProductionScheduler(baseConfig, lifecycle)

  const d1 = scheduler.evaluate(makeCandidate('v-1'), 1.00, 'mycomind4-arch/foundry-dup-repo', 'v-1.mailmypdf.com')
  assert.ok(d1.approved)
  scheduler.schedule(d1, 'mycomind4-arch/foundry-dup-repo', 'v-1.mailmypdf.com', 1.00)

  const d2 = scheduler.evaluate(makeCandidate('v-2'), 1.00, 'mycomind4-arch/foundry-dup-repo', 'v-2.mailmypdf.com')
  assert.ok(!d2.approved)
  assert.ok(d2.checks.some(c => c.name === 'repository_unique' && !c.passed))
})

test('M80: protected repository is rejected', () => {
  const lifecycle = new LifecycleManager()
  const scheduler = new ProductionScheduler(baseConfig, lifecycle)

  const d = scheduler.evaluate(makeCandidate('v-1'), 1.00, 'mycomind4-arch/mailmypdf', 'v-1.mailmypdf.com')
  assert.ok(!d.approved)
  assert.ok(d.checks.some(c => c.name === 'protected_repository' && !c.passed))
  assert.ok(d.checks.some(c => c.name === 'repository_pattern' && !c.passed))
})

test('M80: rejected lifecycle state blocks scheduling', () => {
  const lifecycle = new LifecycleManager()
  lifecycle.create('rejected-v')
  lifecycle.transition('rejected-v', 'building', 'test')
  lifecycle.transition('rejected-v', 'previewing', 'test')
  lifecycle.transition('rejected-v', 'rejected', 'Quality failure')

  const scheduler = new ProductionScheduler(baseConfig, lifecycle)
  const d = scheduler.evaluate(makeCandidate('rejected-v'), 1.00, 'mycomind4-arch/foundry-rejected', 'rejected.mailmypdf.com')
  assert.ok(!d.approved)
  assert.ok(d.checks.some(c => c.name === 'lifecycle_state' && !c.passed))
})

test('M80: low-quality candidate is rejected', () => {
  const lifecycle = new LifecycleManager()
  const scheduler = new ProductionScheduler(baseConfig, lifecycle)
  const candidate = makeCandidate('low-quality', 45)
  const d = scheduler.evaluate(candidate, 1.00, 'mycomind4-arch/foundry-low', 'low.mailmypdf.com')
  assert.ok(!d.approved)
  assert.ok(d.checks.some(c => c.name === 'quality_threshold' && !c.passed))
})

test('M80: low-score candidate fails approval eligibility', () => {
  const lifecycle = new LifecycleManager()
  const scheduler = new ProductionScheduler(baseConfig, lifecycle)
  const candidate = makeCandidate('borderline', 65) // Above minQuality but below approval threshold
  const d = scheduler.evaluate(candidate, 1.00, 'mycomind4-arch/foundry-borderline', 'borderline.mailmypdf.com')
  assert.ok(!d.approved)
  assert.ok(d.checks.some(c => c.name === 'approval_eligible' && !c.passed))
})

test('M80: independent candidates execute without interference', () => {
  const lifecycle = new LifecycleManager()
  const scheduler = new ProductionScheduler(baseConfig, lifecycle)

  // Schedule two independent candidates
  const d1 = scheduler.evaluate(makeCandidate('a'), 1.00, 'mycomind4-arch/foundry-a', 'a.mailmypdf.com')
  const d2 = scheduler.evaluate(makeCandidate('b'), 1.00, 'mycomind4-arch/foundry-b', 'b.mailmypdf.com')

  assert.ok(d1.approved)
  assert.ok(d2.approved)

  scheduler.schedule(d1, 'mycomind4-arch/foundry-a', 'a.mailmypdf.com', 1.00)
  scheduler.schedule(d2, 'mycomind4-arch/foundry-b', 'b.mailmypdf.com', 1.00)

  // Complete one
  scheduler.completeBuild()

  // The other's state should be unaffected
  assert.equal(scheduler.getState().launchedToday, 2) // both counted
  assert.equal(scheduler.getState().activeBuilds, 1)  // one completed
})

test('M80: all scheduling decisions are auditable', () => {
  const lifecycle = new LifecycleManager()
  const scheduler = new ProductionScheduler(baseConfig, lifecycle)

  scheduler.evaluate(makeCandidate('a'), 1.00, 'mycomind4-arch/foundry-a', 'a.mailmypdf.com')
  scheduler.evaluate(makeCandidate('b', 50), 1.00, 'mycomind4-arch/foundry-b', 'b.mailmypdf.com')

  const decisions = scheduler.getDecisions()
  assert.equal(decisions.length, 2)
  assert.ok(decisions[0]!.timestamp)
  assert.ok(decisions[1]!.timestamp)
  assert.ok(decisions[0]!.checks.length === 11)
})

test('M80: repository pattern matching works', () => {
  const lifecycle = new LifecycleManager()
  const scheduler = new ProductionScheduler(baseConfig, lifecycle)

  // Matches pattern
  const d1 = scheduler.evaluate(makeCandidate('v1'), 1.00, 'mycomind4-arch/foundry-v1', 'v1.mailmypdf.com')
  assert.ok(d1.approved, `Pattern match failed: ${d1.reason}`)

  // Doesn't match pattern
  const d2 = scheduler.evaluate(makeCandidate('v2'), 1.00, 'some-other-org/v2', 'v2.mailmypdf.com')
  assert.ok(!d2.approved)
  assert.ok(d2.checks.some(c => c.name === 'repository_pattern' && !c.passed))
})

test('M80: config values are explicit, not invented', () => {
  const config = DEFAULT_SCHEDULER_CONFIG
  assert.ok(config.maxConcurrentBuilds > 0)
  assert.ok(config.maxLaunchesPerDay > 0)
  assert.ok(config.providerCapacity > 0)
  assert.ok(config.budgetLimitUsd > 0)
  assert.ok(config.minQualityScore > 0)
  assert.ok(config.protectedRepositories.includes('mycomind4-arch/mailmypdf'))
  assert.ok(config.allowedRepositoryPattern.includes('foundry-'))
})
