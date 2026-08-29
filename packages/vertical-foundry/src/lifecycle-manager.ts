/**
 * Milestone 77: Vertical Lifecycle Management
 *
 * Manages the complete lifecycle of a vertical:
 * researching → building → previewing → registered → production → (disabled | retired)
 *
 * Tracks state transitions, enforces valid transitions only,
 * records lifecycle events for audit, and integrates with the
 * portfolio manager and deployment orchestrator.
 */

import type { VerticalStatus } from './portfolio-manager.js'

export type LifecycleEvent =
  | { type: 'created'; timestamp: string; verticalId: string }
  | { type: 'state_change'; timestamp: string; from: VerticalStatus; to: VerticalStatus; reason: string }
  | { type: 'gate_passed'; timestamp: string; gate: string; score: number }
  | { type: 'gate_failed'; timestamp: string; gate: string; reason: string }
  | { type: 'deployed'; timestamp: string; url: string; environment: 'preview' | 'production' }
  | { type: 'registered'; timestamp: string; registryId: string }
  | { type: 'disabled'; timestamp: string; reason: string }
  | { type: 'retired'; timestamp: string; reason: string }

export interface LifecycleHistory {
  verticalId: string
  events: LifecycleEvent[]
  currentState: VerticalStatus
  createdAt: string
  updatedAt: string
}

// Valid state transitions
const VALID_TRANSITIONS: Record<VerticalStatus, VerticalStatus[]> = {
  researching: ['building', 'rejected'],
  building: ['previewing', 'rejected'],
  previewing: ['registered', 'rejected', 'building'],
  registered: ['production', 'disabled', 'rejected'],
  production: ['disabled', 'production'],
  disabled: ['production', 'rejected'],
  rejected: [],
}

export class LifecycleManager {
  private histories = new Map<string, LifecycleHistory>()

  create(verticalId: string): LifecycleHistory {
    const now = new Date().toISOString()
    const history: LifecycleHistory = {
      verticalId,
      events: [{ type: 'created', timestamp: now, verticalId }],
      currentState: 'researching',
      createdAt: now,
      updatedAt: now,
    }
    this.histories.set(verticalId, history)
    return history
  }

  get(verticalId: string): LifecycleHistory | undefined {
    return this.histories.get(verticalId)
  }

  canTransition(from: VerticalStatus, to: VerticalStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false
  }

  transition(
    verticalId: string,
    to: VerticalStatus,
    reason: string,
  ): LifecycleHistory {
    const history = this.histories.get(verticalId)
    if (!history) throw new Error(`No lifecycle found for ${verticalId}`)

    if (!this.canTransition(history.currentState, to)) {
      throw new Error(
        `Invalid transition: ${history.currentState} → ${to}. Valid targets: ${VALID_TRANSITIONS[history.currentState]?.join(', ')}`,
      )
    }

    const now = new Date().toISOString()
    const event: LifecycleEvent = {
      type: 'state_change',
      timestamp: now,
      from: history.currentState,
      to,
      reason,
    }

    history.events.push(event)
    history.currentState = to
    history.updatedAt = now
    return history
  }

  recordGate(
    verticalId: string,
    gate: string,
    passed: boolean,
    detail: { score?: number; reason?: string },
  ): LifecycleHistory {
    const history = this.histories.get(verticalId)
    if (!history) throw new Error(`No lifecycle found for ${verticalId}`)

    const now = new Date().toISOString()
    history.events.push(
      passed
        ? { type: 'gate_passed', timestamp: now, gate, score: detail.score ?? 100 }
        : { type: 'gate_failed', timestamp: now, gate, reason: detail.reason ?? 'Unknown failure' },
    )
    history.updatedAt = now
    return history
  }

  recordDeployment(
    verticalId: string,
    url: string,
    environment: 'preview' | 'production',
  ): LifecycleHistory {
    const history = this.histories.get(verticalId)
    if (!history) throw new Error(`No lifecycle found for ${verticalId}`)

    history.events.push({ type: 'deployed', timestamp: new Date().toISOString(), url, environment })
    history.updatedAt = new Date().toISOString()
    return history
  }

  recordRegistration(verticalId: string, registryId: string): LifecycleHistory {
    const history = this.histories.get(verticalId)
    if (!history) throw new Error(`No lifecycle found for ${verticalId}`)

    history.events.push({ type: 'registered', timestamp: new Date().toISOString(), registryId })
    history.updatedAt = new Date().toISOString()
    return history
  }

  disable(verticalId: string, reason: string): LifecycleHistory {
    return this.transition(verticalId, 'disabled', reason)
  }

  retire(verticalId: string, reason: string): LifecycleHistory {
    const history = this.histories.get(verticalId)
    if (!history) throw new Error(`No lifecycle found for ${verticalId}`)

    history.events.push({ type: 'retired', timestamp: new Date().toISOString(), reason })
    history.updatedAt = new Date().toISOString()
    return history
  }

  /**
   * Simulates the full happy-path lifecycle for a vertical.
   */
  async runHappyPath(
    verticalId: string,
    opts: { previewUrl: string; productionUrl: string; registryId: string },
  ): Promise<LifecycleHistory> {
    this.create(verticalId)

    this.recordGate(verticalId, 'research', true, { score: 90 })
    this.transition(verticalId, 'building', 'Research complete, moving to build')

    this.recordGate(verticalId, 'build', true, { score: 95 })
    this.transition(verticalId, 'previewing', 'Build complete, deploying preview')

    this.recordDeployment(verticalId, opts.previewUrl, 'preview')
    this.recordGate(verticalId, 'qa', true, { score: 88 })
    this.transition(verticalId, 'registered', 'Preview verified, registering')

    this.recordRegistration(verticalId, opts.registryId)
    this.transition(verticalId, 'production', 'Registered and approved for production')

    this.recordDeployment(verticalId, opts.productionUrl, 'production')

    return this.get(verticalId)!
  }

  getAll(): LifecycleHistory[] {
    return Array.from(this.histories.values())
  }

  getEventCount(verticalId: string): number {
    return this.histories.get(verticalId)?.events.length ?? 0
  }
}
