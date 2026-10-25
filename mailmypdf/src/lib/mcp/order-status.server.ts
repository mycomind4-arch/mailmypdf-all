import { canonicalJSON } from "@/lib/proof-of-service/hashing";
import {
  isFailedStatus,
  isPaidStatus,
  isTerminalStatus,
  type OrderStatus,
} from "@/lib/order-state-machine";
import {
  CaseNotFoundError,
  loadCase,
} from "@/lib/secure-core/case.server";
import {
  requireAuthenticatedUser,
  type AuthenticatedUserContext,
} from "@/lib/secure-core/auth.server";

export class McpOrderStatusError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "McpOrderStatusError";
  }
}

type OrderRow = {
  id: string;
  status: OrderStatus;
  workflow_case_id: string | null;
  case_approval_id: string | null;
  approved_packet_sha256: string | null;
  approved_price_cents: number | null;
  price_cents: number;
  mail_class: string;
  color: boolean | null;
  sender_name: string;
  sender_line1: string;
  sender_line2: string | null;
  sender_city: string;
  sender_state: string;
  sender_postal: string;
  recipient_line1: string;
  recipient_line2: string | null;
  recipient_postal: string;
  lob_letter_id: string | null;
  mailed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  scheduled_delivery_date: string | null;
  recipient_name: string;
  recipient_city: string;
  recipient_state: string;
  file_name: string;
  page_count: number;
  vertical_slug: string | null;
  email: string;
  payment_execution_key: string | null;
};

type OrderEventRow = {
  type: string;
  label: string;
  created_at: string;
  metadata: unknown;
};

type ScheduledMailingStatusRow = {
  id: string;
  status: string;
  send_at: string;
  timezone: string | null;
  approved_max_total_cents: number;
  payment_authorized_at: string;
  payment_amount_cents: number | null;
  payment_status: string | null;
  blocked_reason: string | null;
  released_at: string | null;
  cancelled_at: string | null;
};

function statusMessage(status: OrderStatus): string {
  switch (status) {
    case "draft":
    case "uploaded":
    case "priced":
      return "The order has not been paid yet.";
    case "checkout_created":
      return "Secure checkout has been created but payment is not yet recorded.";
    case "paid":
    case "paid_pending_manual_fulfillment":
      return "Payment is recorded and MailMyPDF is preparing the mailing.";
    case "manual_fulfillment_in_progress":
      return "The mailing is being prepared for provider submission.";
    case "submitted_to_provider":
      return "The mailing has been submitted to the mail provider.";
    case "provider_processing":
      return "The mail provider is processing the mailing.";
    case "mailed":
      return "The mailing has been marked mailed.";
    case "in_transit":
      return "The mailing is in transit.";
    case "delivered":
      return "The mail provider has reported delivery.";
    case "returned":
      return "The mailing was returned to sender.";
    case "refunded":
      return "The order has been refunded.";
    case "failed_payment":
      return "Payment failed and the order needs attention.";
    case "failed_fulfillment":
      return "Fulfillment failed and the order needs attention.";
    case "failed_provider_submission":
      return "Submission to the mail provider failed and the order needs attention.";
    case "failed":
      return "The order is in a failed state and needs attention.";
    case "cancelled":
      return "The order was cancelled.";
    default:
      return "MailMyPDF has recorded the current order state.";
  }
}

function metadataObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function latestEvent(
  events: readonly OrderEventRow[],
  type: string,
): OrderEventRow | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index]?.type === type) return events[index] ?? null;
  }
  return null;
}

function directMailSnapshot(order: OrderRow) {
  return {
    sender: {
      name: order.sender_name,
      line1: order.sender_line1,
      line2: order.sender_line2,
      city: order.sender_city,
      state: order.sender_state,
      postal: order.sender_postal,
    },
    recipient: {
      name: order.recipient_name,
      line1: order.recipient_line1,
      line2: order.recipient_line2,
      city: order.recipient_city,
      state: order.recipient_state,
      postal: order.recipient_postal,
    },
    mailClass: order.mail_class,
    color: order.color ?? false,
  };
}

function directMailResumeState(
  order: OrderRow,
  events: readonly OrderEventRow[],
  schedule: ScheduledMailingStatusRow | null = null,
) {
  const preparedEvent = latestEvent(events, "mcp.direct_mail.prepared");
  const prepared = metadataObject(preparedEvent?.metadata);
  if (!prepared) return null;

  const snapshot = directMailSnapshot(order);
  const review = metadataObject(
    latestEvent(events, "mcp.direct_mail.addresses_reviewed")?.metadata,
  );
  const approval = metadataObject(
    latestEvent(events, "mcp.direct_mail.approved")?.metadata,
  );

  const reviewSnapshotMatches =
    review?.verified === true &&
    canonicalJSON(review.mailing_snapshot) === canonicalJSON(snapshot);
  const reviewExpiresAt =
    typeof review?.expires_at === "string" ? review.expires_at : null;
  const reviewCurrent =
    reviewSnapshotMatches &&
    Boolean(reviewExpiresAt && Date.parse(reviewExpiresAt) > Date.now());

  const approvalCurrent = Boolean(
    order.approved_packet_sha256 &&
      order.approved_price_cents !== null &&
      approval?.packet_sha256 === order.approved_packet_sha256 &&
      approval?.total_cents === order.approved_price_cents &&
      canonicalJSON(approval?.mailing_snapshot) === canonicalJSON(snapshot),
  );

  const source =
    prepared.source === "conversational-letter"
      ? "conversational_letter"
      : typeof prepared.secure_document_id === "string"
        ? "uploaded_pdf"
        : "direct_mail";

  let nextAction: { toolName: string; reason: string } | null = null;
  const scheduleActive =
    schedule?.status === "scheduled" || schedule?.status === "processing";
  const immediatePaymentActive =
    typeof order.payment_execution_key === "string" &&
    order.payment_execution_key.startsWith("immediate:");
  if (order.status === "draft" && !scheduleActive) {
    nextAction = immediatePaymentActive
      ? {
          toolName: "charge_and_send_direct_pdf_mail",
          reason:
            "A previously authorized immediate saved-payment execution owns this order's payment path. Retry that idempotent action to reconcile Stripe or fulfillment; do not create hosted checkout or schedule another payment path.",
        }
      : approvalCurrent
        ? {
            toolName: "get_payment_readiness",
            reason:
              "The exact mailing is approved. Check whether a saved payment method is ready before choosing immediate saved-payment send or hosted checkout.",
          }
        : {
            toolName: "review_direct_pdf_mail",
            reason: reviewCurrent
              ? "Reopen the exact current PDF/envelope review before asking for approval; the saved postal verification is still current."
              : "Build or refresh the exact PDF/envelope review and postal verification before approval.",
          };
  }

  return {
    source,
    preparedAt: preparedEvent?.created_at ?? null,
    preparedPacketSha256:
      typeof prepared.packet_sha256 === "string"
        ? prepared.packet_sha256
        : null,
    letterTextSha256:
      typeof prepared.letter_text_sha256 === "string"
        ? prepared.letter_text_sha256
        : null,
    review: {
      status: reviewCurrent
        ? "current"
        : review
          ? reviewSnapshotMatches
            ? "expired"
            : "stale"
          : "missing",
      expiresAt: reviewExpiresAt,
    },
    approval: {
      status: approvalCurrent ? "current" : approval ? "stale" : "missing",
      packetSha256: order.approved_packet_sha256,
      totalCents: order.approved_price_cents,
    },
    paymentExecution: immediatePaymentActive
      ? { kind: "immediate_saved_payment", status: "processing" }
      : null,
    nextAction,
  };
}

function firstMetadataString(
  events: readonly OrderEventRow[],
  keys: readonly string[],
): string | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const metadata = metadataObject(events[index]?.metadata);
    if (!metadata) continue;
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

async function requireMatterOwnership(
  matterId: string,
  context: AuthenticatedUserContext,
): Promise<void> {
  try {
    await loadCase(matterId, context);
  } catch (error) {
    if (error instanceof CaseNotFoundError) {
      throw new McpOrderStatusError(404, "Order not found");
    }
    throw error;
  }
}

function legacyOrderBelongsToUser(order: OrderRow, context: AuthenticatedUserContext): boolean {
  const userEmail = context.user.email?.trim().toLowerCase();
  return Boolean(userEmail && order.email.trim().toLowerCase() === userEmail);
}

async function directMcpOrderBelongsToUser(
  orderId: string,
  context: AuthenticatedUserContext,
  supabaseAdmin: any,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("order_events")
    .select("id")
    .eq("order_id", orderId)
    .eq("type", "mcp.direct_mail.prepared")
    .contains("metadata", { owner_id: context.user.id })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export function normalizeOrderStatus(
  order: OrderRow,
  events: readonly OrderEventRow[],
  schedule: ScheduledMailingStatusRow | null = null,
) {
  const trackingNumber = firstMetadataString(events, [
    "tracking_number",
    "trackingNumber",
  ]);
  const expectedDeliveryDate = firstMetadataString(events, [
    "expected_delivery_date",
    "expectedDeliveryDate",
  ]);

  return {
    orderId: order.id,
    status: order.status,
    statusMessage: statusMessage(order.status),
    paid: isPaidStatus(order.status),
    failed: isFailedStatus(order.status),
    terminal: isTerminalStatus(order.status),
    amountCents: order.approved_price_cents ?? order.price_cents,
    mailClass: order.mail_class,
    document: {
      fileName: order.file_name,
      pageCount: order.page_count,
    },
    recipient: {
      name: order.recipient_name,
      city: order.recipient_city,
      state: order.recipient_state,
    },
    workflow: {
      sectionId: order.vertical_slug,
      matterId: order.workflow_case_id,
      approvalId: order.case_approval_id,
      packetSha256: order.approved_packet_sha256,
    },
    timing: {
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      paidAt: order.paid_at,
      mailedAt: order.mailed_at,
      scheduledDeliveryDate: order.scheduled_delivery_date,
      expectedDeliveryDate,
    },
    tracking: {
      providerReference: order.lob_letter_id,
      trackingNumber,
    },
    directMail: directMailResumeState(order, events, schedule),
    scheduledMailing: schedule
      ? {
          scheduleId: schedule.id,
          status: schedule.status,
          sendAt: schedule.send_at,
          timezone: schedule.timezone,
          approvedMaxTotalCents: schedule.approved_max_total_cents,
          paymentAuthorizedAt: schedule.payment_authorized_at,
          paymentAmountCents: schedule.payment_amount_cents,
          paymentStatus: schedule.payment_status,
          blockedReason: schedule.blocked_reason,
          releasedAt: schedule.released_at,
          cancelledAt: schedule.cancelled_at,
          nextAction:
            schedule.status === "scheduled"
              ? {
                  toolName: "cancel_scheduled_mail",
                  reason: "The approved mailing is scheduled for future saved-payment execution. Cancel it before choosing a different payment path.",
                }
              : schedule.status === "processing"
                ? {
                    toolName: "get_order_status",
                    reason: "Scheduled payment or fulfillment is processing. Recheck persisted order state; do not start another payment path.",
                  }
                : null,
        }
      : null,
    history: events.map((event) => ({
      type: /^(order|payment|lob|fulfillment|workflow)\.[a-z0-9_.-]+$/i.test(event.type)
        ? event.type
        : "status_update",
      label: event.label,
      recordedAt: event.created_at,
    })),
  };
}

export async function getOwnedOrderStatus(
  request: Request,
  input: { orderId?: string; matterId?: string },
) {
  const orderId = input.orderId?.trim() || null;
  const matterId = input.matterId?.trim() || null;
  if (!orderId && !matterId) {
    throw new McpOrderStatusError(400, "order_id or matter_id is required");
  }

  const context = await requireAuthenticatedUser(request);
  if (matterId) await requireMatterOwnership(matterId, context);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let query = supabaseAdmin
    .from("orders")
    .select(
      "id,status,workflow_case_id,case_approval_id,approved_packet_sha256,approved_price_cents,price_cents,mail_class,color,sender_name,sender_line1,sender_line2,sender_city,sender_state,sender_postal,recipient_name,recipient_line1,recipient_line2,recipient_city,recipient_state,recipient_postal,lob_letter_id,mailed_at,paid_at,created_at,updated_at,scheduled_delivery_date,file_name,page_count,vertical_slug,email,payment_execution_key",
    )
    .order("created_at", { ascending: false })
    .limit(1);

  if (orderId) query = query.eq("id", orderId);
  if (matterId) query = query.eq("workflow_case_id", matterId);

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);
  const order = rows?.[0] as OrderRow | undefined;
  if (!order) throw new McpOrderStatusError(404, "Order not found");

  if (order.workflow_case_id) {
    if (!matterId || order.workflow_case_id !== matterId) {
      await requireMatterOwnership(order.workflow_case_id, context);
    }
  } else {
    const directOwned = await directMcpOrderBelongsToUser(order.id, context, supabaseAdmin);
    if (!directOwned && !legacyOrderBelongsToUser(order, context)) {
      throw new McpOrderStatusError(404, "Order not found");
    }
  }

  const { data: eventRows, error: eventError } = await supabaseAdmin
    .from("order_events")
    .select("type,label,created_at,metadata")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  if (eventError) throw new Error(eventError.message);
  const events = (eventRows ?? []) as OrderEventRow[];

  const { data: scheduleRow, error: scheduleError } = await supabaseAdmin
    .from("scheduled_mailings")
    .select(
      "id,status,send_at,timezone,approved_max_total_cents,payment_authorized_at,payment_amount_cents,payment_status,blocked_reason,released_at,cancelled_at",
    )
    .eq("order_id", order.id)
    .eq("owner_id", context.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (scheduleError) throw new Error(scheduleError.message);

  return normalizeOrderStatus(
    order,
    events,
    (scheduleRow as ScheduledMailingStatusRow | null) ?? null,
  );
}
