/**
 * Domain Models for MailMyPDF Document Operations Platform.
 *
 * These types are the canonical language of the application. All
 * application services, controllers, and routes should reference these
 * models instead of vendor-specific types or database row shapes.
 *
 * Existing code that uses OrderStatus / Database types continues to work
 * unchanged — see `status-mapping.ts` for the bridge between the new
 * MailJobStatus and the legacy OrderStatus enum.
 *
 * Design principles:
 * - Domain models are pure types (interfaces), not classes. No behavior.
 * - They are vendor-agnostic — no Lob, Stripe, or Supabase types leak in.
 * - They are the contract between layers: routes → controllers → services.
 * - They can be composed (a MailJob contains a Document, Recipient, etc.)
 */

// ── Address ───────────────────────────────────────────────────────────────────

/**
 * A postal address with optional verification status.
 *
 * Extends the provider-layer PostalAddress with domain-level concerns
 * (verification, correction history) that belong to the application, not
 * to any specific mail provider.
 */
export interface Address {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string; // ISO 3166-1 alpha-2, default "US"
  /** Whether this address has been verified via a provider (Lob, USPS, etc.) */
  verified: boolean;
  /** Verification confidence level, if verification has been attempted. */
  verificationLevel?: AddressVerificationLevel;
  /** Corrections suggested by the verification provider, if any. */
  corrections?: AddressCorrection[];
}

export type AddressVerificationLevel =
  | "verified"
  | "deliverable"
  | "undeliverable"
  | "unknown";

export interface AddressCorrection {
  field: "line1" | "line2" | "city" | "state" | "postalCode";
  original: string;
  corrected: string;
}

// ── Document ──────────────────────────────────────────────────────────────────

/**
 * A document in the MailMyPDF system — uploaded PDF, generated letter,
 * or template-rendered output.
 *
 * The SHA-256 hash is the cryptographic anchor for proof-of-service.
 * The storagePath is the canonical location in the storage provider.
 */
export interface Document {
  id: string;
  fileName: string;
  sizeBytes: number;
  contentType: string;
  pageCount: number;
  /** SHA-256 hash of the document content, computed server-side. */
  sha256?: string;
  /** Canonical storage path (bucket-relative). */
  storagePath: string;
  /** How this document came into existence. */
  source: DocumentSource;
  /** For template-rendered documents, the template ID used. */
  templateId?: string;
  createdAt: string;
}

export type DocumentSource = "upload" | "generated" | "template";

// ── Recipient ──────────────────────────────────────────────────────────────────

/**
 * The party receiving a mail job.
 *
 * Currently wraps an address, but is structured to accommodate future
 * features: organization membership, case/reference numbers, legal
 * jurisdiction context.
 */
export interface Recipient {
  id: string;
  address: Address;
  /** Optional reference number from the sending organization's system. */
  referenceNumber?: string;
  /** Optional legal context (case number, matter ID, etc.) */
  legalReference?: LegalReference;
}

export interface LegalReference {
  /** Statute, code section, or contract clause being satisfied. */
  citation: string;
  /** Human-readable description of what this notice is. */
  description: string;
  /** Response/curative period in days, if applicable. */
  responseWindowDays?: number;
}

// ── Pricing ───────────────────────────────────────────────────────────────────

/**
 * The full pricing breakdown for a mail job.
 *
 * All amounts are in cents (integer) to avoid floating-point issues.
 */
export interface Pricing {
  baseCents: number;
  colorSurchargeCents: number;
  deliverySurchargeCents: number;
  totalCents: number;
  currency: string; // ISO 4217, default "usd"
}

// ── Payment ───────────────────────────────────────────────────────────────────

/**
 * Payment information for a mail job.
 *
 * Populated when the mail job enters the payment_pending state.
 */
export interface PaymentInfo {
  /** Stripe checkout session ID. */
  sessionId?: string;
  /** Stripe payment intent ID. */
  paymentIntentId?: string;
  /** When payment was confirmed. */
  paidAt?: string;
  amountCents: number;
  currency: string;
}

// ── Tracking ───────────────────────────────────────────────────────────────────

/**
 * Tracking information for a mail job that has been submitted to a
 * fulfillment provider.
 */
export interface TrackingInfo {
  /** Provider-specific letter/shipment ID (e.g., Lob letter ID). */
  providerLetterId?: string;
  carrier: string; // "usps", "fedex", etc.
  trackingNumber: string;
  /** Current delivery status from the provider. */
  status: string;
  /** Ordered list of tracking events, oldest first. */
  events: TrackingEvent[];
}

export interface TrackingEvent {
  id: string;
  /** The mail job this event belongs to. */
  mailJobId: string;
  /** Provider-specific event type (e.g., "in_transit", "delivered"). */
  eventType: string;
  carrier: string;
  trackingNumber: string;
  timestamp: string;
  /** Optional geographic location of the event. */
  location?: string;
  /** Raw provider payload, for audit/debugging. */
  rawPayload?: Record<string, unknown>;
}

// ── Audit ──────────────────────────────────────────────────────────────────────

/**
 * An immutable audit event recording a significant action in the system.
 *
 * Audit events are append-only — they must never be edited or deleted.
 * Every state transition, document access, payment, and submission should
 * generate an audit event.
 */
export interface AuditEvent {
  id: string;
  /** The mail job this event relates to (if applicable). */
  mailJobId?: string;
  /** What happened. */
  eventType: AuditEventType;
  /** Who or what triggered the event. */
  actor: AuditActor;
  /** When the event occurred (ISO 8601 UTC). */
  timestamp: string;
  /** Additional context about the event. */
  metadata?: Record<string, unknown>;
}

export type AuditEventType =
  | "document_uploaded"
  | "document_hashed"
  | "address_validated"
  | "pricing_calculated"
  | "payment_initiated"
  | "payment_succeeded"
  | "payment_failed"
  | "mail_queued"
  | "mail_submitted"
  | "mail_accepted"
  | "tracking_updated"
  | "mail_delivered"
  | "mail_returned"
  | "proof_generated"
  | "document_downloaded"
  | "document_deleted"
  | "mail_job_archived"
  | "refund_issued"
  | "status_changed";

export type AuditActor =
  | "system"
  | "user"
  | "admin"
  | "stripe_webhook"
  | "lob_webhook"
  | "scheduled_job"
  | "api_call";

// ── Proof of Mailing ───────────────────────────────────────────────────────────

/**
 * A proof-of-mailing bundle — the verifiable evidence that a notice was
 * sent and delivered.
 *
 * This is the output of the Proof-of-Service infrastructure layer. It
 * contains the cryptographic custody chain and all delivery facts, but
 * no recipient PII or tenant data.
 */
export interface ProofOfMailing {
  id: string;
  mailJobId: string;
  trackingNumber: string;
  carrier: string;
  mailClass: string;
  documentSha256: string;
  sentAt: string;
  deliveredAt?: string | null;
  returnedAt?: string | null;
  /** Cryptographic custody chain (hash-linked events). */
  custodyChain: CustodyChainEvent[];
  /** Legal reference bound to this send, if any. */
  legalReference?: LegalReference;
  /** When this proof bundle was generated. */
  generatedAt: string;
}

export interface CustodyChainEvent {
  eventType: string;
  description: string;
  timestamp: string;
  /** SHA-256 hash of this event's content. */
  eventHash: string;
  /** Hash of the prior event in the chain (null for the first event). */
  priorEventHash: string | null;
}

// ── Mail Job ──────────────────────────────────────────────────────────────────

/**
 * The central domain model — a single unit of mail being processed
 * through the full workflow.
 *
 * A MailJob is the generalized concept that unifies consumer orders,
 * proof-of-service communications, and future document workflows.
 * Existing "orders" in the database map to MailJobs via status-mapping.ts.
 */
export interface MailJob {
  id: string;
  /** A human-readable lookup token (existing orders use lookup_token). */
  lookupToken: string;
  status: MailJobStatus;
  document: Document;
  sender: Address;
  recipient: Recipient;
  mailClass: MailClass;
  color: boolean;
  pricing: Pricing;
  payment?: PaymentInfo;
  tracking?: TrackingInfo;
  proofOfMailing?: ProofOfMailing;
  auditEvents: AuditEvent[];
  /** For scheduled mail jobs (future-self letters, etc.). */
  scheduledDeliveryDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MailClass = "standard" | "certified" | "registered";

/**
 * The MailJob state machine.
 *
 * This is the canonical lifecycle for all mail jobs. The existing
 * OrderStatus enum maps to this via `mapOrderStatusToMailJobStatus()`.
 *
 *   draft → validated → payment_pending → payment_complete → queued
 *     → submitted → accepted → in_transit → delivered → completed → archived
 *
 * Failure paths:
 *   any state → failed
 *   payment_pending → failed (payment failure)
 *
 * Recovery paths:
 *   failed → draft (retry)
 *
 * Cancel/refund paths:
 *   any non-terminal state → cancelled
 *   any paid state → refunded
 */
export type MailJobStatus =
  | "draft"
  | "validated"
  | "payment_pending"
  | "payment_complete"
  | "queued"
  | "submitted"
  | "accepted"
  | "in_transit"
  | "delivered"
  | "completed"
  | "archived"
  | "failed"
  | "cancelled"
  | "refunded";

// ── Organization ──────────────────────────────────────────────────────────────

/**
 * An organization in the MailMyPDF platform.
 *
 * Individual users are modeled as a solo organization (type: "individual").
 * Enterprise tenants (county governments, debt collectors, HOAs) are
 * modeled as "business" or "government" organizations.
 *
 * This is a forward-looking model — the current application does not yet
 * implement multi-tenant organizations beyond the proof-of-service
 * tenant table. This type prepares the domain for Phase 3.
 */
export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  members: OrganizationMember[];
  billing?: OrganizationBilling;
  createdAt: string;
}

export type OrganizationType = "individual" | "business" | "government";

export interface OrganizationMember {
  userId: string;
  role: OrganizationRole;
  addedAt: string;
}

export type OrganizationRole = "owner" | "admin" | "member" | "viewer";

export interface OrganizationBilling {
  plan: "starter" | "professional" | "enterprise";
  stripeCustomerId?: string;
  invoiced: boolean;
}
