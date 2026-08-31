export type FulfillmentWebhook = {
  eventId: string
  requestId: string
  status: 'delivered' | 'failed' | 'returned' | 'unknown'
  trackingNumber?: string
  proofId?: string
  occurredAt?: string
  payload?: Record<string, unknown>
}

function toBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function signFulfillmentWebhook(secret: string, rawBody: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    toBytes(secret) as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, toBytes(rawBody) as BufferSource)
  return hex(new Uint8Array(signature))
}

export async function verifyFulfillmentWebhook(secret: string, rawBody: string, signature: string): Promise<boolean> {
  if (!secret || !signature) return false
  const expected = await signFulfillmentWebhook(secret, rawBody)
  if (expected.length !== signature.length) return false
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  return mismatch === 0
}
