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
};

type OrderEventRow = {
  type: string;
  label: string;
  created_at: string;
  metadata: unknown;
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
      "id,status,workflow_case_id,case_approval_id,approved_packet_sha256,approved_price_cents,price_cents,mail_class,lob_letter_id,mailed_at,paid_at,created_at,updated_at,scheduled_delivery_date,recipient_name,recipient_city,recipient_state,file_name,page_count,vertical_slug,email",
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

  return normalizeOrderStatus(order, events);
}
