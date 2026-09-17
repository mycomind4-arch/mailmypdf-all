import type { PlatformId } from "@mailmypdf/core";

export type MailingClass = "standard" | "certified" | "registered";

export interface MailingRequest {
  id: PlatformId;
  recipient: { name: string; address: string };
  documentId: PlatformId;
  mailingClass: MailingClass;
  scheduledFor?: string;
}

/** Canonical internal provider status vocabulary. */
export type CanonicalMailingStatus =
  | "draft"
  | "paid"
  | "submitted"
  | "provider_processing"
  | "mailed"
  | "in_transit"
  | "delivered"
  | "returned"
  | "undeliverable"
  | "refused"
  | "failed"
  | "cancelled"
  | "refunded";

/**
 * Existing public fulfillment type retained for compatibility with callers
 * that use the package's historical hyphenated in-transit state.
 */
export interface MailingStatus {
  id: PlatformId;
  state: "draft" | "scheduled" | "submitted" | "in-transit" | "delivered" | "failed" | "cancelled";
  trackingNumber?: string;
  updatedAt: string;
}

/**
 * Canonical provider status normalization for MailMyPDF communication
 * responses. Unknown provider values fail closed rather than being silently
 * mapped into a misleading successful state.
 */
export function normalizeMailMyPDFStatus(status: unknown): CanonicalMailingStatus {
  switch (status) {
    case "created":
    case "submitted": return "submitted";
    case "rendered":
    case "processed":
    case "printed": return "provider_processing";
    case "mailed":
    case "sent": return "mailed";
    case "in_transit":
    case "in-transit": return "in_transit";
    case "delivered": return "delivered";
    case "returned":
    case "returned_to_sender": return "returned";
    case "undelivered": return "undeliverable";
    case "refused": return "refused";
    case "failed":
    case "error": return "failed";
    case "cancelled":
    case "canceled": return "cancelled";
    case "refunded": return "refunded";
    default: throw new Error(`Unknown MailMyPDF fulfillment status: ${String(status)}`);
  }
}

export interface MailMyPdfFulfillmentClient {
  createMailing(request: MailingRequest): Promise<MailingStatus>;
  getMailing(id: PlatformId): Promise<MailingStatus>;
}

export interface PostalAddress {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal: string;
  country?: string;
}

export type AddressDeliverability =
  | "deliverable"
  | "deliverable_missing_unit"
  | "deliverable_unnecessary_unit"
  | "undeliverable"
  | "missing_information";

export interface AddressVerificationResult {
  deliverability: AddressDeliverability;
  isDeliverable: boolean;
  warnings: readonly string[];
  standardized?: Omit<PostalAddress, "name"> | null;
  provider?: string;
  providerReference?: string;
}

export interface AddressVerificationProvider {
  readonly name: string;
  verify(address: PostalAddress): Promise<AddressVerificationResult>;
}

export function preflightPostalAddress(address: PostalAddress): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const field of ["name", "line1", "city", "state", "postal"] as const) {
    if (!String(address[field] ?? "").trim()) errors.push(`Missing required field: ${field}`);
  }
  const country = (address.country ?? "US").toUpperCase();
  if (country === "US") {
    if (address.postal && !/^\d{5}(?:-\d{4})?$/.test(address.postal.trim())) warnings.push("US ZIP code should contain 5 digits or ZIP+4");
    if (address.state && !/^[A-Za-z]{2}$/.test(address.state.trim())) warnings.push("US state should be a 2-letter abbreviation");
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function isDeliverableAddress(result: AddressVerificationResult): boolean {
  return result.isDeliverable &&
    ["deliverable", "deliverable_missing_unit", "deliverable_unnecessary_unit"].includes(result.deliverability);
}

export async function verifyAddressForMailing(
  address: PostalAddress,
  provider: AddressVerificationProvider,
): Promise<AddressVerificationResult> {
  const preflight = preflightPostalAddress(address);
  if (!preflight.valid) {
    return {
      deliverability: "missing_information",
      isDeliverable: false,
      warnings: [...preflight.errors, ...preflight.warnings],
      provider: provider.name,
    };
  }
  const result = await provider.verify(address);
  if (![
    "deliverable",
    "deliverable_missing_unit",
    "deliverable_unnecessary_unit",
    "undeliverable",
    "missing_information",
  ].includes(result.deliverability)) {
    throw new Error("Address verification provider returned an unknown deliverability state");
  }
  return { ...result, warnings: [...preflight.warnings, ...result.warnings] };
}

export * from "./address-verification.js";
export * from "./lob-provider.js";
export * from "./recipient-resolution.js";
