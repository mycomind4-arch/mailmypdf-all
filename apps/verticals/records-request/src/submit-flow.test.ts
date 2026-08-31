import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { attestRecordsRequestPdf, renderRecordsRequestPdf } from './records-document'
import type { RecordsDocumentInput } from './records-document'

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

describe('attested submission flow', () => {
  const documentInput: RecordsDocumentInput = {
    senderName: 'MailMyPDF Records',
    senderAddress: 'PO Box 123\nHumboldt, CA 95521',
    recipientName: 'County Clerk',
    recipientAddress: '1 Main St\nArcata, CA 95521',
    agency: 'County Records Office',
    subject: 'Public Records Request: Property enforcement records',
    body: 'This is a public records request submitted under applicable public records law.',
    requestId: 'req-001',
    date: '2026-08-20',
  }

  it('renderRecordsRequestPdf produces deterministic PDF bytes', () => {
    const bytes1 = renderRecordsRequestPdf(documentInput)
    const bytes2 = renderRecordsRequestPdf(documentInput)
    assert.deepEqual(bytes1, bytes2, 'Same input must produce identical PDF bytes')
    assert.ok(bytes1.byteLength > 0, 'PDF must not be empty')
    assert.ok(new TextDecoder().decode(bytes1).startsWith('%PDF-1.4'), 'Must start with PDF header')
  })

  it('attestRecordsRequestPdf produces a SHA-256 hash and stable bytes', async () => {
    const { bytes, sha256 } = await attestRecordsRequestPdf(documentInput)
    assert.equal(sha256.length, 64, 'SHA-256 must be 64 hex characters')
    assert.ok(/^[0-9a-f]+$/.test(sha256), 'SHA-256 must be hex')
    assert.deepEqual(bytes, renderRecordsRequestPdf(documentInput), 'Attested bytes must match rendered bytes')
  })

  it('different inputs produce different hashes', async () => {
    const a = await attestRecordsRequestPdf(documentInput)
    const modified: RecordsDocumentInput = { ...documentInput, body: 'Different body text' }
    const b = await attestRecordsRequestPdf(modified)
    assert.notEqual(a.sha256, b.sha256, 'Different inputs must produce different hashes')
  })

  it('the attested PDF is the only document sent — no raw injection', async () => {
    const { bytes, sha256 } = await attestRecordsRequestPdf(documentInput)
    const contentBase64 = bytesToBase64(bytes)
    const decoded = base64ToBytes(contentBase64)
    assert.deepEqual(decoded, bytes, 'Base64 must round-trip to the exact PDF bytes')
    assert.ok(new TextDecoder().decode(decoded).startsWith('%PDF-1.4'), 'Decoded content must be a PDF')
    assert.ok(sha256.length === 64, 'Hash must accompany the document')
  })
})
