/**
 * MailMyPDF Business domain contracts.
 *
 * These contracts intentionally mirror the canonical MailMyPDF mailing
 * concepts: Address, Document, Recipient, MailJob, TrackingEvent,
 * ProofOfMailing and immutable audit events. SMB-specific scheduling,
 * contacts, templates and automation are composed around those primitives.
 *
 * The contracts remain vendor-agnostic: Lob, Stripe, Supabase and workflow
 * providers must never leak into the domain layer.
 */

export type MailClass = 'standard' | 'certified' | 'registered'
export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer'
export type MailJobStatus =
  | 'draft'
  | 'validated'
  | 'payment_pending'
  | 'payment_complete'
  | 'queued'
  | 'scheduled'
  | 'submitted'
  | 'accepted'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'archived'
  | 'failed'
  | 'cancelled'
  | 'refunded'
export type TriggerType = 'date' | 'recurring' | 'event' | 'condition'

export interface Address {
  name: string
  line1: string
  line2?: string | null
  city: string
  state: string
  postalCode: string
  country: string
  verified: boolean
  verificationLevel?: 'verified' | 'deliverable' | 'undeliverable' | 'unknown'
}

export interface Business {
  id: string
  name: string
  timezone: string
  members: { userId: string; role: OrganizationRole; addedAt?: string }[]
  createdAt: string
}

export interface Contact {
  id: string
  businessId: string
  name: string
  company?: string
  email?: string
  phone?: string
  address: Address
  tags: string[]
  referenceNumber?: string
  createdAt?: string
}

export interface Document {
  id: string
  fileName: string
  sizeBytes: number
  contentType: string
  pageCount: number
  sha256?: string
  storagePath: string
  source: 'upload' | 'generated' | 'template'
  templateId?: string
  createdAt: string
}

export interface Recipient {
  id: string
  address: Address
  referenceNumber?: string
  legalReference?: { citation: string; description: string; responseWindowDays?: number }
}

export interface Template {
  id: string
  businessId: string
  name: string
  description?: string
  body: string
  variables: string[]
  defaultMailClass: MailClass
  active: boolean
}

export interface Condition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists'
  value: string | number | boolean
}

export type WorkflowAction =
  | { type: 'generate_document'; templateId: string }
  | { type: 'require_approval'; approverRole?: OrganizationRole }
  | { type: 'send_mail'; mailClass: MailClass }
  | { type: 'wait'; durationSeconds: number }
  | { type: 'stop_if'; conditions: Condition[] }
  | { type: 'notify'; channel: 'email' | 'in_app' }

export interface Trigger {
  type: TriggerType
  at?: string
  timezone?: string
  rrule?: string
  eventName?: string
  conditions?: Condition[]
}

export interface Schedule {
  id: string
  businessId: string
  name: string
  trigger: Trigger
  actions: WorkflowAction[]
  status: 'active' | 'paused' | 'draft'
  nextRunAt?: string
  lastRunAt?: string
  createdAt: string
}

export interface Pricing {
  baseCents: number
  colorSurchargeCents: number
  deliverySurchargeCents: number
  totalCents: number
  currency: string
}

export interface PaymentInfo {
  sessionId?: string
  paymentIntentId?: string
  paidAt?: string
  amountCents: number
  currency: string
}

export interface TrackingInfo {
  providerLetterId?: string
  carrier: string
  trackingNumber: string
  status: string
  events: TrackingEvent[]
}

export interface TrackingEvent {
  id: string
  mailJobId: string
  eventType: string
  carrier: string
  trackingNumber: string
  timestamp: string
  location?: string
  rawPayload?: Record<string, unknown>
}

export interface CustodyChainEvent {
  eventType: string
  description: string
  timestamp: string
  eventHash: string
  priorEventHash: string | null
}

export interface ProofOfMailing {
  id: string
  mailJobId: string
  trackingNumber: string
  carrier?: string
  mailClass?: string
  documentSha256: string
  sentAt: string
  deliveredAt?: string | null
  returnedAt?: string | null
  custodyChain: CustodyChainEvent[]
  generatedAt: string
}

export interface MailJob {
  id: string
  businessId: string
  lookupToken: string
  status: MailJobStatus
  recipient: Contact
  document: Document
  sender: Address
  mailClass: MailClass
  color: boolean
  pricing?: Pricing
  payment?: PaymentInfo
  scheduledAt?: string | null
  submittedAt?: string
  deliveredAt?: string
  tracking?: TrackingInfo
  proofOfMailing?: ProofOfMailing
  createdAt: string
  updatedAt: string
}

export type AuditEventType =
  | 'document_uploaded'
  | 'document_hashed'
  | 'address_validated'
  | 'mail_queued'
  | 'mail_scheduled'
  | 'mail_submitted'
  | 'mail_accepted'
  | 'tracking_updated'
  | 'mail_delivered'
  | 'mail_returned'
  | 'proof_generated'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_rejected'
  | 'status_changed'

export interface AuditEvent {
  id: string
  mailJobId?: string
  eventType: AuditEventType
  actor: 'system' | 'user' | 'admin' | 'scheduled_job' | 'api_call'
  timestamp: string
  metadata?: Record<string, unknown>
}
