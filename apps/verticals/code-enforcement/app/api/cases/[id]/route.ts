import { NextResponse } from 'next/server'
import { getCase, getCaseFindings } from '@/src/lib/base44-client'

export const runtime = 'nodejs'

/**
 * GET /api/cases/[id] — get a single case with its findings
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const [caseData, findings] = await Promise.all([
      getCase(id),
      getCaseFindings(id),
    ])

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found.' }, { status: 404 })
    }

    return NextResponse.json({ case: caseData, findings })
  } catch (error) {
    console.error('Failed to get case:', error)
    return NextResponse.json(
      { error: 'Failed to fetch case from backend.' },
      { status: 500 },
    )
  }
}
