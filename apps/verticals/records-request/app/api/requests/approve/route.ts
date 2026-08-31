import { NextResponse } from 'next/server'
import { getRequestStateRepositoryAsync } from '../../../../src/runtime'
import { canApproveWithRole, getApprovalPrincipal } from '../../../../src/authorization-runtime'
import { hashApprovedArtifact, type ApprovedArtifact } from '../../../../src/approved-artifact'

export const dynamic = 'force-dynamic'

type ApproveBody = {
  id?: string
  sender?: { name?: string; address?: string }
  recipient?: { name?: string; address1?: string; address2?: string; city?: string; state?: string; postalCode?: string }
  subject?: string
  body?: string
  mailingClass?: 'certified' | 'registered' | 'first_class'
}

export async function POST(request: Request) {
  let body: ApproveBody
  try { body = (await request.json()) as ApproveBody } catch { return NextResponse.json({ ok: false, error: 'Request body must be valid JSON' }, { status: 400 }) }

  const id = body.id?.trim() ?? ''
  if (!id) return NextResponse.json({ ok: false, error: 'Request id is required' }, { status: 422 })
  const recipient = body.recipient
  if (!recipient?.name || !recipient.address1 || !recipient.city || !recipient.state || !recipient.postalCode) {
    return NextResponse.json({ ok: false, error: 'Approval requires the complete recipient address because it is part of the immutable fulfillment artifact' }, { status: 422 })
  }

  const repository = await getRequestStateRepositoryAsync()
  if (!repository) return NextResponse.json({ ok: false, error: 'persistence_not_configured' }, { status: 503 })
  const principal = await getApprovalPrincipal()
  if (!principal) return NextResponse.json({ ok: false, error: 'approval_auth_not_configured' }, { status: 503 })
  if (!canApproveWithRole(principal)) return NextResponse.json({ ok: false, error: 'approval_forbidden' }, { status: 403 })

  const requestRecord = await repository.getRequest(id)
  if (!requestRecord) return NextResponse.json({ ok: false, error: 'request_not_found' }, { status: 404 })
  if (requestRecord.ownerId !== principal.subject && !principal.roles.includes('admin')) return NextResponse.json({ ok: false, error: 'approval_forbidden' }, { status: 403 })

  const recipientAddress = [recipient.address1, recipient.address2, `${recipient.city}, ${recipient.state} ${recipient.postalCode}`].filter(Boolean).join('\n')
  const artifact: ApprovedArtifact = {
    senderName: body.sender?.name ?? 'MailMyPDF Records',
    senderAddress: body.sender?.address ?? 'PO Box 123\nHumboldt, CA 95521',
    recipientName: recipient.name,
    recipientAddress,
    agency: requestRecord.agency,
    subject: body.subject ?? `Public Records Request: ${requestRecord.title}`,
    body: body.body ?? `This is a public records request submitted under applicable public records law.\n\nRequest: ${requestRecord.title}\nAgency: ${requestRecord.agency}${requestRecord.jurisdiction ? `\nJurisdiction: ${requestRecord.jurisdiction}` : ''}${requestRecord.purpose ? `\nPurpose: ${requestRecord.purpose}` : ''}`,
    requestId: id,
    date: new Date().toISOString().slice(0, 10),
    mailingClass: body.mailingClass ?? 'certified',
  }

  const artifactHash = await hashApprovedArtifact(artifact)
  try {
    const approved = await repository.setApprovedArtifact(id, artifact, artifactHash, principal.subject)
    return NextResponse.json({ ok: true, request: approved, approvedBy: principal.subject, approvedArtifactHash: artifactHash })
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'approval_failed', message: error instanceof Error ? error.message : String(error), requestId: id }, { status: 409 })
  }
}
