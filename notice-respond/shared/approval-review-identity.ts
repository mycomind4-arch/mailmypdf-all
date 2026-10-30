import type {
  WorkflowMailingAddress,
  WorkflowPacketPreview,
} from "@mailmypdf/workflows";

/**
 * React must discard the old confirmation checkboxes whenever the exact
 * reviewed mailing changes. Rebuilding a preview while it is already visible
 * otherwise preserves ApprovalChecklist's internal checked state, even if
 * the new packet hash or quoted price differs.
 */
export function noticeResponseApprovalReviewIdentity(input: {
  packet: Pick<WorkflowPacketPreview, "packetSha256"> & {
    quote: Pick<WorkflowPacketPreview["quote"], "totalCents">;
  };
  recipient: WorkflowMailingAddress;
  mailClass: "standard" | "certified" | "registered";
}): string {
  const { packet, recipient, mailClass } = input;
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
  ]);
}
