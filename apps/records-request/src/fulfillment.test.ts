import { describe, expect, it } from 'vitest'
import assert from "node:assert/strict";
import { createMailMyPDFFulfillment } from './fulfillment'

describe('MailMyPDF fulfillment adapter', () => {
  const input = {
    requestId: 'req-1',
    idempotencyKey: 'records-req-1',
    recipient: {
      name: 'County Clerk',
      address1: '1 Main St',
      city: 'Arcata',
      state: 'CA',
      postalCode: '95521',
    },
    document: { filename: 'request.pdf', contentBase64: 'ZmFrZQ==' },
    mailingClass: 'certified' as const,
  }

  it('sends authenticated JSON with mandatory idempotency and returns provider submission data', async () => {
    const calls: Request[] = []
    const fetcher: typeof fetch = async (url, init) => {
      const req = new Request(url, init)
      calls.push(req)
      return new Response(JSON.stringify({ provider: 'mailmypdf', submissionId: 'sub-1', trackingNumber: 'TRACK-1', proofId: 'proof-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    const adapter = createMailMyPDFFulfillment(fetcher, 'https://mail.example', 'secret')
    const result = await adapter.submit(input)

    assert.equal(result.submissionId, 'sub-1')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].headers.get('authorization'), 'Bearer secret')
    assert.equal(calls[0].headers.get('idempotency-key'), 'records-req-1')
    assert.equal(calls[0].method, 'POST')
  })

  it('rejects missing idempotency keys before calling the provider', async () => {
    let called = false
    const fetcher: typeof fetch = async () => {
      called = true
      return new Response('{}', { status: 200 })
    }
    const adapter = createMailMyPDFFulfillment(fetcher, 'https://mail.example', 'secret')
    await assert.rejects(() => adapter.submit({ ...input, idempotencyKey: '' }), /idempotencyKey is required/)
    assert.equal(called, false)
  })

  it('rejects non-success provider responses', async () => {
    const fetcher: typeof fetch = async () => new Response('bad gateway', { status: 502 })
    const adapter = createMailMyPDFFulfillment(fetcher, 'https://mail.example', 'secret')
    await assert.rejects(() => adapter.submit(input), /HTTP 502/)
  })

  it('rejects incomplete provider responses', async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({ provider: 'mailmypdf' }), { status: 200 })
    const adapter = createMailMyPDFFulfillment(fetcher, 'https://mail.example', 'secret')
    await assert.rejects(() => adapter.submit(input), /missing required submission data/)
  })
})
