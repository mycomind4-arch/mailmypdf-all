import { z } from "zod";
import type { Evidence } from "./evidence";
import { generateExhibitIndex } from "./evidence";
import { hashDraft, hashRecipient } from "@mailmypdf/payment-fulfillment";

/* ─────────────────────────────────────────────
   Packet — the assembled appeal package ready
   for mailing: letter + exhibits + index.

   This is the immutable "approved artifact": once assembled at
   approval time, approvedDraftHash / approvedRecipientHash freeze
   the exact letter text and recipient that were reviewed. The
   fulfillment engine (@mailmypdf/payment-fulfillment) re-hashes the
   stored packet at mailing time and refuses to mail if it drifted —
   e.g. because the underlying appeal.draft was edited after approval
   but before payment completed.
   ───────────────────────────────────────────── */

export const exhibitEntrySchema = z.object({
  number: z.string(),
  evidenceId: z.string(),
  label: z.string(),
  pageRef: z.string().optional(),
  description: z.string().optional(),
});
export type ExhibitEntry = z.infer<typeof exhibitEntrySchema>;

export const appealPacketSchema = z.object({
  id: z.string(),
  appealId: z.string(),
  finalLetter: z.string(),
  attachmentIds: z.array(z.string()).default([]),
  exhibitIndex: z.array(exhibitEntrySchema).default([]),
  recipientName: z.string(),
  recipientAddress1: z.string(),
  recipientAddress2: z.string().optional(),
  recipientCity: z.string(),
  recipientState: z.string(),
  recipientZip: z.string(),
  mailingMethod: z.enum(["standard", "certified", "registered"]),
  pageCount: z.number().default(1),
  assembledAt: z.string(),
  // Approval-time integrity hashes — see fulfillment engine verifyIntegrity().
  approvedDraftHash: z.string().optional(),
  approvedRecipientHash: z.string().optional(),
});
export type AppealPacket = z.infer<typeof appealPacketSchema>;

export function assemblePacket(params: {
  appealId: string;
  finalLetter: string;
  evidence: Evidence[];
  recipient: { name: string; address1: string; address2?: string; city: string; state: string; zip: string };
  mailingMethod: "standard" | "certified" | "registered";
}): AppealPacket {
  const exhibitIndex = generateExhibitIndex(params.evidence).map((e) => ({
    ...e,
    description: params.evidence.find((ev) => ev.id === e.evidenceId)?.notes,
  }));

  return appealPacketSchema.parse({
    id: crypto.randomUUID(),
    appealId: params.appealId,
    finalLetter: params.finalLetter,
    attachmentIds: params.evidence.map((e) => e.id),
    exhibitIndex,
    recipientName: params.recipient.name,
    recipientAddress1: params.recipient.address1,
    recipientAddress2: params.recipient.address2,
    recipientCity: params.recipient.city,
    recipientState: params.recipient.state,
    recipientZip: params.recipient.zip,
    mailingMethod: params.mailingMethod,
    pageCount: 1 + params.evidence.filter((e) => e.type !== "excerpt").length,
    assembledAt: new Date().toISOString(),
    approvedDraftHash: hashDraft(params.finalLetter),
    approvedRecipientHash: hashRecipient({
      name: params.recipient.name,
      address1: params.recipient.address1,
      address2: params.recipient.address2,
      city: params.recipient.city,
      state: params.recipient.state,
      zip: params.recipient.zip,
    }),
  });
}

/* Render the exhibit index as text for inclusion in the packet */
export function renderExhibitIndex(index: ExhibitEntry[]): string {
  if (!index.length) return "";
  const lines = ["EXHIBIT INDEX", ""];
  for (const entry of index) {
    lines.push(`${entry.number}: ${entry.label}`);
    if (entry.pageRef) lines.push(`   Page(s): ${entry.pageRef}`);
    if (entry.description) lines.push(`   ${entry.description}`);
    lines.push("");
  }
  return lines.join("\n");
}
