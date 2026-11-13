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

type CheckoutSessionIdentity = {
  id: string;
  mode: string | null;
  status: string | null;
  amount_total: number | null;
  currency: string | null;
  metadata: Record<string, string> | null;
};

export function assertHostedCheckoutSessionMatches(
  session: CheckoutSessionIdentity,
  order: { id: string; price_cents: number },
  approvalId: string,
  caseId: string,
): void {
  if (
    session.mode !== "payment" ||
    session.currency !== "usd" ||
    session.amount_total !== order.price_cents ||
    session.metadata?.orderId !== order.id ||
    session.metadata?.workflowCaseId !== caseId ||
    session.metadata?.caseApprovalId !== approvalId
  ) {
    throw new Error("Stripe checkout session identity does not match the approved mailing.");
  }
}

/**
 * Exactly one Stripe create key per previous session. After a confirmed
 * expired session, retry with a different key so Stripe cannot replay the
 * expired first checkout. Concurrent retries of the same predecessor keep
 * the same key. This never uses a client-supplied nonce.
 */
export async function workflowCheckoutAttemptKey(
  approvalId: string,
  previousSessionId: string | null,
): Promise<string> {
  if (!previousSessionId) return `workflow_checkout_${approvalId}`;
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(previousSessionId),
  );
  const suffix = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
  return `workflow_checkout_${approvalId}_retry_${suffix}`;
}
