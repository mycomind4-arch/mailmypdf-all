import { NextResponse } from 'next/server'
import { listCases } from '@/src/lib/base44-client'

export const runtime = 'nodejs'

/**
 * GET /api/cases — list all enforcement cases from Base44
 */
export async function GET() {
  try {
    const cases = await listCases()
    return NextResponse.json({ cases })
  } catch (error) {
    console.error('Failed to list cases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cases from backend.' },
      { status: 500 },
    )
  }
}
