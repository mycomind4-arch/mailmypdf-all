/** A reused or race-won order must refer to exactly this owner's approved packet. */
type ExistingWorkflowOrder = {
  case_approval_id: string | null;
  workflow_case_id: string | null;
  approved_packet_sha256: string | null;
  approved_price_cents: number | null;
  price_cents: number;
  vertical_metadata: unknown;
};

type ExpectedWorkflowOrder = {
  approvalId: string;
  caseId: string;
  ownerId: string;
  packetSha256: string;
  totalCents: number;
};

export function assertApprovedWorkflowOrderMatches(
  order: ExistingWorkflowOrder,
  expected: ExpectedWorkflowOrder,
): void {
  const metadata = order.vertical_metadata;
  const binding = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : null;

  if (
    order.case_approval_id !== expected.approvalId ||
    order.workflow_case_id !== expected.caseId ||
    order.approved_packet_sha256 !== expected.packetSha256 ||
    order.approved_price_cents !== expected.totalCents ||
    order.price_cents !== expected.totalCents ||
    binding?.source !== "secure-workflow" ||
    binding.owner_user_id !== expected.ownerId ||
    binding.workflow_case_id !== expected.caseId ||
    binding.case_approval_id !== expected.approvalId ||
    binding.approved_packet_sha256 !== expected.packetSha256
  ) {
    throw new Error("Existing workflow order does not match the authenticated approved packet.");
  }
}
