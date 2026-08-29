/**
 * Production Deployment Approval Gate — the explicit release gate between
 * preview and production.
 *
 * A vertical MUST NOT go directly from preview to production.
 * Approval must be:
 *   - explicit (no auto-approval)
 *   - scoped to the vertical and release
 *   - optionally expiring
 *   - auditable
 *
 * Production authorization fails closed: no approval record = no deployment.
 */

import type { VerticalManifest } from './vertical-manifest.js'

// ── Approval Record ──────────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired'

export interface ProductionApprovalRecord {
  id: string
  verticalId: string
  runId: string
  previewUrl: string
  status: ApprovalStatus
  approvedBy: string
  reason: string
  createdAt: string
  decidedAt?: string
  expiresAt?: string
  scope: {
    repository: string
    branch: string
    previewUrl: string
  }
}

// ── Approval Manager ─────────────────────────────────────────────────────────

export class ProductionApprovalGate {
  private records = new Map<string, ProductionApprovalRecord>()
  private counter = 0

  requestApproval(input: {
    verticalId: string
    runId: string
    previewUrl: string
    repository: string
    branch: string
    reason: string
    expiresInMs?: number
  }): ProductionApprovalRecord {
    const id = `approval-${++this.counter}`
    const now = new Date().toISOString()
    const record: ProductionApprovalRecord = {
      id,
      verticalId: input.verticalId,
      runId: input.runId,
      previewUrl: input.previewUrl,
      status: 'pending',
      approvedBy: '',
      reason: input.reason,
      createdAt: now,
      scope: {
        repository: input.repository,
        branch: input.branch,
        previewUrl: input.previewUrl,
      },
    }
    if (input.expiresInMs) {
      record.expiresAt = new Date(Date.now() + input.expiresInMs).toISOString()
    }
    this.records.set(id, record)
    return record
  }

  grantApproval(approvalId: string, approvedBy: string): ProductionApprovalRecord {
    const record = this.records.get(approvalId)
    if (!record) throw new Error(`Approval ${approvalId} not found`)
    if (record.status !== 'pending') throw new Error(`Approval ${approvalId} is already ${record.status}`)
    if (this.isExpired(record)) {
      record.status = 'expired'
      throw new Error(`Approval ${approvalId} has expired`)
    }
    record.status = 'approved'
    record.approvedBy = approvedBy
    record.decidedAt = new Date().toISOString()
    return record
  }

  denyApproval(approvalId: string, deniedBy: string, reason: string): ProductionApprovalRecord {
    const record = this.records.get(approvalId)
    if (!record) throw new Error(`Approval ${approvalId} not found`)
    if (record.status !== 'pending') throw new Error(`Approval ${approvalId} is already ${record.status}`)
    record.status = 'denied'
    record.approvedBy = deniedBy
    record.reason = reason
    record.decidedAt = new Date().toISOString()
    return record
  }

  isApproved(verticalId: string): boolean {
    const records = [...this.records.values()].filter((r) => r.verticalId === verticalId)
    return records.some((r) => r.status === 'approved' && !this.isExpired(r))
  }

  getApproval(verticalId: string): ProductionApprovalRecord | undefined {
    const records = [...this.records.values()]
      .filter((r) => r.verticalId === verticalId)
      .sort((a, b) => (b.decidedAt ?? b.createdAt).localeCompare(a.decidedAt ?? a.createdAt))
    return records[0]
  }

  /**
   * Check if production deployment is authorized.
   * FAILS CLOSED: returns false if no valid approval exists.
   */
  canDeployToProduction(manifest: VerticalManifest): { authorized: boolean; reason: string } {
    const approval = this.getApproval(manifest.id)
    if (!approval) {
      return { authorized: false, reason: 'No approval record exists for this vertical' }
    }
    if (approval.status !== 'approved') {
      return { authorized: false, reason: `Approval status is ${approval.status}` }
    }
    if (this.isExpired(approval)) {
      return { authorized: false, reason: 'Approval has expired' }
    }
    // Verify scope matches
    if (approval.scope.repository !== manifest.repository) {
      return { authorized: false, reason: 'Approval scope does not match repository' }
    }
    if (approval.scope.branch !== manifest.branch) {
      return { authorized: false, reason: 'Approval scope does not match branch' }
    }
    if (approval.scope.previewUrl !== manifest.previewUrl) {
      return { authorized: false, reason: 'Approval scope does not match preview URL' }
    }
    return { authorized: true, reason: 'Approved' }
  }

  private isExpired(record: ProductionApprovalRecord): boolean {
    if (!record.expiresAt) return false
    return new Date(record.expiresAt).getTime() < Date.now()
  }

  listAll(): ProductionApprovalRecord[] {
    return [...this.records.values()]
  }
}
