/** A reused or race-won order must refer to exactly this owner's approved packet. */
type ExistingWorkflowOrder = {
  case_approval_id: string | null;
  workflow_case_id: string | null;
  approved_packet_sha256: string | null;
  approved_price_cents: number | null;
  price_cents: number;
  email: string;
  sender_name: string;
  sender_line1: string;
  sender_line2: string | null;
  sender_city: string;
  sender_state: string;
  sender_postal: string;
  vertical_metadata: unknown;
};

type ExpectedWorkflowOrder = {
  approvalId: string;
  caseId: string;
  ownerId: string;
  packetSha256: string;
  totalCents: number;
  email: string;
  sender: {
    name: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postal: string;
  };
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
    order.email !== expected.email ||
    order.sender_name !== expected.sender.name ||
    order.sender_line1 !== expected.sender.line1 ||
    (order.sender_line2 ?? null) !== (expected.sender.line2 ?? null) ||
    order.sender_city !== expected.sender.city ||
    order.sender_state !== expected.sender.state.toUpperCase() ||
    order.sender_postal !== expected.sender.postal ||
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

/** Direct upload checkouts retain their original Stripe idempotency key on
 * first attempt and advance only when the previous session has expired. */
export async function directCheckoutAttemptKey(
  orderId: string,
  previousSessionId: string | null,
): Promise<string> {
  const key = await workflowCheckoutAttemptKey(orderId, previousSessionId);
  return key.replace(/^workflow_checkout_/, "checkout_");
}

/** Fail closed immediately before Lob receives a signed approved workflow PDF.
 * The independent, immutable case_approvals row—not the mutable order
 * recipient—is authoritative for destination, mail class, price and owner.
 */
export function assertWorkflowFulfillmentMatchesApproval(
  order: {
    case_approval_id: string | null;
    workflow_case_id: string | null;
    approved_packet_sha256: string | null;
    approved_price_cents: number | null;
    price_cents: number;
    email: string;
    recipient_name: string;
    recipient_line1: string;
    recipient_line2: string | null;
    recipient_city: string;
    recipient_state: string;
    recipient_postal: string;
    sender_name: string;
    sender_line1: string;
    sender_line2: string | null;
    sender_city: string;
    sender_state: string;
    sender_postal: string;
    mail_class: string;
    color: boolean;
    vertical_metadata: unknown;
  },
  approval: {
    id: string;
    case_id: string;
    owner_id: string;
    packet_sha256: string;
    recipient: unknown;
    mail_class: string;
    quote: unknown;
  } | null,
): void {
  const fail = (): never => {
    throw new Error("Workflow mailing details do not match immutable approval; Lob submission blocked");
  };
  if (!approval) fail();
  const r = approval.recipient;
  const q = approval.quote;
  const m = order.vertical_metadata;
  const recipient = r && typeof r === "object" && !Array.isArray(r) ? r as Record<string, unknown> : null;
  const quote = q && typeof q === "object" && !Array.isArray(q) ? q as Record<string, unknown> : null;
  const metadata = m && typeof m === "object" && !Array.isArray(m) ? m as Record<string, unknown> : null;
  const senderRaw = metadata?.sender_snapshot;
  const sender = senderRaw && typeof senderRaw === "object" && !Array.isArray(senderRaw)
    ? senderRaw as Record<string, unknown> : null;

  if (
    !order.case_approval_id || !order.workflow_case_id || !order.approved_packet_sha256 ||
    approval.id !== order.case_approval_id ||
    approval.case_id !== order.workflow_case_id ||
    approval.packet_sha256 !== order.approved_packet_sha256 ||
    quote?.totalCents !== order.price_cents ||
    order.approved_price_cents !== order.price_cents ||
    approval.mail_class !== order.mail_class ||
    order.color !== false ||
    recipient?.name !== order.recipient_name ||
    recipient?.line1 !== order.recipient_line1 ||
    (recipient?.line2 ?? null) !== (order.recipient_line2 ?? null) ||
    recipient?.city !== order.recipient_city ||
    recipient?.state !== order.recipient_state ||
    recipient?.postal !== order.recipient_postal ||
    metadata?.source !== "secure-workflow" ||
    metadata?.owner_user_id !== approval.owner_id ||
    metadata?.workflow_case_id !== order.workflow_case_id ||
    metadata?.case_approval_id !== approval.id ||
    metadata?.approved_packet_sha256 !== approval.packet_sha256 ||
    metadata?.billing_email !== order.email ||
    sender?.name !== order.sender_name ||
    sender?.line1 !== order.sender_line1 ||
    (sender?.line2 ?? null) !== (order.sender_line2 ?? null) ||
    sender?.city !== order.sender_city ||
    sender?.state !== order.sender_state ||
    sender?.postal !== order.sender_postal
  ) fail();
}
