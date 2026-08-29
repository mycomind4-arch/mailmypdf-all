import { describe, expect, it } from 'vitest'
import { attestRecordsRequestPdf, renderRecordsRequestPdf } from './records-document'

describe('records request PDF', () => {
  const input = {
    senderName: 'Jane Doe',
    senderAddress: '1 Main St',
    recipientName: 'City Clerk',
    recipientAddress: '2 Civic Plaza',
    agency: 'Example City',
    subject: 'Public Records Request',
    body: 'Please provide responsive records.\nThank you.',
    requestId: 'req-test-1',
    date: '2026-08-20',
  }

  it('produces a non-empty PDF with a PDF signature', () => {
    const bytes = renderRecordsRequestPdf(input)
    expect(bytes.length).toBeGreaterThan(100)
    expect(new TextDecoder().decode(bytes.slice(0, 8))).toBe('%PDF-1.4')
  })

  it('produces stable SHA-256 for identical content', async () => {
    const a = await attestRecordsRequestPdf(input)
    const b = await attestRecordsRequestPdf(input)
    expect(a.sha256).toHaveLength(64)
    expect(a.sha256).toBe(b.sha256)
    expect(Array.from(a.bytes)).toEqual(Array.from(b.bytes))
  })

  it('changes the digest when substantive content changes', async () => {
    const a = await attestRecordsRequestPdf(input)
    const b = await attestRecordsRequestPdf({ ...input, body: 'Different request text.' })
    expect(a.sha256).not.toBe(b.sha256)
  })
})
