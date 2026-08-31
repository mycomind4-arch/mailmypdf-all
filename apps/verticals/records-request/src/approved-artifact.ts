import type { RecordsDocumentInput } from './records-document'

export type ApprovedArtifact = RecordsDocumentInput & {
  mailingClass: 'certified' | 'registered' | 'first_class'
}

export function canonicalizeApprovedArtifact(input: ApprovedArtifact): string {
  return JSON.stringify({
    senderName: input.senderName,
    senderAddress: input.senderAddress,
    recipientName: input.recipientName,
    recipientAddress: input.recipientAddress,
    agency: input.agency,
    subject: input.subject,
    body: input.body,
    requestId: input.requestId,
    date: input.date,
    mailingClass: input.mailingClass,
  })
}

export async function hashApprovedArtifact(input: ApprovedArtifact): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalizeApprovedArtifact(input))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
