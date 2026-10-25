export type MailingBatchMode = "identical" | "personalized";

export interface MailingBatchAddress {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal: string;
}

export interface MailingBatchRecipient {
  id: string;
  address: MailingBatchAddress;
  packetSha256: string;
  pageCount: number;
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface MailingBatchManifest {
  id: string;
  ownerId: string;
  mode: MailingBatchMode;
  mailClass: "standard" | "certified" | "registered";
  color: boolean;
  sender: MailingBatchAddress;
  recipients: readonly MailingBatchRecipient[];
  createdAt: string;
}

function nonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function normalizeAddress(address: MailingBatchAddress, field: string): MailingBatchAddress {
  const state = nonEmpty(address.state, `${field}.state`).toUpperCase();
  const postal = nonEmpty(address.postal, `${field}.postal`);
  if (!/^[A-Z]{2}$/.test(state)) throw new Error(`${field}.state must be a two-letter US state`);
  if (!/^\d{5}(?:-\d{4})?$/.test(postal)) throw new Error(`${field}.postal must be ZIP or ZIP+4`);
  return {
    name: nonEmpty(address.name, `${field}.name`),
    line1: nonEmpty(address.line1, `${field}.line1`),
    line2: address.line2?.trim() || null,
    city: nonEmpty(address.city, `${field}.city`),
    state,
    postal,
  };
}

function sha256(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) throw new Error(`${field} must be a SHA-256 hex digest`);
  return normalized;
}

export function createMailingBatchManifest(input: {
  id: string;
  ownerId: string;
  mode: MailingBatchMode;
  mailClass: "standard" | "certified" | "registered";
  color: boolean;
  sender: MailingBatchAddress;
  recipients: readonly MailingBatchRecipient[];
  createdAt?: string;
}): MailingBatchManifest {
  if (input.recipients.length < 2) throw new Error("A mailing batch requires at least two recipients");
  if (input.recipients.length > 10_000) throw new Error("A mailing batch cannot exceed 10,000 recipients");

  const seen = new Set<string>();
  const recipients = input.recipients.map((recipient, index) => {
    const id = nonEmpty(recipient.id, `recipients[${index}].id`);
    if (seen.has(id)) throw new Error(`Duplicate batch recipient id: ${id}`);
    seen.add(id);
    if (!Number.isSafeInteger(recipient.pageCount) || recipient.pageCount < 1) {
      throw new Error(`recipients[${index}].pageCount must be a positive integer`);
    }
    return {
      ...recipient,
      id,
      address: normalizeAddress(recipient.address, `recipients[${index}].address`),
      packetSha256: sha256(recipient.packetSha256, `recipients[${index}].packetSha256`),
      pageCount: recipient.pageCount,
      metadata: recipient.metadata ? { ...recipient.metadata } : undefined,
    };
  });

  if (input.mode === "identical") {
    const expected = recipients[0]!.packetSha256;
    if (recipients.some((recipient) => recipient.packetSha256 !== expected)) {
      throw new Error("Identical mailing batches must use the same packet hash for every recipient");
    }
  }

  const created = input.createdAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(created))) throw new Error("createdAt must be an ISO date-time");

  return {
    id: nonEmpty(input.id, "id"),
    ownerId: nonEmpty(input.ownerId, "ownerId"),
    mode: input.mode,
    mailClass: input.mailClass,
    color: input.color,
    sender: normalizeAddress(input.sender, "sender"),
    recipients,
    createdAt: new Date(Date.parse(created)).toISOString(),
  };
}

export async function hashMailingBatchManifest(manifest: MailingBatchManifest): Promise<string> {
  const canonical = JSON.stringify({
    id: manifest.id,
    ownerId: manifest.ownerId,
    mode: manifest.mode,
    mailClass: manifest.mailClass,
    color: manifest.color,
    sender: manifest.sender,
    recipients: manifest.recipients.map((recipient) => ({
      id: recipient.id,
      address: recipient.address,
      packetSha256: recipient.packetSha256,
      pageCount: recipient.pageCount,
      metadata: recipient.metadata ?? null,
    })),
  });
  const bytes = new TextEncoder().encode(canonical);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}
