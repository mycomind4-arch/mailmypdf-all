/**
 * Base44 Backend API Client
 * 
 * Wraps calls to deployed Base44 backend functions and entity CRUD.
 * Used by Next.js API routes to proxy frontend requests.
 */

const APP_ID = process.env.BASE44_APP_ID || '6a8bd310dfdf9ad92cf26415'
const BASE44_API_URL = process.env.BASE44_API_URL || 'https://api.base44.com'

// Service token for server-side API calls (no user context)
const SERVICE_TOKEN = process.env.BASE44_SERVICE_TOKEN || ''

export interface EnforcementCase {
  id: string
  status: string
  caseNumber: string | null
  complaintNumber: string | null
  propertyAddress: string | null
  apn: string | null
  recipientName: string | null
  agencyName: string | null
  noticeDate: string | null
  responseDeadline: string | null
  documentName: string | null
  documentText: string | null
  findingsCount: number | null
  findingsSummary: string | null
  defenseReady: boolean | null
  goldCertified: boolean | null
  blockingIssues: string[]
  dueProcessScore: number | null
  reviewNotified: boolean | null
  jurisdiction: string | null
  created_date: string
  updated_date: string
}

export interface CaseFinding {
  id: string
  caseId: string
  type: string
  severity: string
  description: string
  source: string
  resolved: boolean
  confidence: string | null
  recommendedAction: string | null
}

/**
 * Call a deployed Base44 backend function
 */
export async function callBackendFunction(
  functionName: string,
  payload: Record<string, unknown> = {},
): Promise<unknown> {
  const url = `${BASE44_API_URL}/v1/apps/${APP_ID}/functions/${functionName}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_TOKEN}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`Backend function ${functionName} failed: ${res.status} ${text}`)
  }

  return res.json()
}

/**
 * List all enforcement cases from Base44 entities
 */
export async function listCases(): Promise<EnforcementCase[]> {
  const url = `${BASE44_API_URL}/v1/apps/${APP_ID}/entities/EnforcementCase`
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${SERVICE_TOKEN}`,
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to list cases: ${res.status}`)
  }

  const data = await res.json()
  return (data.items || data || []) as EnforcementCase[]
}

/**
 * Get a single case by ID
 */
export async function getCase(caseId: string): Promise<EnforcementCase | null> {
  const url = `${BASE44_API_URL}/v1/apps/${APP_ID}/entities/EnforcementCase/${caseId}`
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${SERVICE_TOKEN}`,
    },
  })

  if (!res.ok) return null
  return res.json() as Promise<EnforcementCase>
}

/**
 * Get all findings for a case
 */
export async function getCaseFindings(caseId: string): Promise<CaseFinding[]> {
  const url = `${BASE44_API_URL}/v1/apps/${APP_ID}/entities/CaseFinding?filter={"caseId":"${caseId}"}`
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${SERVICE_TOKEN}`,
    },
  })

  if (!res.ok) return []
  const data = await res.json()
  return (data.items || data || []) as CaseFinding[]
}

/**
 * Create a new enforcement case (submits to intake queue)
 */
export async function createCase(
  documentName: string,
  documentText: string,
): Promise<EnforcementCase> {
  const url = `${BASE44_API_URL}/v1/apps/${APP_ID}/entities/EnforcementCase`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_TOKEN}`,
    },
    body: JSON.stringify({
      data: {
        status: 'intake',
        documentName,
        documentText,
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`Failed to create case: ${res.status}`)
  }

  return res.json() as Promise<EnforcementCase>
}

/**
 * Update an existing case with pipeline results
 */
export async function updateCase(
  caseId: string,
  data: Record<string, unknown>,
): Promise<EnforcementCase> {
  const url = `${BASE44_API_URL}/v1/apps/${APP_ID}/entities/EnforcementCase/${caseId}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_TOKEN}`,
    },
    body: JSON.stringify({ data }),
  })

  if (!res.ok) {
    throw new Error(`Failed to update case: ${res.status}`)
  }

  return res.json() as Promise<EnforcementCase>
}

/**
 * Create findings for a case
 */
export async function createFindings(
  caseId: string,
  findings: Array<{
    caseId: string
    type: string
    severity: string
    description: string
    source: string
    resolved: boolean
    confidence: string | null
    recommendedAction: string | null
  }>,
): Promise<CaseFinding[]> {
  const url = `${BASE44_API_URL}/v1/apps/${APP_ID}/entities/CaseFinding`
  const results: CaseFinding[] = []

  for (const finding of findings) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_TOKEN}`,
      },
      body: JSON.stringify({ data: finding }),
    })

    if (res.ok) {
      const created = await res.json() as CaseFinding
      results.push(created)
    }
  }

  return results
}
