/**
 * MailMyPDF application adapter for the shared address-verification capability.
 *
 * Provider-neutral validation lives in @mailmypdf/fulfillment. This file keeps
 * the historical app API stable for existing order and Lob call sites.
 */
import {
  createLobAddressVerifier,
  verifyMailingAddresses,
  type AddressValidationLevel,
  type AddressValidationResult,
} from "@mailmypdf/fulfillment";
import { getConfig } from "@/config";
import type { PostalAddress } from "@/providers/interfaces";

export type { AddressValidationLevel, AddressValidationResult };

function configuredVerifier() {
  const apiKey = getConfig().lob.apiKey;
  if (!apiKey) return null;
  return createLobAddressVerifier({ apiKey });
}

export async function validateUsAddress(
  address: PostalAddress,
): Promise<AddressValidationResult> {
  const verifier = configuredVerifier();
  if (!verifier) {
    return {
      level: "provider_unavailable",
      isDeliverable: true,
      warnings: ["LOB_API_KEY is not configured; address verification was not performed"],
      provider: "lob",
    };
  }
  return verifier.verify(address);
}

export async function validateOrderAddresses(
  to: PostalAddress,
  from: PostalAddress,
): Promise<{
  to: AddressValidationResult;
  from: AddressValidationResult;
  shouldBlock: boolean;
}> {
  const verifier = configuredVerifier();
  if (!verifier) {
    const unavailable: AddressValidationResult = {
      level: "provider_unavailable",
      isDeliverable: true,
      warnings: ["LOB_API_KEY is not configured; address verification was not performed"],
      provider: "lob",
    };
    return { to: unavailable, from: unavailable, shouldBlock: false };
  }

  const result = await verifyMailingAddresses(to, from, verifier);
  return {
    to: result.recipient,
    from: result.sender,
    shouldBlock: result.shouldBlock,
  };
}
