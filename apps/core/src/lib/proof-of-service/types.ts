/**
 * Proof-of-Service API — Type definitions.
 *
 * These types define the shape of the Proof-of-Service layer that sits
 * on top of the existing MailMyPDF infrastructure. They are decoupled from
 * any specific vertical (HOA, FDCPA, etc.) — callers provide
 * legal context via `legal_reference` and `matter_reference`.
 */

export type LegalReferenceType =
  | "statute"
  | "lease_clause"
  | "contract_term"
  | "regulation"
  | "ordinance"
  | "other";

export interface LegalReference {
  type: LegalReferenceType;
  citation: string;
  description: string;
  response_window_days: number | null;
  response_window_ends: string | null;
  notes?: string;
}

export interface Recipient {
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  address_verified: boolean;
  lob_address_id: string | null;
}

export type MailType =
  | "first_class"
  | "certified"
  | "certified_return_receipt"
  | "registered";

export type CommunicationStatus =
  | "created"
  | "sent"
  | "in_transit"
  | "delivered"
  | "undelivered"
  | "returned"
  | "refused"
  | "amended";

export type CustodyEventType =
  | "created"
  | "address_verified"
  | "sent"
  | "in_transit"
  | "delivered"
  | "undelivered"
  | "returned"
  | "refused"
  | "signature_captured"
  | "proof_generated";

export interface CustodyEvent {
  timestamp: string;
  event_type: CustodyEventType;
  description: string;
  carrier_event_id: string | null;
  event_hash: string;
  prior_event_hash: string | null;
}

export interface CommunicationRecord {
  id: string;
  tenant_id: string;
  idempotency_key: string | null;
  document_id: string;
  document_sha256: string;
  legal_reference: LegalReference;
  recipient: Recipient;
  mail_type: MailType;
  carrier: string;
  lob_letter_id: string;
  status: CommunicationStatus;
  tracking_number: string;
  sent_at: string | null;
  delivered_at: string | null;
  signature_image_url: string | null;
  proof_of_delivery: string | null;
  custody_chain: CustodyEvent[];
  prior_record_hash: string | null;
  record_sha256: string;
  matter_reference: string;
  matter_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProofDocument {
  id: string;
  tenant_id: string;
  filename: string;
  mime_type: string;
  sha256: string;
  size_bytes: number;
  storage_path: string;
  source: "uploaded" | "generated_from_template";
  template_id: string | null;
  created_at: string;
}

export type ResponseWindowStatus =
  | "within_window"
  | "window_expired_no_response"
  | "window_expired_response_received"
  | "no_window_specified";

export interface ProofBundle {
  id: string;
  communication_id: string;
  tenant_id: string;
  document_sha256: string;
  document_filename: string;
  sent_at: string | null;
  carrier: string;
  tracking_number: string;
  mail_type: MailType;
  delivered_at: string | null;
  signature_image_url: string | null;
  proof_of_delivery: string | null;
  legal_reference: LegalReference;
  response_window_status: ResponseWindowStatus;
  response_window_ends: string | null;
  custody_chain: CustodyEvent[];
  address_verification: {
    deliverability: string;
    is_deliverable: boolean;
    verified_address: {
      line1: string | null;
      line2: string | null;
      city: string | null;
      state: string | null;
      postal: string | null;
    } | null;
    corrections: Record<string, { input: string; verified: string }> | null;
    warnings: string[];
    api_succeeded: boolean;
  } | null;
  bundle_sha256: string;
  generated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  lob_api_key: string | null;
  created_at: string;
}

export interface ApiKey {
  id: string;
  tenant_id: string;
  key_prefix: string;
  key_hash: string;
  environment: "live" | "test";
  label: string;
  created_at: string;
  revoked_at: string | null;
}

export interface ProofTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  vertical: string;
  body_html: string;
  variables: string[];
  default_legal_reference: LegalReference | null;
  created_at: string;
  updated_at: string;
}

export type WebhookEventType =
  | "communication.created"
  | "communication.sent"
  | "communication.in_transit"
  | "communication.delivered"
  | "communication.undelivered"
  | "communication.returned"
  | "communication.refused"
  | "signature.captured"
  | "response_window.expired"
  | "proof_bundle.ready";

export interface WebhookEvent {
  event_id: string;
  event_type: WebhookEventType;
  timestamp: string;
  data: {
    communication_id: string;
    status: CommunicationStatus;
    delivered_at?: string | null;
    signature_image_url?: string | null;
    tracking_number?: string;
  };
}
