import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
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

  it('uploads the approved document then creates an idempotent communication', async () => {
    const calls: Request[] = []
    const fetcher: typeof fetch = async (url, init) => {
      const req = new Request(url, init)
      calls.push(req)
      if (String(url).endsWith('/v1/documents')) {
        return Response.json({ document: { id: 'doc-1' } })
      }
      return Response.json({ id: 'sub-1', tracking_number: 'TRACK-1', proof_id: 'proof-1' })
    }

    const adapter = createMailMyPDFFulfillment(fetcher, 'https://mail.example', 'secret')
    const result = await adapter.submit(input)

    assert.equal(result.submissionId, 'sub-1')
    assert.equal(result.trackingNumber, 'TRACK-1')
    assert.equal(calls.length, 2)
    assert.equal(calls[0].url, 'https://mail.example/v1/documents')
    assert.equal(calls[1].url, 'https://mail.example/v1/communications')
    assert.equal(calls[0].headers.get('authorization'), 'Bearer secret')
    assert.equal(calls[1].headers.get('authorization'), 'Bearer secret')
    assert.equal(calls[1].headers.get('idempotency-key'), 'records-req-1')
    const communicationBody = await calls[1].clone().json() as Record<string, any>
    assert.equal(communicationBody.document_id, 'doc-1')
    assert.equal(communicationBody.mail_type, 'certified')
    assert.equal(communicationBody.recipient.postal_code, '95521')
  })

  it('rejects missing idempotency keys before calling the provider', async () => {
    let called = false
    const fetcher: typeof fetch = async () => {
      called = true
      return Response.json({})
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

  it('rejects incomplete document responses before attempting a communication', async () => {
    const fetcher: typeof fetch = async () => Response.json({ document: {} })
    const adapter = createMailMyPDFFulfillment(fetcher, 'https://mail.example', 'secret')
    await assert.rejects(() => adapter.submit(input), /missing document id/)
  })
})
