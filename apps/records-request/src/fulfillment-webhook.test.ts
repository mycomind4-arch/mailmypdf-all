import { describe, expect, it } from 'vitest'
import { signFulfillmentWebhook, verifyFulfillmentWebhook } from './fulfillment-webhook'

describe('fulfillment webhook signatures', () => {
  it('accepts an authentic signature and rejects tampering', async () => {
    const secret = 'test-secret'
    const body = JSON.stringify({ eventId: 'evt-1', requestId: 'req-1', status: 'delivered' })
    const signature = await signFulfillmentWebhook(secret, body)
    expect(await verifyFulfillmentWebhook(secret, body, signature)).toBe(true)
    expect(await verifyFulfillmentWebhook(secret, body + 'x', signature)).toBe(false)
    expect(await verifyFulfillmentWebhook('wrong', body, signature)).toBe(false)
  })
})
