/**
 * Compatibility boundary for MailMyPDF platform contracts.
 *
 * Keep Records-specific code dependent on these narrow interfaces until the
 * platform packages are consumed directly as workspace/published packages.
 * Do not copy platform implementations into this vertical.
 */

export type PlatformActor = 'user' | 'system' | 'ai' | 'external'

export type ProofArtifactKind =
  | 'document'
  | 'correspondence'
  | 'attachment'
  | 'receipt'
  | 'tracking'
  | 'delivery'
  | 'other'

export interface PlatformProofArtifact {
  id: string
  kind: ProofArtifactKind
  sha256?: string
  createdAt: string
  sourceId?: string
}

export interface PlatformAuditEvent {
  id: string
  type: string
  occurredAt: string
  actor: PlatformActor
  subjectId: string
  metadata: Record<string, string>
}

export interface PlatformProofPacket {
  id: string
  subjectId: string
  artifacts: readonly PlatformProofArtifact[]
  events: readonly PlatformAuditEvent[]
  createdAt: string
}

export interface PlatformMailingRequest {
  id: string
  recipient: { name: string; address: string }
  documentId: string
  mailingClass: 'standard' | 'certified' | 'registered'
  scheduledFor?: string
}

export interface PlatformMailingStatus {
  id: string
  state:
    | 'draft'
    | 'scheduled'
    | 'submitted'
    | 'in-transit'
    | 'delivered'
    | 'failed'
    | 'cancelled'
  trackingNumber?: string
  updatedAt: string
}

export interface PlatformFulfillmentClient {
  createMailing(request: PlatformMailingRequest): Promise<PlatformMailingStatus>
  getMailing(id: string): Promise<PlatformMailingStatus>
}
