import { NextResponse } from 'next/server'
import { getRequestStateRepositoryAsync } from '../../../src/runtime'
import { getApprovalPrincipal } from '../../../src/authorization-runtime'
import { validateCreateRequest } from '../../../src/request-service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const principal = await getApprovalPrincipal()
  if (!principal) {
    return NextResponse.json({ ok: false, error: 'authentication_required' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, issues: [{ field: 'body', message: 'Request body must be valid JSON' }] }, { status: 400 })
  }

  const result = validateCreateRequest(body)
  if (!result.ok) return NextResponse.json({ ok: false, issues: result.issues }, { status: 422 })

  const repository = await getRequestStateRepositoryAsync()
  if (!repository) {
    return NextResponse.json({ ok: false, error: 'persistence_not_configured' }, { status: 503 })
  }

  try {
    const created = await repository.createRequest(result.value, principal.subject)
    const record = await repository.getRequest(created.id)
    return NextResponse.json({ ok: true, request: record }, { status: 201 })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'request_creation_failed',
      message: error instanceof Error ? error.message : String(error),
    }, { status: 409 })
  }
}

export async function GET() {
  const principal = await getApprovalPrincipal()
  if (!principal) return NextResponse.json({ ok: false, error: 'authentication_required' }, { status: 401 })

  const repository = await getRequestStateRepositoryAsync()
  if (!repository) return NextResponse.json({ ok: false, error: 'persistence_not_configured' }, { status: 503 })

  const requests = await repository.listRequests(principal.subject)
  return NextResponse.json({ ok: true, requests })
}
