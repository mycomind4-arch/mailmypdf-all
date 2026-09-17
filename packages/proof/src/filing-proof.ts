export type FilingMethod = "standard" | "certified" | "registered";
export type FilingProofStatus =
  | "assembled"
  | "submitted"
  | "mailed"
  | "in_transit"
  | "delivered"
  | "returned"
  | "undeliverable"
  | "refused"
  | "failed"
  | "cancelled"
  | "refunded";

export interface FilingProofRecipient {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal: string;
}

export interface FilingProofRecord {
  id: string;
  matterId: string;
  workflowId: string;
  packetId: string;
  packetSha256: string;
  attachmentHashes: readonly string[];
  exhibitIndexSha256?: string;
  recipient: FilingProofRecipient;
  method: FilingMethod;
  provider?: string;
  providerOrderId?: string;
  transactionRecord?: string;
  trackingNumber?: string;
  submittedAt?: string;
  mailedAt?: string;
  deliveredAt?: string;
  status: FilingProofStatus;
  createdAt: string;
  sealedAt?: string;
}

const HASH_RE = /^[0-9a-f]{64}$/i;

export function createFilingProofRecord(input: {
  matterId: string;
  workflowId: string;
  packetId: string;
  packetSha256: string;
  attachmentHashes?: readonly string[];
  exhibitIndexSha256?: string;
  recipient: FilingProofRecipient;
  method: FilingMethod;
  provider?: string;
  providerOrderId?: string;
  transactionRecord?: string;
  createdAt?: string;
}): FilingProofRecord {
  for (const [name, value] of [
    ["matterId", input.matterId],
    ["workflowId", input.workflowId],
    ["packetId", input.packetId],
  ] as const) {
    if (!value.trim()) throw new Error(`Filing proof requires ${name}`);
  }
  if (!HASH_RE.test(input.packetSha256)) throw new Error("Filing proof requires a valid packet SHA-256");
  for (const hash of input.attachmentHashes ?? []) {
    if (!HASH_RE.test(hash)) throw new Error("Filing proof attachment hash is invalid");
  }
  if (input.exhibitIndexSha256 && !HASH_RE.test(input.exhibitIndexSha256)) {
    throw new Error("Filing proof exhibit-index hash is invalid");
  }
  for (const field of ["name", "line1", "city", "state", "postal"] as const) {
    if (!String(input.recipient[field] ?? "").trim()) throw new Error(`Filing proof recipient is missing ${field}`);
  }
  return {
    id: crypto.randomUUID(),
    matterId: input.matterId,
    workflowId: input.workflowId,
    packetId: input.packetId,
    packetSha256: input.packetSha256.toLowerCase(),
    attachmentHashes: [...(input.attachmentHashes ?? [])].map((hash) => hash.toLowerCase()),
    ...(input.exhibitIndexSha256 ? { exhibitIndexSha256: input.exhibitIndexSha256.toLowerCase() } : {}),
    recipient: { ...input.recipient },
    method: input.method,
    ...(input.provider ? { provider: input.provider } : {}),
    ...(input.providerOrderId ? { providerOrderId: input.providerOrderId } : {}),
    ...(input.transactionRecord ? { transactionRecord: input.transactionRecord } : {}),
    status: "assembled",
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

const ALLOWED_TRANSITIONS: Readonly<Record<FilingProofStatus, readonly FilingProofStatus[]>> = {
  assembled: ["submitted", "cancelled", "failed"],
  submitted: ["mailed", "failed", "cancelled", "refunded"],
  mailed: ["in_transit", "delivered", "returned", "undeliverable", "refused", "failed"],
  in_transit: ["delivered", "returned", "undeliverable", "refused", "failed"],
  delivered: [],
  returned: [],
  undeliverable: [],
  refused: [],
  failed: [],
  cancelled: ["refunded"],
  refunded: [],
};

export function updateFilingProofStatus(
  proof: FilingProofRecord,
  update: {
    status: FilingProofStatus;
    providerOrderId?: string;
    trackingNumber?: string;
    occurredAt?: string;
  },
): FilingProofRecord {
  if (proof.status !== update.status && !ALLOWED_TRANSITIONS[proof.status].includes(update.status)) {
    throw new Error(`Invalid filing proof transition: ${proof.status} -> ${update.status}`);
  }
  const occurredAt = update.occurredAt ?? new Date().toISOString();
  const providerOrderId = update.providerOrderId ?? proof.providerOrderId;
  if (["submitted", "mailed", "in_transit", "delivered"].includes(update.status) && !providerOrderId) {
    throw new Error(`${update.status} filing proof requires providerOrderId`);
  }
  return {
    ...proof,
    status: update.status,
    ...(providerOrderId ? { providerOrderId } : {}),
    ...(update.trackingNumber ? { trackingNumber: update.trackingNumber } : {}),
    ...(update.status === "submitted" ? { submittedAt: occurredAt } : {}),
    ...(update.status === "mailed" ? { mailedAt: occurredAt } : {}),
    ...(update.status === "delivered" ? { deliveredAt: occurredAt } : {}),
    ...(["mailed", "delivered", "returned", "undeliverable", "refused"].includes(update.status) && !proof.sealedAt
      ? { sealedAt: occurredAt }
      : {}),
  };
}

export function renderFilingProofCertificate(proof: FilingProofRecord): string {
  const lines = [
    "PROOF OF FILING",
    "===============",
    "",
    `Matter ID:      ${proof.matterId}`,
    `Workflow:       ${proof.workflowId}`,
    `Packet ID:      ${proof.packetId}`,
    "",
    "RECIPIENT:",
    `  ${proof.recipient.name}`,
    `  ${proof.recipient.line1}`,
    proof.recipient.line2 ? `  ${proof.recipient.line2}` : "",
    `  ${proof.recipient.city}, ${proof.recipient.state} ${proof.recipient.postal}`,
    "",
    `Mailing Method: ${proof.method}`,
    proof.provider ? `Provider:       ${proof.provider}` : "",
    proof.providerOrderId ? `Provider Order: ${proof.providerOrderId}` : "",
    proof.trackingNumber ? `Tracking #:     ${proof.trackingNumber}` : "",
    proof.submittedAt ? `Submitted:      ${proof.submittedAt}` : "",
    proof.mailedAt ? `Mailed:         ${proof.mailedAt}` : "",
    proof.deliveredAt ? `Delivered:      ${proof.deliveredAt}` : "",
    "",
    "DOCUMENT INTEGRITY:",
    `  Packet SHA-256: ${proof.packetSha256}`,
    ...proof.attachmentHashes.map((hash, index) => `  Attachment ${index + 1}: ${hash}`),
    proof.exhibitIndexSha256 ? `  Exhibit Index: ${proof.exhibitIndexSha256}` : "",
    "",
    `Status:         ${proof.status}`,
    `Created:        ${proof.createdAt}`,
    proof.sealedAt ? `Sealed:         ${proof.sealedAt}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}
