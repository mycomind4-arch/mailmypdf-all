/**
 * Pipeline Audit Trail — records every gate decision, provider call,
 * and artifact for compliance and post-hoc analysis.
 *
 * The audit trail is append-only: records are never modified or deleted.
 * This provides a tamper-evident record of what happened during each
 * pipeline run, which gates passed/failed, and what evidence was collected.
 */

import type { GateName } from './vertical-manifest.js'

export type AuditEventType =
  | 'gate_started'
  | 'gate_passed'
  | 'gate_failed'
  | 'gate_skipped'
  | 'provider_called'
  | 'provider_error'
  | 'artifact_created'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  | 'pipeline_started'
  | 'pipeline_completed'
  | 'pipeline_failed'

export interface AuditRecord {
  id: string
  runId: string
  timestamp: string
  eventType: AuditEventType
  gate?: GateName
  provider?: string
  action?: string
  input?: unknown
  output?: unknown
  error?: string
  durationMs?: number
  metadata?: Record<string, unknown>
}

export class PipelineAuditTrail {
  private records: AuditRecord[] = []
  private runId: string
  private counter = 0

  constructor(runId: string) {
    this.runId = runId
  }

  private nextId(): string {
    this.counter++
    return `${this.runId}-${this.counter.toString().padStart(4, '0')}`
  }

  record(event: Omit<AuditRecord, 'id' | 'runId' | 'timestamp'>): AuditRecord {
    const entry: AuditRecord = {
      ...event,
      id: this.nextId(),
      runId: this.runId,
      timestamp: new Date().toISOString(),
    }
    this.records.push(entry)
    return entry
  }

  recordGateStart(gate: GateName): AuditRecord {
    return this.record({ eventType: 'gate_started', gate })
  }

  recordGatePass(gate: GateName, durationMs: number, evidence?: string): AuditRecord {
    const meta = evidence ? { evidence } : undefined
    return this.record({ eventType: 'gate_passed', gate, durationMs, ...(meta ? { metadata: meta } : {}) })
  }

  recordGateFail(gate: GateName, error: string, durationMs: number): AuditRecord {
    return this.record({ eventType: 'gate_failed', gate, error, durationMs })
  }

  recordProviderCall(provider: string, action: string, durationMs: number, input?: unknown, output?: unknown): AuditRecord {
    const partial: Omit<AuditRecord, 'id' | 'runId' | 'timestamp'> = { eventType: 'provider_called', provider, action, durationMs }
    if (input !== undefined) partial.input = input
    if (output !== undefined) partial.output = output
    return this.record(partial)
  }

  recordProviderError(provider: string, action: string, error: string, durationMs: number): AuditRecord {
    return this.record({ eventType: 'provider_error', provider, action, error, durationMs })
  }

  recordArtifact(name: string, url?: string): AuditRecord {
    const meta = url ? { url } : undefined
    return this.record({ eventType: 'artifact_created', action: name, ...(meta ? { metadata: meta } : {}) })
  }

  recordPipelineStart(verticalId: string, verticalName: string): AuditRecord {
    return this.record({ eventType: 'pipeline_started', action: verticalId, metadata: { verticalName } })
  }

  recordPipelineCompleted(allGatesPassed: boolean): AuditRecord {
    return this.record({ eventType: allGatesPassed ? 'pipeline_completed' : 'pipeline_failed', metadata: { allGatesPassed } })
  }

  getAll(): readonly AuditRecord[] {
    return [...this.records]
  }

  getByGate(gate: GateName): AuditRecord[] {
    return this.records.filter((r) => r.gate === gate)
  }

  getByProvider(provider: string): AuditRecord[] {
    return this.records.filter((r) => r.provider === provider)
  }

  getByType(eventType: AuditEventType): AuditRecord[] {
    return this.records.filter((r) => r.eventType === eventType)
  }

  getSummary(): {
    total: number
    gatesPassed: number
    gatesFailed: number
    providerCalls: number
    providerErrors: number
    artifactsCreated: number
    pipelineStatus: 'running' | 'completed' | 'failed' | 'unknown'
  } {
    return {
      total: this.records.length,
      gatesPassed: this.records.filter((r) => r.eventType === 'gate_passed').length,
      gatesFailed: this.records.filter((r) => r.eventType === 'gate_failed').length,
      providerCalls: this.records.filter((r) => r.eventType === 'provider_called').length,
      providerErrors: this.records.filter((r) => r.eventType === 'provider_error').length,
      artifactsCreated: this.records.filter((r) => r.eventType === 'artifact_created').length,
      pipelineStatus:
        this.records.some((r) => r.eventType === 'pipeline_completed') ? 'completed'
        : this.records.some((r) => r.eventType === 'pipeline_failed') ? 'failed'
        : this.records.some((r) => r.eventType === 'pipeline_started') ? 'running'
        : 'unknown',
    }
  }

  export(): string {
    return JSON.stringify(this.records, null, 2)
  }
}
