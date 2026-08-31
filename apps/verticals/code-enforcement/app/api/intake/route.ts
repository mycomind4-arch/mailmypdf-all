import { NextResponse } from 'next/server'
import { callBackendFunction } from '@/src/lib/base44-client'

export const runtime = 'nodejs'

/**
 * POST /api/intake — manually trigger intake queue processing
 * (Calls the processIntakeQueue backend function directly)
 */
export async function POST() {
  try {
    const result = await callBackendFunction('processIntakeQueue', {})
    return NextResponse.json(result)
  } catch (error) {
    console.error('Intake processing failed:', error)
    return NextResponse.json(
      { error: 'Failed to trigger intake processing.' },
      { status: 500 },
    )
  }
}
