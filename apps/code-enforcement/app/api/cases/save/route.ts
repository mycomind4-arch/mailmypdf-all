import { NextResponse } from 'next/server'
import {
  createCase,
  updateCase,
  createFindings,
  type EnforcementCase,
} from '@/src/lib/base44-client'

export const runtime = 'nodejs'

interface SaveCaseRequest {
  caseId?: string
  documentName: string
  documentText: string
  caseNumber?: string | null
  complaintNumber?: string | null
  propertyAddress?: string | null
  apn?: string | null
  recipientName?: string | null
  agencyName?: string | null
  noticeDate?: string | null
  responseDeadline?: string | null
  jurisdiction?: string | null
  status?: string
  findingsCount?: number
  findingsSummary?: string | null
  defenseReady?: boolean
  goldCertified?: boolean
  blockingIssues?: string[]
  dueProcessScore?: number | null
  reviewNotified?: boolean
  findings?: Array<{
    type: string
    severity: string
    description: string
    source: string
    resolved: boolean
    confidence?: string | null
    recommendedAction?: string | null
  }>
}

/**
 * POST /api/cases/save — create or update a case with pipeline results
 *
 * This endpoint persists the full analysis pipeline output to Base44,
 * replacing the browser-only Zustand state with durable backend storage.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveCaseRequest

    if (!body.documentName || !body.documentText) {
      return NextResponse.json(
        { error: 'documentName and documentText are required.' },
        { status: 400 },
      )
    }

    let caseId = body.caseId
    let savedCase: EnforcementCase

    const caseData: Record<string, unknown> = {
      status: body.status || 'analyzed',
      caseNumber: body.caseNumber || null,
      complaintNumber: body.complaintNumber || null,
      propertyAddress: body.propertyAddress || null,
      apn: body.apn || null,
      recipientName: body.recipientName || null,
      agencyName: body.agencyName || null,
      noticeDate: body.noticeDate || null,
      responseDeadline: body.responseDeadline || null,
      jurisdiction: body.jurisdiction || null,
      documentName: body.documentName,
      documentText: body.documentText,
      findingsCount: body.findingsCount || 0,
      findingsSummary: body.findingsSummary || null,
      defenseReady: body.defenseReady ?? false,
      goldCertified: body.goldCertified ?? false,
      blockingIssues: body.blockingIssues || [],
      dueProcessScore: body.dueProcessScore ?? null,
      reviewNotified: body.reviewNotified ?? false,
    }

    if (caseId) {
      savedCase = await updateCase(caseId, caseData)
    } else {
      savedCase = await createCase(body.documentName, body.documentText)
      caseId = savedCase.id
      savedCase = await updateCase(caseId, caseData)
    }

    if (body.findings && body.findings.length > 0 && caseId) {
      await createFindings(
        caseId,
        body.findings.map(f => ({
          caseId,
          type: f.type,
          severity: f.severity,
          description: f.description,
          source: f.source,
          resolved: f.resolved,
          confidence: f.confidence || null,
          recommendedAction: f.recommendedAction || null,
        })),
      )
    }

    return NextResponse.json({ ok: true, case: savedCase })
  } catch (error) {
    console.error('Failed to save case:', error)
    return NextResponse.json(
      { error: 'Failed to save case to backend.' },
      { status: 500 },
    )
  }
}
