import { describe, expect, it } from 'vitest'
import assert from "node:assert/strict";
import { attestApprovedDocument, sha256Hex } from './document-integrity'

describe('approved document integrity', () => {
  it('produces a stable SHA-256 attestation', async () => {
    const bytes = new TextEncoder().encode('example-pdf-bytes')
    const result = await attestApprovedDocument({ bytes, contentType: 'application/pdf', fileName: 'request.pdf' })
    assert.equal(result.sha256, await sha256Hex(bytes))
    assert.equal(result.byteLength, bytes.byteLength)
  })

  it('rejects non-PDF and empty documents', async () => {
    await assert.rejects(() => attestApprovedDocument({ bytes: new Uint8Array([1]), contentType: 'application/pdf', fileName: 'request.txt' }))
    await assert.rejects(() => attestApprovedDocument({ bytes: new Uint8Array(), contentType: 'application/pdf', fileName: 'request.pdf' }))
  })
})
