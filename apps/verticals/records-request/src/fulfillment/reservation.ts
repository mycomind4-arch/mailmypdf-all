import type { D1DatabaseLike } from '../request-repository'

export type FulfillmentReservation = {
  id: string
  requestId: string
  idempotencyKey: string
  status: 'pending' | 'accepted' | 'failed'
}

export type ReservationResult =
  | { kind: 'reserved'; reservation: FulfillmentReservation }
  | { kind: 'already_pending'; reservation: FulfillmentReservation }
  | { kind: 'already_accepted'; reservation: FulfillmentReservation }
  | { kind: 'already_failed'; reservation: FulfillmentReservation }

export async function reserveFulfillmentAttempt(
  db: D1DatabaseLike,
  requestId: string,
  idempotencyKey: string,
): Promise<ReservationResult> {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  try {
    const result = await db.prepare(
      `INSERT INTO fulfillment_attempts (id, request_id, idempotency_key, status, provider, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', 'mailmypdf', ?, ?)`,
    ).bind(id, requestId, idempotencyKey, now, now).run()

    if (!result.success || !(result.meta?.changes)) throw new Error('Fulfillment reservation was not created')
    return {
      kind: 'reserved',
      reservation: { id, requestId, idempotencyKey, status: 'pending' },
    }
  } catch (error) {
    if (!(error instanceof Error) || !/UNIQUE|constraint/i.test(error.message)) throw error
    const row = await db.prepare(
      `SELECT id, request_id, idempotency_key, status FROM fulfillment_attempts WHERE provider = 'mailmypdf' AND idempotency_key = ?`,
    ).bind(idempotencyKey).first<{ id: string; request_id: string; idempotency_key: string; status: FulfillmentReservation['status'] }>()
    if (!row) throw error

    const reservation = {
      id: row.id,
      requestId: row.request_id,
      idempotencyKey: row.idempotency_key,
      status: row.status,
    }
    return {
      kind: row.status === 'pending'
        ? 'already_pending'
        : row.status === 'accepted'
          ? 'already_accepted'
          : 'already_failed',
      reservation,
    }
  }
}

export async function markFulfillmentAccepted(
  db: D1DatabaseLike,
  id: string,
  providerReference: string,
): Promise<void> {
  const result = await db.prepare(
    `UPDATE fulfillment_attempts SET status = 'accepted', provider_reference = ?, updated_at = ? WHERE id = ? AND status = 'pending'`,
  ).bind(providerReference, new Date().toISOString(), id).run()
  if (!result.success || !(result.meta?.changes)) throw new Error('Fulfillment acceptance update failed or reservation is no longer pending')
}

export async function markFulfillmentFailed(
  db: D1DatabaseLike,
  id: string,
  errorMessage: string,
): Promise<void> {
  const result = await db.prepare(
    `UPDATE fulfillment_attempts SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ? AND status = 'pending'`,
  ).bind(errorMessage, new Date().toISOString(), id).run()
  if (!result.success || !(result.meta?.changes)) throw new Error('Fulfillment failure update failed or reservation is no longer pending')
}

export function isSuccessfulReservation(result: ReservationResult): boolean {
  return result.kind === 'reserved' || result.kind === 'already_pending' || result.kind === 'already_accepted'
}
