export type FulfillmentAttemptStatus = 'pending' | 'accepted' | 'failed'

export type FulfillmentAttempt = {
  requestId: string
  idempotencyKey: string
  status: FulfillmentAttemptStatus
}

export function buildFulfillmentIdempotencyKey(requestId: string, documentHash: string): string {
  return `${requestId}:${documentHash}`
}

export function isTerminalFulfillmentStatus(status: FulfillmentAttemptStatus): boolean {
  return status === 'accepted' || status === 'failed'
}
