import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import {
  assertRecipient,
  materializeApprovedPacket,
} from "@/lib/secure-core/case-approval.server";
import { errorResponse, json, readJson, UUID_PATTERN } from "@/lib/secure-core/http.server";
import { DocumentService } from "@/services/document.service";
import {
  createStripeClient,
  getMailMyPdfBaseUrl,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

function randomToken(bytes = 24): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function createOrLoadOrder(input: {
  caseId: string;
  approvalId: string;
  sender: ReturnType<typeof assertRecipient>;
  userId: string;
  email: string;
  packet: Awaited<ReturnType<typeof materializeApprovedPacket>>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const documents = new DocumentService();

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("orders")
    .select("id, lookup_token, stripe_session_id, status, price_cents, approved_packet_sha256, approved_price_cents")
    .eq("case_approval_id", input.approvalId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) {
    if (
      existing.approved_packet_sha256 !== input.packet.packetSha256 ||
      existing.approved_price_cents !== input.packet.quote.totalCents
    ) {
      throw new Error("Existing workflow order does not match the approved packet.");
    }
    return existing;
  }

  const validated = await documents.validatePdf(input.packet.bytes);
  const expectedPages = input.packet.responsePages + input.packet.supportingPages;
  if (validated.pageCount !== expectedPages) {
    throw new Error("Approved packet page count changed before order creation.");
  }

  const orderId = crypto.randomUUID();
  const lookupToken = randomToken();
  const filename = `${input.packet.workflowId}-${input.caseId.slice(0, 8)}.pdf`;
  const uploaded = await documents.uploadDocument(orderId, filename, input.packet.bytes);

  const recipient = input.packet.recipient;
  const { data: created, error: insertError } = await supabaseAdmin
    .from("orders")
    .insert({
      id: orderId,
      lookup_token: lookupToken,
      email: input.email,
      sender_name: input.sender.name,
      sender_line1: input.sender.line1,
      sender_line2: input.sender.line2 ?? null,
      sender_city: input.sender.city,
      sender_state: input.sender.state.toUpperCase(),
      sender_postal: input.sender.postal,
      recipient_name: recipient.name,
      recipient_line1: recipient.line1,
      recipient_line2: recipient.line2 ?? null,
      recipient_city: recipient.city,
      recipient_state: recipient.state.toUpperCase(),
      recipient_postal: recipient.postal,
      file_name: filename,
      file_size_bytes: input.packet.bytes.byteLength,
      page_count: validated.pageCount,
      pdf_storage_path: uploaded.storagePath,
      price_cents: input.packet.quote.totalCents,
      approved_price_cents: input.packet.quote.totalCents,
      status: "draft",
      color: false,
      mail_class: input.packet.mailClass,
      vertical_slug: input.packet.verticalId,
      workflow_case_id: input.caseId,
      case_approval_id: input.approvalId,
      approved_packet_sha256: input.packet.packetSha256,
      vertical_metadata: {
        source: "secure-workflow",
        owner_user_id: input.userId,
        workflow_id: input.packet.workflowId,
        vertical_id: input.packet.verticalId,
        workflow_case_id: input.caseId,
        case_approval_id: input.approvalId,
        approved_packet_sha256: input.packet.packetSha256,
      },
    })
    .select("id, lookup_token, stripe_session_id, status, price_cents, approved_packet_sha256, approved_price_cents")
    .single();

  if (insertError || !created) {
    await documents.deleteDocument(uploaded.storagePath);

    // A concurrent request may have won the one-approval/one-order race.
    if (insertError?.code === "23505") {
      const { data: raced } = await supabaseAdmin
        .from("orders")
        .select("id, lookup_token, stripe_session_id, status, price_cents, approved_packet_sha256, approved_price_cents")
        .eq("case_approval_id", input.approvalId)
        .maybeSingle();
      if (raced) return raced;
    }
    throw new Error(insertError?.message ?? "Unable to create workflow mailing order.");
  }

  await supabaseAdmin.from("order_events").insert([
    {
      order_id: created.id,
      type: "order.created",
      label: "Approved workflow packet prepared for checkout",
      vertical_slug: input.packet.verticalId,
      metadata: {
        workflow_case_id: input.caseId,
        case_approval_id: input.approvalId,
        packet_sha256: input.packet.packetSha256,
      },
    },
    {
      order_id: created.id,
      type: "workflow.packet_bound",
      label: "Order bound to immutable approved packet",
      vertical_slug: input.packet.verticalId,
      metadata: {
        packet_sha256: input.packet.packetSha256,
        total_cents: input.packet.quote.totalCents,
      },
    },
  ]);

  return created;
}

async function ensureCheckoutSession(input: {
  order: {
    id: string;
    lookup_token: string;
    stripe_session_id: string | null;
    status: string;
    price_cents: number;
  };
  approvalId: string;
  caseId: string;
  workflowId: string;
  email: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const stripe = createStripeClient();

  if (input.order.stripe_session_id) {
    const priorSessionId = input.order.stripe_session_id;
    const existing = await stripe.checkout.sessions.retrieve(priorSessionId);
    if (existing.status === "open" && existing.url) {
      return { checkoutUrl: existing.url, sessionId: existing.id };
    }
    if (existing.status === "complete") {
      return { checkoutUrl: null, sessionId: existing.id };
    }

    // Expired/cancelled sessions must release the order claim before a new
    // approval-bound checkout can be created.
    const { data: released, error: releaseError } = await supabaseAdmin
      .from("orders")
      .update({ stripe_session_id: null })
      .eq("id", input.order.id)
      .eq("status", "draft")
      .eq("stripe_session_id", priorSessionId)
      .select("id");

    if (releaseError) throw new Error(releaseError.message);
    if (released && released.length === 1) {
      input.order.stripe_session_id = null;
    } else {
      const { data: current } = await supabaseAdmin
        .from("orders")
        .select("stripe_session_id, status")
        .eq("id", input.order.id)
        .maybeSingle();
      if (current?.status !== "draft") {
        return { checkoutUrl: null, sessionId: current?.stripe_session_id ?? priorSessionId };
      }
      if (current?.stripe_session_id) {
        const winner = await stripe.checkout.sessions.retrieve(current.stripe_session_id);
        if (winner.status === "open" && winner.url) {
          return { checkoutUrl: winner.url, sessionId: winner.id };
        }
      }
      throw new Error("Unable to release the expired checkout session.");
    }
  }

  if (input.order.status !== "draft") {
    return { checkoutUrl: null, sessionId: input.order.stripe_session_id };
  }

  const baseUrl = getMailMyPdfBaseUrl();
  const successUrl = new URL(`/orders/${input.order.id}`, `${baseUrl}/`);
  successUrl.searchParams.set("token", input.order.lookup_token);
  successUrl.searchParams.set("paid", "1");

  const cancelUrl = new URL(`/notice/${input.workflowId}`, `${baseUrl}/`);
  cancelUrl.searchParams.set("case", input.caseId);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.email,
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: "MailMyPDF approved response packet",
          description: `${input.workflowId} · approved packet`,
        },
        unit_amount: input.order.price_cents,
      },
      quantity: 1,
    }],
    metadata: {
      orderId: input.order.id,
      workflowCaseId: input.caseId,
      caseApprovalId: input.approvalId,
    },
    payment_intent_data: {
      metadata: {
        orderId: input.order.id,
        workflowCaseId: input.caseId,
        caseApprovalId: input.approvalId,
      },
    },
  }, {
    idempotencyKey: `workflow_checkout_${input.approvalId}`,
  });

  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("orders")
    .update({ stripe_session_id: session.id })
    .eq("id", input.order.id)
    .eq("status", "draft")
    .is("stripe_session_id", null)
    .select("id");

  if (claimError) throw new Error(claimError.message);

  if (!claimed || claimed.length !== 1) {
    const { data: winner } = await supabaseAdmin
      .from("orders")
      .select("stripe_session_id, status")
      .eq("id", input.order.id)
      .maybeSingle();

    if (winner?.stripe_session_id === session.id && winner.status === "draft") {
      return { checkoutUrl: session.url, sessionId: session.id };
    }

    try { await stripe.checkout.sessions.expire(session.id); } catch {}

    if (winner?.stripe_session_id) {
      const existing = await stripe.checkout.sessions.retrieve(winner.stripe_session_id);
      return {
        checkoutUrl: existing.status === "open" ? existing.url : null,
        sessionId: existing.id,
      };
    }

    throw new Error("Checkout session could not be bound to the approved order.");
  }

  return { checkoutUrl: session.url, sessionId: session.id };
}

export const Route = createFileRoute("/api/v2/cases/$id/checkout")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });

          const context = await requireAuthenticatedUser(request);
          if (!context.user.email) {
            return json(400, { error: "A verified account email is required for payment receipts." });
          }

          const body = await readJson(request);
          const approvalId = typeof body.approval_id === "string" ? body.approval_id : "";
          if (!UUID_PATTERN.test(approvalId)) {
            return json(400, { error: "A valid approval ID is required." });
          }

          const sender = assertRecipient(body.sender);
          const packet = await materializeApprovedPacket(params.id, approvalId, context);

          const order = await createOrLoadOrder({
            caseId: params.id,
            approvalId,
            sender,
            userId: context.user.id,
            email: context.user.email,
            packet,
          });

          const checkout = await ensureCheckoutSession({
            order,
            approvalId,
            caseId: params.id,
            workflowId: packet.workflowId,
            email: context.user.email,
          });

          return json(200, {
            order_id: order.id,
            order_token: order.lookup_token,
            checkout_url: checkout.checkoutUrl,
            stripe_session_id: checkout.sessionId,
            total_cents: packet.quote.totalCents,
            packet_sha256: packet.packetSha256,
          });
        } catch (error) {
          if (error && typeof error === "object" && "type" in error) {
            return json(502, { error: getStripeErrorMessage(error) });
          }
          return errorResponse("case-checkout", error);
        }
      },
    },
  },
});
