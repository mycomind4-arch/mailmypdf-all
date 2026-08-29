import { NextResponse } from 'next/server'
import pdf from 'pdf-parse'

export const runtime = 'nodejs'

// ── Rate limiting (in-memory, per-IP) ─────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10  // 10 extractions per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt: now + RATE_LIMIT_WINDOW_MS }
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }
  entry.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetAt: entry.resetAt }
}

// ── Authentication ────────────────────────────────────────────
// Requires either:
//   1. A valid session cookie (fp_session or base44_session), OR
//   2. An Authorization: Bearer <token> header matching the server's API key
function authenticateRequest(request: Request): { ok: boolean; error?: string } {
  // Check for Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const serverKey = process.env.EXTRACT_API_KEY
    if (serverKey && token === serverKey) {
      return { ok: true }
    }
  }

  // Check for session cookies
  const cookieHeader = request.headers.get('cookie') || ''
  const hasSession = /(?:fp_session|base44_session|sb-access-token)=/.test(cookieHeader)
  if (hasSession) {
    return { ok: true }
  }

  return { ok: false, error: 'Authentication required. Provide a session cookie or Authorization header.' }
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

function extractFacts(text: string) {
  const normalized = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ')
  const deadlines = [...normalized.matchAll(/(?:deadline|respond by|response due|compliance date|hearing date)[^\n:]*[:]?\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/gi)].map(m => m[1])
  const caseNumber = firstMatch(normalized, [/(?:case|case no\.?|case number|notice no\.?|citation)\s*(?:#|number|no\.?)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/]{2,})/i])
  const address = firstMatch(normalized, [/(?:property address|site address|premises|location)\s*[:\-]\s*([^\n]{8,100})/i])
  const jurisdiction = firstMatch(normalized, [/(?:jurisdiction|agency|department|city|county)\s*[:\-]\s*([^\n]{3,100})/i])
  const violationLines = normalized.split('\n').map(line => line.trim()).filter(line => /violation|violat|code section|ordinance|citation/i.test(line)).slice(0, 12)
  return { caseNumber, address, jurisdiction, deadlines, violationLines }
}

export async function POST(request: Request) {
  // ── Authentication ──────────────────────────────────────────
  const auth = authenticateRequest(request)
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error || 'Authentication required.' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
    )
  }

  // ── Rate limiting ───────────────────────────────────────────
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Rate limit exceeded. Too many extraction requests.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimit.resetAt),
        }
      }
    )
  }

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'A file is required.' }, { status: 400 })
    if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'Files must be 15 MB or smaller.' }, { status: 413 })

    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const parsed = await pdf(buffer)
      text = parsed.text || ''
    } else if (file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name)) {
      text = buffer.toString('utf8')
    } else {
      return NextResponse.json({ error: 'This first extractor supports PDF and plain-text documents. The file can still be preserved as evidence.' }, { status: 415 })
    }

    const facts = extractFacts(text)
    return NextResponse.json({
      document: { name: file.name, size: file.size, type: file.type || 'application/octet-stream', extractedAt: new Date().toISOString(), characterCount: text.length },
      extractedText: text,
      facts,
      provenance: { source: file.name, method: 'deterministic text extraction', note: 'Extracted values are suggestions. Confirm them against the source document before saving or acting.' },
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetAt),
      }
    })
  } catch (error) {
    console.error('document extraction failed', error)
    return NextResponse.json({ error: 'The document could not be extracted. Preserve the original and verify it manually.' }, { status: 500 })
  }
}
