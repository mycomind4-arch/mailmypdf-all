import { createClient, type User } from '@supabase/supabase-js'
import { PRICES, getWorkflowPricingProfile, calculateQuote, serializeQuote, type PricingKey, type MailClass } from '@mailmypdf/pricing'
import { hashApprovedArtifact, type ApprovedArtifact } from '../approved-artifact'
import { attestRecordsRequestPdf } from '../records-document'
import { createMailMyPDFFulfillment } from '../fulfillment'

export type StructuredRecipient = {
  name: string
  org?: string
  address1: string
  address2?: string | null
  city: string
  state: string
  zip: string
  country?: string
}

export type RecordsApproval = {
  id: string
  owner_id: string
  workflow_id: string
  artifact_json: ApprovedArtifact
  recipient_json: StructuredRecipient
  artifact_hash: string
  recipient_hash: string
  document_sha256: string
  status: 'active' | 'revoked'
  approved_at: string
}

export type RecordsMailingIntent = {
  id: string
  owner_id: string
  workflow_id: string
  approval_id: string
  stripe_session_id: string | null
  stripe_payment_intent_id: string | null
  stripe_price_cents: number
  status: 'approved' | 'paid' | 'submitted' | 'tracking' | 'delivered' | 'failed' | 'expired' | 'refunded'
  mailing_method: ApprovedArtifact['mailingClass']
  provider_order_id: string | null
  tracking_number: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export class RecordsAuthError extends Error {
  constructor(readonly status: 401 | 503, message: string) {
    super(message)
    this.name = 'RecordsAuthError'
  }
}

function authSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new RecordsAuthError(503, 'MailMyPDF Account authentication is not configured.')
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function serviceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole) throw new Error('Supabase server configuration is incomplete.')
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function requireAuthenticatedUser(request: Request): Promise<User> {
  const authorization = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) throw new RecordsAuthError(401, 'Authentication required.')
  const token = authorization.slice(7).trim()
  if (!token) throw new RecordsAuthError(401, 'Authentication required.')
  const { data, error } = await authSupabase().auth.getUser(token)
  if (error || !data.user) throw new RecordsAuthError(401, 'Invalid or expired authentication token.')
  return data.user
}

function required(value: unknown, label: string, minimum = 1): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text.length < minimum) throw new Error(`${label} is required.`)
  return text
}

export function normalizeRecipient(input: Partial<StructuredRecipient>): StructuredRecipient {
  const recipient: StructuredRecipient = {
    name: required(input.name, 'Recipient name'),
    org: typeof input.org === 'string' && input.org.trim() ? input.org.trim() : undefined,
    address1: required(input.address1, 'Recipient address'),
    address2: typeof input.address2 === 'string' && input.address2.trim() ? input.address2.trim() : null,
    city: required(input.city, 'Recipient city'),
    state: required(input.state, 'Recipient state').toUpperCase(),
    zip: required(input.zip, 'Recipient ZIP code'),
    country: (typeof input.country === 'string' && input.country.trim() ? input.country.trim() : 'US').toUpperCase(),
  }
  if (!/^[A-Z]{2}$/.test(recipient.state)) throw new Error('Recipient state must be a two-letter US state code.')
  if (!/^\d{5}(?:-\d{4})?$/.test(recipient.zip)) throw new Error('Recipient ZIP code is invalid.')
  if (recipient.country !== 'US') throw new Error('Records Request mailing currently supports US recipients only.')
  return recipient
}

export function recipientDisplayAddress(recipient: StructuredRecipient): string {
  return [recipient.address1, recipient.address2, `${recipient.city}, ${recipient.state} ${recipient.zip}`].filter(Boolean).join('\n')
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)))
  }
  return btoa(binary)
}

async function sha256Text(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashRecipient(recipient: StructuredRecipient): Promise<string> {
  return sha256Text(JSON.stringify({
    name: recipient.name.trim().toUpperCase(),
    org: (recipient.org || '').trim().toUpperCase(),
    address1: recipient.address1.trim().toUpperCase(),
    address2: (recipient.address2 || '').trim().toUpperCase(),
    city: recipient.city.trim().toUpperCase(),
    state: recipient.state.trim().toUpperCase(),
    zip: recipient.zip.trim(),
  }))
}

export function buildApprovedArtifact(input: Partial<ApprovedArtifact>, recipient: StructuredRecipient, mailingClass: ApprovedArtifact['mailingClass']): ApprovedArtifact {
  if (!['first_class', 'certified', 'registered'].includes(mailingClass)) throw new Error('Mailing class is invalid.')
  return {
    senderName: required(input.senderName, 'Sender name'),
    senderAddress: required(input.senderAddress, 'Sender address'),
    recipientName: recipient.name,
    recipientAddress: recipientDisplayAddress(recipient),
    agency: required(input.agency, 'Agency'),
    subject: required(input.subject, 'Subject'),
    body: required(input.body, 'Request body', 20),
    requestId: required(input.requestId, 'Request ID'),
    date: typeof input.date === 'string' && input.date.trim() ? input.date.trim() : new Date().toISOString().slice(0, 10),
    mailingClass,
  }
}

export async function createApproval(ownerId: string, workflowId: string, artifactInput: Partial<ApprovedArtifact>, recipientInput: Partial<StructuredRecipient>, mailingClass: ApprovedArtifact['mailingClass']): Promise<RecordsApproval> {
  const recipient = normalizeRecipient(recipientInput)
  const artifact = buildApprovedArtifact(artifactInput, recipient, mailingClass)
  const artifactHash = await hashApprovedArtifact(artifact)
  const recipientHash = await hashRecipient(recipient)
  const { sha256: documentSha256 } = await attestRecordsRequestPdf(artifact)
  const supabase = serviceSupabase()
  const { data, error } = await supabase.from('records_approvals').insert({
    owner_id: ownerId,
    workflow_id: workflowId,
    artifact_json: artifact,
    recipient_json: recipient,
    artifact_hash: artifactHash,
    recipient_hash: recipientHash,
    document_sha256: documentSha256,
    status: 'active',
  }).select('*').single()
  if (error || !data) throw new Error(`Unable to persist approval: ${error?.message || 'unknown error'}`)
  return data as RecordsApproval
}

export async function loadApprovalForOwner(approvalId: string, ownerId: string): Promise<RecordsApproval | null> {
  const { data, error } = await serviceSupabase().from('records_approvals').select('*').eq('id', approvalId).eq('owner_id', ownerId).eq('status', 'active').maybeSingle()
  if (error) throw new Error(`Unable to load approval: ${error.message}`)
  return (data as RecordsApproval | null) ?? null
}

export async function loadIntent(intentId: string): Promise<RecordsMailingIntent | null> {
  const { data, error } = await serviceSupabase().from('records_mailing_intents').select('*').eq('id', intentId).maybeSingle()
  if (error) throw new Error(`Unable to load mailing intent: ${error.message}`)
  return (data as RecordsMailingIntent | null) ?? null
}

export async function updateIntent(intentId: string, update: Partial<Pick<RecordsMailingIntent, 'status' | 'stripe_session_id' | 'stripe_payment_intent_id' | 'provider_order_id' | 'tracking_number' | 'error_message'>>): Promise<void> {
  const { error } = await serviceSupabase().from('records_mailing_intents').update(update).eq('id', intentId)
  if (error) throw new Error(`Unable to update mailing intent: ${error.message}`)
}

function pricingKeyForMailClass(mailClass: ApprovedArtifact['mailingClass']): PricingKey {
  if (mailClass === 'certified') return 'certified'
  if (mailClass === 'registered') return 'registered'
  return 'standard'
}

export function calculateServerPrice(workflowId: string, mailClass: ApprovedArtifact['mailingClass'], pageCount: number): { totalCents: number; quoteSnapshot: string | null } {
  const profile = getWorkflowPricingProfile(workflowId)
  const pricingKey = pricingKeyForMailClass(mailClass)
  if (!profile || profile.commercialStatus !== 'production') return { totalCents: PRICES[pricingKey], quoteSnapshot: null }
  const quote = calculateQuote({ workflowId, verticalId: profile.verticalId, actualPages: Math.max(1, pageCount), mailClass: pricingKey as MailClass })
  return { totalCents: quote.totalCents, quoteSnapshot: serializeQuote(quote) }
}

async function stripeRequest(path: string, init: RequestInit = {}): Promise<Record<string, any>> {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) throw new Error('Stripe is not configured.')
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: { authorization: `Bearer ${secret}`, ...(init.headers || {}) },
  })
  const payload = await response.json() as Record<string, any>
  if (!response.ok) throw new Error(payload?.error?.message || `Stripe request failed (${response.status}).`)
  return payload
}

export async function createCheckoutSession(ownerId: string, approval: RecordsApproval, origin: string): Promise<{ checkoutUrl: string; sessionId: string; intentId: string }> {
  const { bytes } = await attestRecordsRequestPdf(approval.artifact_json)
  const price = calculateServerPrice(approval.workflow_id, approval.artifact_json.mailingClass, 1)
  const supabase = serviceSupabase()
  const { data: intent, error } = await supabase.from('records_mailing_intents').insert({
    owner_id: ownerId,
    workflow_id: approval.workflow_id,
    approval_id: approval.id,
    status: 'approved',
    mailing_method: approval.artifact_json.mailingClass,
    stripe_price_cents: price.totalCents,
    quote_snapshot: price.quoteSnapshot,
  }).select('id').single()
  if (error || !intent) throw new Error(`Unable to create mailing intent: ${error?.message || 'unknown error'}`)

  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.set('payment_method_types[0]', 'card')
  params.set('line_items[0][price_data][currency]', 'usd')
  params.set('line_items[0][price_data][product_data][name]', `Records Request — ${approval.workflow_id}`)
  params.set('line_items[0][price_data][product_data][description]', `${approval.artifact_json.agency} · ${approval.artifact_json.subject}`.slice(0, 500))
  params.set('line_items[0][price_data][unit_amount]', String(price.totalCents))
  params.set('line_items[0][quantity]', '1')
  params.set('metadata[mailing_intent_id]', intent.id)
  params.set('metadata[owner_user_id]', ownerId)
  params.set('metadata[workflow_id]', approval.workflow_id)
  params.set('metadata[approval_id]', approval.id)
  params.set('payment_intent_data[metadata][mailing_intent_id]', intent.id)
  params.set('payment_intent_data[metadata][owner_user_id]', ownerId)
  params.set('success_url', `${origin}/workflows/${encodeURIComponent(approval.workflow_id)}?checkout=success&session_id={CHECKOUT_SESSION_ID}`)
  params.set('cancel_url', `${origin}/workflows/${encodeURIComponent(approval.workflow_id)}?checkout=cancelled`)

  try {
    const session = await stripeRequest('/v1/checkout/sessions', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: params.toString() })
    if (!session.id || !session.url) throw new Error('Stripe returned an incomplete checkout session.')
    await updateIntent(intent.id, { stripe_session_id: String(session.id) })
    void bytes
    return { checkoutUrl: String(session.url), sessionId: String(session.id), intentId: String(intent.id) }
  } catch (checkoutError) {
    await updateIntent(intent.id, { status: 'failed', error_message: checkoutError instanceof Error ? checkoutError.message : 'Stripe checkout failed.' })
    throw checkoutError
  }
}

export async function retrieveStripeSession(sessionId: string): Promise<Record<string, any>> {
  return stripeRequest(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}`)
}

export async function fulfillRecordsIntent(intentId: string, sessionId: string, paymentIntentId: string | null): Promise<{ success: boolean; providerOrderId?: string; trackingNumber?: string; idempotent?: boolean; error?: string }> {
  const intent = await loadIntent(intentId)
  if (!intent) return { success: false, error: 'Mailing intent not found.' }
  if (intent.provider_order_id) return { success: true, providerOrderId: intent.provider_order_id, trackingNumber: intent.tracking_number || undefined, idempotent: true }
  if (intent.stripe_session_id && intent.stripe_session_id !== sessionId) return { success: false, error: 'Stripe session does not match the mailing intent.' }

  const approval = await loadApprovalForOwner(intent.approval_id, intent.owner_id)
  if (!approval) return { success: false, error: 'Approved artifact is unavailable or revoked.' }
  const artifactHash = await hashApprovedArtifact(approval.artifact_json)
  const recipientHash = await hashRecipient(approval.recipient_json)
  const pdf = await attestRecordsRequestPdf(approval.artifact_json)
  if (artifactHash !== approval.artifact_hash || recipientHash !== approval.recipient_hash || pdf.sha256 !== approval.document_sha256) {
    return { success: false, error: 'Approved artifact integrity verification failed.' }
  }

  await updateIntent(intent.id, { status: 'paid', stripe_session_id: sessionId, stripe_payment_intent_id: paymentIntentId })
  const endpoint = process.env.MAILMYPDF_API_URL
  const apiKey = process.env.MAILMYPDF_API_KEY
  if (!endpoint || !apiKey) {
    await updateIntent(intent.id, { status: 'failed', error_message: 'MailMyPDF fulfillment is not configured.' })
    return { success: false, error: 'MailMyPDF fulfillment is not configured.' }
  }
  try {
    const result = await createMailMyPDFFulfillment(fetch, endpoint, apiKey).submit({
      requestId: approval.artifact_json.requestId,
      idempotencyKey: `stripe:${sessionId}`,
      recipient: {
        name: approval.recipient_json.name,
        address1: approval.recipient_json.address1,
        address2: approval.recipient_json.address2 || undefined,
        city: approval.recipient_json.city,
        state: approval.recipient_json.state,
        postalCode: approval.recipient_json.zip,
      },
      document: {
        filename: `records-request-${approval.artifact_json.requestId}.pdf`,
        contentBase64: bytesToBase64(pdf.bytes),
      },
      mailingClass: approval.artifact_json.mailingClass,
    })
    await updateIntent(intent.id, { status: 'submitted', provider_order_id: result.submissionId, tracking_number: result.trackingNumber || null, error_message: null })
    return { success: true, providerOrderId: result.submissionId, trackingNumber: result.trackingNumber }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MailMyPDF fulfillment failed.'
    await updateIntent(intent.id, { status: 'failed', error_message: message })
    return { success: false, error: message }
  }
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

export async function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string, nowMs = Date.now()): Promise<boolean> {
  const parts = signatureHeader.split(',').map(part => part.trim())
  const timestamp = parts.find(part => part.startsWith('t='))?.slice(2)
  const signatures = parts.filter(part => part.startsWith('v1=')).map(part => part.slice(3))
  if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) return false
  if (Math.abs(Math.floor(nowMs / 1000) - Number(timestamp)) > 300) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`))
  const expected = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  return signatures.some(signature => safeEqualHex(expected, signature))
}
