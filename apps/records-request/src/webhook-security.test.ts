import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { signFulfillmentWebhook, verifyFulfillmentWebhook } from './fulfillment-webhook'

const SECRET = 'test-webhook-secret'
const RAW_BODY = JSON.stringify({
  eventId: 'evt-1',
  requestId: 'req-1',
  status: 'delivered',
  trackingNumber: 'TRK-1',
  proofId: 'PRF-1',
})

describe('webhook authentication security', () => {
  it('accepts a valid HMAC-SHA256 signature', async () => {
    const signature = await signFulfillmentWebhook(SECRET, RAW_BODY)
    const valid = await verifyFulfillmentWebhook(SECRET, RAW_BODY, signature)
    assert.equal(valid, true)
  })

  it('rejects a tampered body', async () => {
    const signature = await signFulfillmentWebhook(SECRET, RAW_BODY)
    const tampered = RAW_BODY.replace('"delivered"', '"failed"')
    const valid = await verifyFulfillmentWebhook(SECRET, tampered, signature)
    assert.equal(valid, false)
  })

  it('rejects a wrong secret', async () => {
    const signature = await signFulfillmentWebhook('wrong-secret', RAW_BODY)
    const valid = await verifyFulfillmentWebhook(SECRET, RAW_BODY, signature)
    assert.equal(valid, false)
  })

  it('rejects an empty signature', async () => {
    const valid = await verifyFulfillmentWebhook(SECRET, RAW_BODY, '')
    assert.equal(valid, false)
  })

  it('rejects an empty secret', async () => {
    const valid = await verifyFulfillmentWebhook('', RAW_BODY, 'some-signature')
    assert.equal(valid, false)
  })

  it('rejects a truncated signature', async () => {
    const signature = await signFulfillmentWebhook(SECRET, RAW_BODY)
    const valid = await verifyFulfillmentWebhook(SECRET, RAW_BODY, signature.slice(0, 10))
    assert.equal(valid, false)
  })
})
