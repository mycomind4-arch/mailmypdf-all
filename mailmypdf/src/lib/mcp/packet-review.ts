export type ReviewMailingAddress = {
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal: string;
};

export class RecipientReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecipientReviewError";
  }
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new RecipientReviewError(`${label} is required`);
  }
  return value.trim();
}

export function normalizeReviewRecipient(value: unknown): ReviewMailingAddress {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RecipientReviewError("recipient must be an object");
  }
  const input = value as Record<string, unknown>;
  const state = requiredString(input.state, "recipient.state").toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) {
    throw new RecipientReviewError("recipient.state must be a two-letter state abbreviation");
  }

  const postal = requiredString(input.postal, "recipient.postal");
  if (!/^\d{5}(?:-\d{4})?$/.test(postal)) {
    throw new RecipientReviewError("recipient.postal must be a ZIP or ZIP+4");
  }

  return {
    name: requiredString(input.name, "recipient.name"),
    line1: requiredString(input.line1, "recipient.line1"),
    line2:
      typeof input.line2 === "string" && input.line2.trim()
        ? input.line2.trim()
        : null,
    city: requiredString(input.city, "recipient.city"),
    state,
    postal,
  };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function recipientReviewSha256(value: unknown): Promise<{
  recipient: ReviewMailingAddress;
  sha256: string;
}> {
  const recipient = normalizeReviewRecipient(value);
  const canonical = JSON.stringify(recipient);
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return {
    recipient,
    sha256: bytesToHex(new Uint8Array(digest)),
  };
}
