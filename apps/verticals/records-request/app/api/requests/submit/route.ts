import { NextResponse } from 'next/server'
import { getD1RequestDatabase, getRequestStateRepositoryAsync } from '../../../../src/runtime'
import { getMailMyPDFFulfillment } from '../../../../src/fulfillment-runtime'
import { attestRecordsRequestPdf } from '../../../../src/records-document'
import type { FulfillmentRequest } from '../../../../src/fulfillment'
import { canApproveWithRole, getApprovalPrincipal } from '../../../../src/authorization-runtime'
import { markFulfillmentAccepted, markFulfillmentFailed, reserveFulfillmentAttempt } from '../../../../src/fulfillment/reservation'
import { hashApprovedArtifact, type ApprovedArtifact } from '../../../../src/approved-artifact'

export const dynamic = 'force-dynamic'

type SubmitBody = { id?: string }
type RequestRepository = NonNullable<Awaited<ReturnType<typeof getRequestStateRepositoryAsync>>>

async function reconcileFailure(repository: RequestRepository, id: string, actor: string, error: unknown) {
  const current = await repository.getRequest(id)
  if (current?.status === 'queued') { try { await repository.transition(id, 'queued', 'failed', actor) } catch { /* Provider callback may have reconciled state concurrently. */ } }
  return error instanceof Error ? error.message : String(error)
}

export async function POST(request: Request) {
  let body: SubmitBody
  try { body = (await request.json()) as SubmitBody } catch { return NextResponse.json({ ok: false, error: 'Request body must be valid JSON' }, { status: 400 }) }
  const id = body.id?.trim() ?? ''
  if (!id) return NextResponse.json({ ok: false, error: 'Request id is required' }, { status: 422 })

  const repository = await getRequestStateRepositoryAsync()
  if (!repository) return NextResponse.json({ ok: false, error: 'persistence_not_configured', requestId: id }, { status: 503 })
  const principal = await getApprovalPrincipal()
  if (!principal) return NextResponse.json({ ok: false, error: 'approval_auth_not_configured', requestId: id }, { status: 503 })
  if (!canApproveWithRole(principal)) return NextResponse.json({ ok: false, error: 'submission_forbidden', requestId: id }, { status: 403 })

  const actor = principal.subject
  const requestRecord = await repository.getRequest(id)
  if (!requestRecord) return NextResponse.json({ ok: false, error: 'Request not found', requestId: id }, { status: 404 })
  if (requestRecord.ownerId !== actor && !principal.roles.includes('admin')) return NextResponse.json({ ok: false, error: 'submission_forbidden', requestId: id }, { status: 403 })
  if (requestRecord.status !== 'approved') return NextResponse.json({ ok: false, error: `Request must be in 'approved' status, got '${requestRecord.status}'`, requestId: id }, { status: 409 })
  if (!requestRecord.approvedArtifactJson || !requestRecord.approvedArtifactHash) return NextResponse.json({ ok: false, error: 'approved_artifact_missing', requestId: id }, { status: 409 })

  let artifact: ApprovedArtifact
  try { artifact = JSON.parse(requestRecord.approvedArtifactJson) as ApprovedArtifact } catch { return NextResponse.json({ ok: false, error: 'approved_artifact_invalid', requestId: id }, { status: 409 }) }
  if (artifact.requestId !== id) return NextResponse.json({ ok: false, error: 'approved_artifact_request_mismatch', requestId: id }, { status: 409 })
  const recomputedArtifactHash = await hashApprovedArtifact(artifact)
  if (recomputedArtifactHash !== requestRecord.approvedArtifactHash) return NextResponse.json({ ok: false, error: 'approved_artifact_tampered', requestId: id }, { status: 409 })

  const { bytes, sha256 } = await attestRecordsRequestPdf(artifact)
  await repository.recordFulfillmentEvent({ requestId: id, eventType: 'document_attested', actor, payload: { sha256, approvedArtifactHash: requestRecord.approvedArtifactHash, byteLength: bytes.byteLength, filename: 'records-request.pdf' } })

  const fulfillmentRequest: FulfillmentRequest = {
    requestId: id,
    idempotencyKey: `${id}:${requestRecord.approvedArtifactHash}:${sha256}`,
    recipient: {
      name: artifact.recipientName,
      address1: artifact.recipientAddress.split('\n')[0] ?? '',
      city: '', state: '', postalCode: '',
    },
    document: { filename: 'records-request.pdf', contentBase64: Buffer.from(bytes).toString('base64') },
    mailingClass: artifact.mailingClass,
  }
  // The provider contract requires a structured recipient. Recover it from the immutable artifact format.
  const addressLines = artifact.recipientAddress.split('\n')
  const cityStateZip = addressLines[addressLines.length - 1] ?? ''
  const match = cityStateZip.match(/^(.+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/)
  if (!match) return NextResponse.json({ ok: false, error: 'approved_recipient_address_invalid', requestId: id }, { status: 409 })
  fulfillmentRequest.recipient.address1 = addressLines[0] ?? ''
  fulfillmentRequest.recipient.address2 = addressLines.length > 2 ? addressLines.slice(1, -1).join('\n') : undefined
  fulfillmentRequest.recipient.city = match[1]
  fulfillmentRequest.recipient.state = match[2]
  fulfillmentRequest.recipient.postalCode = match[3]

  const provider = getMailMyPDFFulfillment()
  if (!provider) return NextResponse.json({ ok: false, error: 'fulfillment_not_configured', requestId: id }, { status: 503 })
  const db = getD1RequestDatabase()
  if (!db) return NextResponse.json({ ok: false, error: 'persistence_not_configured', requestId: id }, { status: 503 })

  const reservation = await reserveFulfillmentAttempt(db, id, fulfillmentRequest.idempotencyKey)
  if (reservation.kind === 'already_accepted') return NextResponse.json({ ok: true, requestId: id, status: 'already_submitted', fulfillmentAttemptId: reservation.reservation.id }, { status: 200 })
  if (reservation.kind === 'already_pending') return NextResponse.json({ ok: false, error: 'submission_in_progress', requestId: id, fulfillmentAttemptId: reservation.reservation.id }, { status: 409 })
  if (reservation.kind === 'already_failed') return NextResponse.json({ ok: false, error: 'previous_submission_failed', requestId: id, fulfillmentAttemptId: reservation.reservation.id }, { status: 409 })

  const fulfillmentAttemptId = reservation.reservation.id
  try {
    await repository.transition(id, 'approved', 'queued', actor)
    const result = await provider.submit(fulfillmentRequest)
    await markFulfillmentAccepted(db, fulfillmentAttemptId, result.submissionId)
    const afterProvider = await repository.getRequest(id)
    if (afterProvider?.status === 'queued') await repository.transition(id, 'queued', 'submitted', actor)
    const afterSubmit = await repository.getRequest(id)
    if (afterSubmit?.status === 'submitted') await repository.transition(id, 'submitted', 'tracking', actor)
    await repository.recordFulfillmentEvent({ requestId: id, eventType: 'fulfillment_submitted', actor, payload: { provider: result.provider, submissionId: result.submissionId, trackingNumber: result.trackingNumber, proofId: result.proofId, documentSha256: sha256, approvedArtifactHash: requestRecord.approvedArtifactHash, idempotencyKey: fulfillmentRequest.idempotencyKey, fulfillmentAttemptId } })
    return NextResponse.json({ ok: true, request: await repository.getRequest(id), fulfillment: result, documentSha256: sha256, approvedArtifactHash: requestRecord.approvedArtifactHash, fulfillmentAttemptId, submittedBy: principal.subject })
  } catch (error) {
    const message = await reconcileFailure(repository, id, actor, error)
    try { await markFulfillmentFailed(db, fulfillmentAttemptId, message) } catch { /* Preserve original submission error. */ }
    try { await repository.recordFulfillmentEvent({ requestId: id, eventType: 'fulfillment_failed', actor, payload: { error: message, documentSha256: sha256, approvedArtifactHash: requestRecord.approvedArtifactHash, idempotencyKey: fulfillmentRequest.idempotencyKey, fulfillmentAttemptId } }) } catch { /* Preserve original submission error. */ }
    return NextResponse.json({ ok: false, error: 'submission_failed', message, requestId: id, documentSha256: sha256, approvedArtifactHash: requestRecord.approvedArtifactHash, fulfillmentAttemptId }, { status: 409 })
  }
}
