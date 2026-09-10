import { describe, expect, it } from 'vitest'
import {
  buildApprovedArtifact,
  calculateServerPrice,
  normalizeRecipient,
  recipientDisplayAddress,
  verifyStripeSignature,
} from './commerce.server'

async function stripeSignature(secret: string, timestamp: number, rawBody: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

describe('Records commerce security primitives', () => {
  it('normalizes and validates structured US recipients', () => {
    const recipient = normalizeRecipient({
      name: ' County Clerk ',
      address1: '825 5th Street',
      city: 'Eureka',
      state: 'ca',
      zip: '95501',
    })
    expect(recipient.state).toBe('CA')
    expect(recipient.country).toBe('US')
    expect(recipientDisplayAddress(recipient)).toContain('Eureka, CA 95501')
    expect(() => normalizeRecipient({ ...recipient, zip: 'bad' })).toThrow(/ZIP/)
  })

  it('builds the immutable artifact from the structured recipient rather than trusting display address fields', () => {
    const recipient = normalizeRecipient({ name: 'County Clerk', address1: '825 5th Street', city: 'Eureka', state: 'CA', zip: '95501' })
    const artifact = buildApprovedArtifact({
      senderName: 'Requester',
      senderAddress: '1 Pine St\nArcata, CA 95521',
      recipientName: 'tampered name',
      recipientAddress: 'tampered address',
      agency: 'Humboldt County',
      subject: 'Public Records Request',
      body: 'Please produce the requested records described in this approved request.',
      requestId: 'req-123',
      date: '2026-09-09',
    }, recipient, 'certified')
    expect(artifact.recipientName).toBe('County Clerk')
    expect(artifact.recipientAddress).toContain('825 5th Street')
    expect(artifact.recipientAddress).not.toContain('tampered')
    expect(artifact.mailingClass).toBe('certified')
  })

  it('falls back to canonical mailing-only pricing when a workflow has no production pricing profile', () => {
    expect(calculateServerPrice('unknown-records-workflow', 'first_class', 1).totalCents).toBe(499)
    expect(calculateServerPrice('unknown-records-workflow', 'certified', 1).totalCents).toBe(1494)
    expect(calculateServerPrice('unknown-records-workflow', 'registered', 1).totalCents).toBe(3249)
  })

  it('verifies Stripe signatures and rejects stale or altered payloads', async () => {
    const secret = 'whsec_records_test'
    const rawBody = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' })
    const nowMs = Date.UTC(2026, 8, 9, 20, 0, 0)
    const timestamp = Math.floor(nowMs / 1000)
    const signature = await stripeSignature(secret, timestamp, rawBody)
    const header = `t=${timestamp},v1=${signature}`
    await expect(verifyStripeSignature(rawBody, header, secret, nowMs)).resolves.toBe(true)
    await expect(verifyStripeSignature(`${rawBody}x`, header, secret, nowMs)).resolves.toBe(false)
    await expect(verifyStripeSignature(rawBody, header, secret, nowMs + 301_000)).resolves.toBe(false)
  })
})
