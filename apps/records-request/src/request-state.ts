export type RequestStatus =
  | 'draft'
  | 'validated'
  | 'review'
  | 'approved'
  | 'queued'
  | 'submitted'
  | 'tracking'
  | 'completed'
  | 'blocked'
  | 'failed'

export type RequestRecord = {
  id: string
  title: string
  agency: string
  status: RequestStatus
  requestedAt?: string
  approvedAt?: string
  submittedAt?: string
  trackingNumber?: string
  proofId?: string
}

export type RequestStateRepository = {
  get(id: string): Promise<RequestRecord | null>
  setStatus(id: string, status: RequestStatus, patch?: Partial<RequestRecord>): Promise<RequestRecord>
}

export type FulfillmentAdapter = {
  submit(request: RequestRecord): Promise<{ trackingNumber?: string; proofId?: string }>
}

export async function approveRequest(
  repo: RequestStateRepository,
  id: string,
): Promise<RequestRecord> {
  const request = await repo.get(id)
  if (!request) throw new Error('Request not found')
  if (request.status !== 'review') throw new Error(`Request cannot be approved from status ${request.status}`)
  return repo.setStatus(id, 'approved', { approvedAt: new Date().toISOString() })
}

export async function submitApprovedRequest(
  repo: RequestStateRepository,
  fulfillment: FulfillmentAdapter,
  id: string,
): Promise<RequestRecord> {
  const request = await repo.get(id)
  if (!request) throw new Error('Request not found')
  if (request.status !== 'approved') throw new Error(`Request cannot be submitted from status ${request.status}`)

  await repo.setStatus(id, 'queued')
  try {
    const result = await fulfillment.submit(request)
    return repo.setStatus(id, 'submitted', {
      submittedAt: new Date().toISOString(),
      trackingNumber: result.trackingNumber,
      proofId: result.proofId,
    })
  } catch (error) {
    await repo.setStatus(id, 'failed')
    throw error
  }
}

export function canSubmit(status: RequestStatus): boolean {
  return status === 'approved'
}
