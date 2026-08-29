export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED'

export interface ApprovalRequest {
  id: string
  runId: string
  action: string
  reason: string
  createdAt: string
  status: ApprovalStatus
  requestedBy?: string
  decidedBy?: string
  decidedAt?: string
  decisionReason?: string
  expiresAt?: string
}

export interface ApprovalStore {
  create(request: ApprovalRequest): Promise<void>
  get(id: string): Promise<ApprovalRequest | undefined>
  decide(id: string, decision: 'APPROVED' | 'REJECTED', actor: string, reason?: string, now?: Date): Promise<ApprovalRequest>
  cancel(id: string, actor: string, reason?: string, now?: Date): Promise<ApprovalRequest>
}

export class MemoryApprovalStore implements ApprovalStore {
  private readonly requests = new Map<string, ApprovalRequest>()

  async create(request: ApprovalRequest): Promise<void> {
    if (this.requests.has(request.id)) throw new Error(`Approval already exists: ${request.id}`)
    this.requests.set(request.id, structuredClone(request))
  }

  async get(id: string): Promise<ApprovalRequest | undefined> {
    const request = this.requests.get(id)
    return request ? structuredClone(request) : undefined
  }

  async decide(id: string, decision: 'APPROVED' | 'REJECTED', actor: string, reason?: string, now = new Date()): Promise<ApprovalRequest> {
    const request = this.requireMutable(id, now)
    request.status = decision
    request.decidedBy = actor
    request.decidedAt = now.toISOString()
    request.decisionReason = reason
    this.requests.set(id, request)
    return structuredClone(request)
  }

  async cancel(id: string, actor: string, reason?: string, now = new Date()): Promise<ApprovalRequest> {
    const request = this.requireMutable(id, now)
    request.status = 'CANCELLED'
    request.decidedBy = actor
    request.decidedAt = now.toISOString()
    request.decisionReason = reason
    this.requests.set(id, request)
    return structuredClone(request)
  }

  private requireMutable(id: string, now: Date): ApprovalRequest {
    const request = this.requests.get(id)
    if (!request) throw new Error(`Approval not found: ${id}`)
    if (request.status !== 'PENDING') throw new Error(`Approval is already ${request.status}: ${id}`)
    if (request.expiresAt && new Date(request.expiresAt) <= now) {
      request.status = 'EXPIRED'
      this.requests.set(id, request)
      throw new Error(`Approval expired: ${id}`)
    }
    return structuredClone(request)
  }
}

export function createApprovalRequest(input: Omit<ApprovalRequest, 'status'>): ApprovalRequest {
  if (!input.id || !input.runId || !input.action) throw new Error('Approval requires id, runId, and action')
  return { ...input, status: 'PENDING' }
}
