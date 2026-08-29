import { NextResponse } from 'next/server'
import { getRequestStateRepositoryAsync } from '../../../../src/runtime'
import { getApprovalPrincipal } from '../../../../src/authorization-runtime'
import { buildCodeEnforcementRequestStrategy } from '../../../../src/workflows/code-enforcement-ai'
import { getConfiguredRecordsLlmProviders } from '../../../../src/ai/records-llm-providers'

export const dynamic = 'force-dynamic'

function parseWorkflowScope(scope?: string) {
  if (!scope) return null
  try {
    const outer = JSON.parse(scope) as { scope?: string; items?: unknown }
    if (typeof outer.scope !== 'string') return null
    const workflow = JSON.parse(outer.scope) as Record<string, unknown>
    return { workflow, items: outer.items ?? [] }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const principal = await getApprovalPrincipal()
  if (!principal) return NextResponse.json({ ok: false, error: 'authentication_required' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }) }

  const id = body && typeof body === 'object' && typeof (body as Record<string, unknown>).id === 'string'
    ? String((body as Record<string, unknown>).id).trim() : ''
  if (!id) return NextResponse.json({ ok: false, error: 'request_id_required' }, { status: 422 })

  const repository = await getRequestStateRepositoryAsync()
  if (!repository) return NextResponse.json({ ok: false, error: 'persistence_not_configured' }, { status: 503 })

  const record = await repository.getRequest(id)
  if (!record) return NextResponse.json({ ok: false, error: 'request_not_found' }, { status: 404 })
  if (record.ownerId !== principal.subject) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })

  const parsed = parseWorkflowScope(record.scope)
  if (!parsed) return NextResponse.json({ ok: false, error: 'invalid_workflow_scope' }, { status: 422 })
  const workflowId = typeof parsed.workflow.workflow === 'string' ? parsed.workflow.workflow : undefined

  if (workflowId === 'code-enforcement-records') {
    const providers = getConfiguredRecordsLlmProviders()
    if (providers.length < 2) return NextResponse.json({ ok: false, error: 'multi_llm_quorum_unavailable', requiredProviders: 2, configuredProviders: providers.length }, { status: 503 })
    try {
      const strategy = await buildCodeEnforcementRequestStrategy(providers, {
        workflow: workflowId, agency: record.agency, jurisdiction: record.jurisdiction, purpose: record.purpose,
        matter: parsed.workflow, requestedItems: parsed.items,
      }, { minimumProviders: 2, agreementThreshold: 0.67, maxProviders: 3 })
      await repository.recordAuditEvent({ requestId: id, eventType: 'ai_preflight_completed', actor: principal.subject, payload: {
        workflowId, task: 'strategy', providers: strategy.providers, confidence: strategy.confidence,
        disagreements: strategy.disagreements, warnings: strategy.warnings, strategy: strategy.value,
      }})
      if (strategy.warnings.includes('MULTI_LLM_DISAGREEMENT_REQUIRES_REVIEW') || strategy.confidence < 0.67) {
        return NextResponse.json({ ok: false, error: 'ai_review_required', requestId: id, strategy: strategy.value, warnings: strategy.warnings, providers: strategy.providers }, { status: 409 })
      }
    } catch (error) {
      return NextResponse.json({ ok: false, error: 'ai_preflight_failed', message: error instanceof Error ? error.message : String(error), requestId: id }, { status: 409 })
    }
  }

  try {
    const reviewed = await repository.transition(id, 'validated', 'review', principal.subject)
    return NextResponse.json({ ok: true, request: reviewed, multiLlm: workflowId === 'code-enforcement-records' })
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'review_failed', message: error instanceof Error ? error.message : String(error) }, { status: 409 })
  }
}
