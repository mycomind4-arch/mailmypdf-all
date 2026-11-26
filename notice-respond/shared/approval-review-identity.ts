import type {
  WorkflowMailingAddress,
  WorkflowPacketPreview,
} from "@mailmypdf/workflows";

/**
 * React must discard the old confirmation checkboxes whenever the exact
 * reviewed mailing changes. Rebuilding a preview while it is already visible
 * otherwise preserves ApprovalChecklist's internal checked state, even if
 * the new packet hash, quoted price, recipient, or controlling notice facts differ.
 */
export function noticeResponseApprovalReviewIdentity(input: {
  packet: Pick<WorkflowPacketPreview, "packetSha256"> & {
    quote: Pick<WorkflowPacketPreview["quote"], "totalCents">;
  };
  recipient: WorkflowMailingAddress;
  mailClass: "standard" | "certified" | "registered";
  /** The notice facts the user actually reviewed, not merely the envelope. */
  analysis: { documentId: string; version: number; result: unknown } | null;
}): string {
  const { packet, recipient, mailClass, analysis } = input;
  return JSON.stringify([
    packet.packetSha256,
    packet.quote.totalCents,
    mailClass,
    recipient.name,
    recipient.line1,
    recipient.line2 ?? "",
    recipient.city,
    recipient.state,
    recipient.postal,
    analysis?.documentId ?? null,
    analysis?.version ?? null,
    analysis?.result ?? null,
  ]);
}
