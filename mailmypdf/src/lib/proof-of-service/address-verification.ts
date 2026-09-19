/**
 * Proof-of-Service — Address Verification
 *
 * The provider contract and Lob HTTP implementation live in
 * @mailmypdf/fulfillment. This adapter maps the shared result into the
 * historical proof-of-service evidence shape and appends a custody event.
 */
import { createLobAddressVerifier } from "@mailmypdf/fulfillment";
import { getConfig } from "@/config";
import type { Recipient } from "./types";
import { appendCustodyEvent } from "./communications";

export interface AddressVerificationResult {
  deliverability:
    | "deliverable"
    | "deliverable_missing_unit"
    | "deliverable_unnecessary_unit"
    | "undeliverable"
    | "missing_information";
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
  raw_response: unknown;
  api_succeeded: boolean;
}

export async function verifyRecipientAddress(
  recipient: Pick<
    Recipient,
    | "name"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "postal_code"
    | "country"
  >,
  options: { tenantLobKey?: string | null } = {},
): Promise<AddressVerificationResult> {
  const lobKey = options.tenantLobKey ?? getConfig().lob.apiKey;

  if (!lobKey) {
    return {
      deliverability: "missing_information",
      is_deliverable: false,
      verified_address: null,
      corrections: null,
      warnings: ["Lob API key not configured — address verification skipped"],
      raw_response: null,
      api_succeeded: false,
    };
  }

  const shared = await createLobAddressVerifier({ apiKey: lobKey }).verify({
    name: recipient.name,
    line1: recipient.address_line1,
    line2: recipient.address_line2,
    city: recipient.city,
    state: recipient.state,
    postal: recipient.postal_code,
    country: recipient.country,
  });

  const corrections: Record<string, { input: string; verified: string }> = {};
  if (shared.corrections?.line1) {
    corrections.line1 = {
      input: recipient.address_line1,
      verified: shared.corrections.line1,
    };
  }
  if (shared.corrections?.line2) {
    corrections.line2 = {
      input: recipient.address_line2 ?? "",
      verified: shared.corrections.line2,
    };
  }
  if (shared.corrections?.city) {
    corrections.city = {
      input: recipient.city,
      verified: shared.corrections.city,
    };
  }
  if (shared.corrections?.state) {
    corrections.state = {
      input: recipient.state,
      verified: shared.corrections.state,
    };
  }
  if (shared.corrections?.postal) {
    corrections.postal = {
      input: recipient.postal_code,
      verified: shared.corrections.postal,
    };
  }

  const deliverability =
    shared.level === "provider_unavailable"
      ? "missing_information"
      : shared.level;

  return {
    deliverability,
    is_deliverable: shared.isDeliverable,
    verified_address: shared.verifiedAddress ?? null,
    corrections: Object.keys(corrections).length ? corrections : null,
    warnings: [...shared.warnings],
    raw_response: shared.rawResponse ?? null,
    api_succeeded: shared.providerSucceeded === true,
  };
}

export async function verifyAndRecord(
  recipient: Recipient,
  communicationId: string,
  tenantId: string,
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
  options: { tenantLobKey?: string | null } = {},
): Promise<AddressVerificationResult> {
  const result = await verifyRecipientAddress(recipient, options);

  const correctionCount = Object.keys(result.corrections ?? {}).length;
  const details = [
    `deliverable=${result.is_deliverable}`,
    correctionCount ? `corrections=${correctionCount}` : null,
    result.warnings.length ? `warnings=${result.warnings.length}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const description = result.api_succeeded
    ? `Recipient address verified via Lob: ${result.deliverability} (${details})`
    : "Address verification attempted but provider unavailable";

  await appendCustodyEvent(
    {
      communication_id: communicationId,
      tenant_id: tenantId,
      event_type: "address_verified",
      description,
      new_status: undefined,
    },
    deps,
  ).catch(() => {
    // Non-blocking here: the verification result is still returned and stored
    // by the caller even if custody-event persistence is temporarily degraded.
  });

  return result;
}
