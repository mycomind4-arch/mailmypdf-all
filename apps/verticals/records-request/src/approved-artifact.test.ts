import { describe, expect, it } from 'vitest'
import { canonicalizeApprovedArtifact, hashApprovedArtifact, type ApprovedArtifact } from './approved-artifact'

const artifact = (): ApprovedArtifact => ({
  senderName: 'MailMyPDF Records',
  senderAddress: 'PO Box 123\nHumboldt, CA 95521',
  recipientName: 'City Clerk',
  recipientAddress: '123 Main St\nArcata, CA 95521',
  agency: 'City of Arcata',
  subject: 'Public Records Request: Code Enforcement',
  body: 'Please provide responsive records.',
  requestId: 'req-1',
  date: '2026-08-25',
  mailingClass: 'certified',
})

describe('approved artifact integrity', () => {
  it('produces deterministic canonical content and hash', async () => {
    const first = artifact()
    const second = { ...first }
    expect(canonicalizeApprovedArtifact(first)).toBe(canonicalizeApprovedArtifact(second))
    expect(await hashApprovedArtifact(first)).toBe(await hashApprovedArtifact(second))
  })

  it('changes the hash when a material approved field changes', async () => {
    const original = artifact()
    const changed = { ...original, body: 'Please provide different responsive records.' }
    expect(await hashApprovedArtifact(original)).not.toBe(await hashApprovedArtifact(changed))
  })

  it('binds mailing class into the approved artifact hash', async () => {
    const original = artifact()
    const changed = { ...original, mailingClass: 'registered' as const }
    expect(await hashApprovedArtifact(original)).not.toBe(await hashApprovedArtifact(changed))
  })
})
