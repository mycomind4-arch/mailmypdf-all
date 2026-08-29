import { z } from "zod";

/* ─────────────────────────────────────────────
   Proof Packet — permanent record that the
   appeal was sent: what, when, how, and that
   it was delivered.
   ───────────────────────────────────────────── */

export const proofPacketSchema = z.object({
  id: z.string(),
  appealId: z.string(),
  packetId: z.string(),
  finalAppealHash: z.string(),
  attachmentHashes: z.array(z.string()).default([]),
  exhibitIndexHash: z.string().optional(),
  recipientName: z.string(),
  recipientAddress1: z.string(),
  recipientCity: z.string(),
  recipientState: z.string(),
  recipientZip: z.string(),
  mailingMethod: z.enum(["standard", "certified", "registered"]),
  mailingTimestamp: z.string().optional(),
  trackingNumber: z.string().optional(),
  deliveryConfirmation: z.string().optional(),
  transactionRecord: z.string().optional(),
  providerOrderId: z.string().optional(),
  status: z.enum(["assembled", "mailed", "in_transit", "delivered", "failed"]).default("assembled"),
  createdAt: z.string(),
  sealedAt: z.string().optional(),
});
export type ProofPacket = z.infer<typeof proofPacketSchema>;

/* Simple hash function for document integrity (client-side, non-cryptographic) */
export async function computeHash(text: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback simple hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return `fallback_${Math.abs(hash).toString(16)}`;
}

export function createProofPacket(params: {
  appealId: string;
  packetId: string;
  finalAppealHash: string;
  attachmentHashes: string[];
  exhibitIndexHash?: string;
  recipient: { name: string; address1: string; city: string; state: string; zip: string };
  mailingMethod: "standard" | "certified" | "registered";
  providerOrderId?: string;
}): ProofPacket {
  return proofPacketSchema.parse({
    id: crypto.randomUUID(),
    appealId: params.appealId,
    packetId: params.packetId,
    finalAppealHash: params.finalAppealHash,
    attachmentHashes: params.attachmentHashes,
    exhibitIndexHash: params.exhibitIndexHash,
    recipientName: params.recipient.name,
    recipientAddress1: params.recipient.address1,
    recipientCity: params.recipient.city,
    recipientState: params.recipient.state,
    recipientZip: params.recipient.zip,
    mailingMethod: params.mailingMethod,
    providerOrderId: params.providerOrderId,
    status: "assembled",
    createdAt: new Date().toISOString(),
  });
}

/* Render the proof packet as a human-readable certificate */
export function renderProofCertificate(proof: ProofPacket): string {
  const lines = [
    "APPEAL MAIL — PROOF OF FILING",
    "================================",
    "",
    `Appeal ID:      ${proof.appealId}`,
    `Packet ID:      ${proof.packetId}`,
    "",
    "RECIPIENT:",
    `  ${proof.recipientName}`,
    `  ${proof.recipientAddress1}`,
    `  ${proof.recipientCity}, ${proof.recipientState} ${proof.recipientZip}`,
    "",
    `Mailing Method: ${proof.mailingMethod}`,
    proof.mailingTimestamp ? `Mailed At:      ${proof.mailingTimestamp}` : "",
    proof.trackingNumber ? `Tracking #:     ${proof.trackingNumber}` : "",
    proof.deliveryConfirmation ? `Delivered:      ${proof.deliveryConfirmation}` : "",
    "",
    "DOCUMENT INTEGRITY:",
    `  Appeal Hash:    ${proof.finalAppealHash}`,
    ...proof.attachmentHashes.map((h, i) => `  Attachment ${i + 1}: ${h}`),
    proof.exhibitIndexHash ? `  Exhibit Index: ${proof.exhibitIndexHash}` : "",
    "",
    proof.providerOrderId ? `Provider Order: ${proof.providerOrderId}` : "",
    `Status:         ${proof.status}`,
    `Created:        ${proof.createdAt}`,
    proof.sealedAt ? `Sealed:         ${proof.sealedAt}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}
