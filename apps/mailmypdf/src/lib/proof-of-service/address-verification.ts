/**
 * Proof-of-Service — Address Verification
 *
 * Wraps the existing Lob address validation (src/lib/address-validation.ts)
 * with proof-of-service specific concerns:
 * - Supports per-tenant Lob API keys (falls back to platform key)
 * - Returns a custody-event-compatible result
 * - Stores the verification result in the communication record's metadata
 * - Adds an "address_verified" custody event to the chain
 *
 * The verification is advisory but recorded: even if the address fails
 * verification, the send still proceeds (the sender may have knowledge
 * we don't). But the proof bundle will reflect that the address was
 * undeliverable per Lob's API — which is itself evidentially relevant.
 */

import { getConfig } from "@/config";
import type { Recipient } from "./types";
import { appendCustodyEvent } from "./communications";

const LOB_BASE = "https://api.lob.com/v1";

export interface AddressVerificationResult {
  /** Lob's deliverability verdict */
  deliverability: "deliverable" | "deliverable_missing_unit" | "deliverable_unnecessary_unit" | "undeliverable" | "missing_information";
  /** Convenience: true if Lob says the address is deliverable in some form */
  is_deliverable: boolean;
  /** Standardized address from Lob (may differ from input) */
  verified_address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postal: string | null;
  } | null;
  /** Corrections Lob suggests (fields that differ from input) */
  corrections: Record<string, { input: string; verified: string }> | null;
  /** Warnings generated during verification */
  warnings: string[];
  /** Raw Lob response (for the proof bundle) */
  raw_response: unknown;
  /** Whether the API call succeeded (false = API was unavailable) */
  api_succeeded: boolean;
}

/**
 * Verify a recipient address via Lob's /v1/us_verifications endpoint.
 * Uses the tenant's Lob API key if available, falls back to platform key.
 */
export async function verifyRecipientAddress(
  recipient: Pick<Recipient, "name" | "address_line1" | "address_line2" | "city" | "state" | "postal_code" | "country">,
  options: {
    tenantLobKey?: string | null;
  } = {},
): Promise<AddressVerificationResult> {
  const config = getConfig();
  const lobKey = options.tenantLobKey ?? config.lob.apiKey;

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

  // Only US addresses are supported by us_verifications
  if (recipient.country && recipient.country !== "US") {
    return {
      deliverability: "missing_information",
      is_deliverable: true, // Don't block international sends
      verified_address: null,
      corrections: null,
      warnings: [`International address (${recipient.country}) — US verification skipped`],
      raw_response: null,
      api_succeeded: false,
    };
  }

  const warnings: string[] = [];
  const auth = "Basic " + Buffer.from(`${lobKey}:`).toString("base64");

  try {
    const form = new URLSearchParams();
    form.set("address[line1]", recipient.address_line1);
    if (recipient.address_line2) form.set("address[line2]", recipient.address_line2);
    form.set("address[city]", recipient.city);
    form.set("address[state]", recipient.state);
    form.set("address[zip]", recipient.postal_code);

    const res = await fetch(`${LOB_BASE}/us_verifications`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      signal: AbortSignal.timeout(10_000),
    });

    const text = await res.text();

    if (!res.ok) {
      if (res.status === 422) {
        // Address too malformed to verify
        return {
          deliverability: "missing_information",
          is_deliverable: false,
          verified_address: null,
          corrections: null,
          warnings: ["Address too malformed for Lob to verify"],
          raw_response: text,
          api_succeeded: true,
        };
      }
      throw new Error(`Lob verification failed: HTTP ${res.status}`);
    }

    const response = JSON.parse(text);
    const deliverability: string = response?.deliverability ?? "missing_information";
    const verifiedAddr = response?.address ?? null;

    const isDeliverable =
      deliverability === "deliverable" ||
      deliverability === "deliverable_missing_unit" ||
      deliverability === "deliverable_unnecessary_unit";

    // Compute corrections
    let corrections: Record<string, { input: string; verified: string }> | null = null;
    if (verifiedAddr) {
      const diffs: Record<string, { input: string; verified: string }> = {};
      if (verifiedAddr.address_line1 && verifiedAddr.address_line1 !== recipient.address_line1) {
        diffs.line1 = { input: recipient.address_line1, verified: verifiedAddr.address_line1 };
      }
      if (verifiedAddr.address_line2 && verifiedAddr.address_line2 !== recipient.address_line2) {
        diffs.line2 = { input: recipient.address_line2 ?? "", verified: verifiedAddr.address_line2 };
      }
      if (verifiedAddr.address_city && verifiedAddr.address_city !== recipient.city) {
        diffs.city = { input: recipient.city, verified: verifiedAddr.address_city };
      }
      if (verifiedAddr.address_state && verifiedAddr.address_state !== recipient.state) {
        diffs.state = { input: recipient.state, verified: verifiedAddr.address_state };
      }
      if (verifiedAddr.address_zip && verifiedAddr.address_zip !== recipient.postal_code) {
        diffs.postal = { input: recipient.postal_code, verified: verifiedAddr.address_zip };
      }
      if (Object.keys(diffs).length > 0) {
        corrections = diffs;
        warnings.push("Lob suggests corrections to the address");
      }
    }

    return {
      deliverability: deliverability as AddressVerificationResult["deliverability"],
      is_deliverable: isDeliverable,
      verified_address: verifiedAddr
        ? {
            line1: verifiedAddr.address_line1 ?? null,
            line2: verifiedAddr.address_line2 ?? null,
            city: verifiedAddr.address_city ?? null,
            state: verifiedAddr.address_state ?? null,
            postal: verifiedAddr.address_zip ?? null,
          }
        : null,
      corrections,
      warnings,
      raw_response: response,
      api_succeeded: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    warnings.push(`Address verification API unavailable: ${msg}`);
    return {
      deliverability: "missing_information",
      is_deliverable: true, // Don't block on API failure
      verified_address: null,
      corrections: null,
      warnings,
      raw_response: null,
      api_succeeded: false,
    };
  }
}

/**
 * Verify a recipient address and record the result as a custody event.
 * Used in the communication creation flow.
 *
 * Returns the verification result. The caller stores it in the
 * communication record's metadata and updates address_verified + lob_address_id.
 */
export async function verifyAndRecord(
  recipient: Recipient,
  communicationId: string,
  tenantId: string,
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
  options: { tenantLobKey?: string | null } = {},
): Promise<AddressVerificationResult> {
  const result = await verifyRecipientAddress(recipient, options);

  // Record as a custody event in the chain
  // proof_custody_events has no metadata column, so anything not in the
  // description is not recorded. These details belong in the hashed chain.
  const details = [
    `deliverable=${result.is_deliverable}`,
    result.corrections?.length ? `corrections=${result.corrections.length}` : null,
    result.warnings?.length ? `warnings=${result.warnings.length}` : null,
  ].filter(Boolean).join(", ");

  const description = result.api_succeeded
    ? `Recipient address verified via Lob: ${result.deliverability} (${details})`
    : "Address verification attempted but API unavailable";

  await appendCustodyEvent(
    {
      communication_id: communicationId,
      tenant_id: tenantId,
      event_type: "address_verified",
      description,
      new_status: undefined, // don't change the communication status
    },
    deps,
  ).catch(() => {
    // Non-blocking — the verification result is still returned to the caller
  });

  return result;
}
