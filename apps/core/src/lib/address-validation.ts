/**
 * Address validation via the Lob API.
 *
 * Validates addresses before submission to catch formatting issues,
 * missing fields, and undeliverable addresses. Uses Lob's
 * /v1/us_verifications endpoint (free tier) for US addresses.
 *
 * The validation is advisory — we log the result and block only on
 * hard failures (missing required fields, undeliverable addresses).
 * Soft warnings (e.g., minor formatting corrections) are logged but
 * don't block submission.
 */

import { getConfig } from "@/config";
import { withRetry, type RetryOptions } from "@/lib/retry";
import type { PostalAddress } from "@/providers/interfaces";

const LOB_BASE = "https://api.lob.com/v1";

export type AddressValidationLevel = "deliverable" | "deliverable_missing_unit" | "deliverable_unnecessary_unit" | "undeliverable" | "missing_information";

export type AddressValidationResult = {
  level: AddressValidationLevel;
  isDeliverable: boolean;
  warnings: string[];
  corrections?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal?: string;
  } | null;
  rawResponse?: unknown;
};

const LOB_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 2,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  timeoutMs: 10000,
};

function basicAuth(): string {
  const config = getConfig();
  if (!config.lob.apiKey) throw new Error("LOB_API_KEY is not configured");
  return "Basic " + Buffer.from(`${config.lob.apiKey}:`).toString("base64");
}

/**
 * Validate a US address via Lob's /v1/us_verifications endpoint.
 *
 * Returns the deliverability level and any corrections. The `isDeliverable`
 * flag is true for all levels except "undeliverable" and "missing_information".
 */
export async function validateUsAddress(
  address: PostalAddress,
): Promise<AddressValidationResult> {
  const warnings: string[] = [];

  // Basic pre-validation: check required fields before hitting the API
  const required: (keyof PostalAddress)[] = ["name", "line1", "city", "state", "postal"];
  for (const field of required) {
    if (!address[field] || String(address[field]).trim() === "") {
      return {
        level: "missing_information",
        isDeliverable: false,
        warnings: [`Missing required field: ${field}`],
      };
    }
  }

  // Validate ZIP code format (5 digits or 5+4)
  const postal = String(address.postal).trim();
  if (!/^\d{5}(-\d{4})?$/.test(postal)) {
    warnings.push(`ZIP code "${postal}" does not match expected format (5 or 9 digits)`);
  }

  // Validate state (2-letter abbreviation)
  if (String(address.state).length !== 2) {
    warnings.push(`State "${address.state}" should be a 2-letter abbreviation`);
  }

  try {
    const form = new URLSearchParams();
    form.set("address[line1]", address.line1);
    if (address.line2) form.set("address[line2]", address.line2);
    form.set("address[city]", address.city);
    form.set("address[state]", address.state);
    form.set("address[zip]", postal);

    const response = await withRetry(async () => {
      const res = await fetch(`${LOB_BASE}/us_verifications`, {
        method: "POST",
        headers: {
          Authorization: basicAuth(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
        signal: AbortSignal.timeout(LOB_RETRY_OPTIONS.timeoutMs!),
      });

      const text = await res.text();
      if (!res.ok) {
        // 422 from Lob usually means the address is too malformed to verify
        if (res.status === 422) {
          return {
            deliverability: "missing_information",
            address: null,
          } as any;
        }
        throw new Error(`Lob validation failed: HTTP ${res.status} — ${text.slice(0, 300)}`);
      }

      return JSON.parse(text);
    }, LOB_RETRY_OPTIONS);

    const deliverability: string = response?.deliverability ?? "missing_information";
    const verifiedAddress = response?.address ?? null;

    const isDeliverable =
      deliverability === "deliverable" ||
      deliverability === "deliverable_missing_unit" ||
      deliverability === "deliverable_unnecessary_unit";

    // Collect corrections
    let corrections: AddressValidationResult["corrections"] = null;
    if (verifiedAddress) {
      const diffs: AddressValidationResult["corrections"] = {};
      if (verifiedAddress.address_line1 && verifiedAddress.address_line1 !== address.line1) {
        diffs.line1 = verifiedAddress.address_line1;
      }
      if (verifiedAddress.address_line2 && verifiedAddress.address_line2 !== address.line2) {
        diffs.line2 = verifiedAddress.address_line2;
      }
      if (verifiedAddress.address_city && verifiedAddress.address_city !== address.city) {
        diffs.city = verifiedAddress.address_city;
      }
      if (verifiedAddress.address_state && verifiedAddress.address_state !== address.state) {
        diffs.state = verifiedAddress.address_state;
      }
      if (verifiedAddress.address_zip && verifiedAddress.address_zip !== postal) {
        diffs.postal = verifiedAddress.address_zip;
      }
      if (Object.keys(diffs).length > 0) {
        corrections = diffs;
        warnings.push("Lob suggests corrections to the address");
      }
    }

    return {
      level: deliverability as AddressValidationLevel,
      isDeliverable,
      warnings,
      corrections,
      rawResponse: response,
    };
  } catch (e) {
    // If validation API fails, log a warning but don't block submission
    const msg = e instanceof Error ? e.message : String(e);
    warnings.push(`Address validation API unavailable: ${msg}`);
    return {
      level: "missing_information",
      isDeliverable: true, // Don't block on API failure
      warnings,
    };
  }
}

/**
 * Validate both sender and recipient addresses for an order.
 * Blocks submission only if the recipient address is undeliverable.
 */
export async function validateOrderAddresses(
  to: PostalAddress,
  from: PostalAddress,
): Promise<{ to: AddressValidationResult; from: AddressValidationResult; shouldBlock: boolean }> {
  const [toResult, fromResult] = await Promise.all([
    validateUsAddress(to),
    validateUsAddress(from),
  ]);

  // Block only if the recipient address is undeliverable
  const shouldBlock = !toResult.isDeliverable && toResult.level === "undeliverable";

  return { to: toResult, from: fromResult, shouldBlock };
}
