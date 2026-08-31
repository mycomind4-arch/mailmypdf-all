import { NextResponse } from 'next/server'
import { buildRequestAuditPayload, validateCreateRequest } from '../../../../src/request-service'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, issues: [{ field: 'body', message: 'Request body must be valid JSON' }] },
      { status: 400 },
    )
  }

  const result = validateCreateRequest(body)
  if (!result.ok) {
    return NextResponse.json({ ok: false, issues: result.issues }, { status: 422 })
  }

  return NextResponse.json({
    ok: true,
    request: result.value,
    audit: buildRequestAuditPayload(result.value),
    persistence: {
      status: 'not_configured',
      message: 'Validation is executable. Durable request creation requires a configured RequestRepository/database adapter.',
    },
  })
}
