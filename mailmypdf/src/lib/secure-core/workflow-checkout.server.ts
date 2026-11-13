import { assertRecipient, materializeApprovedPacket } from "./case-approval.server";
import {
  assertApprovedWorkflowOrderMatches,
  assertHostedCheckoutSessionMatches,
  workflowCheckoutAttemptKey,
} from "./approved-order-binding";
import { DocumentService } from "@/services/document.service";
import {
  createStripeClient,
  getMailMyPdfBaseUrl,
} from "@/lib/stripe.server";

function randomToken(bytes = 24): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createOrLoadOrder(input: {
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
    .select("id, lookup_token, stripe_session_id, status, price_cents, approved_packet_sha256, approved_price_cents, case_approval_id, workflow_case_id, vertical_metadata, email, sender_name, sender_line1, sender_line2, sender_city, sender_state, sender_postal")
    .eq("case_approval_id", input.approvalId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) {
    assertApprovedWorkflowOrderMatches(existing, {
      ownerId: input.userId,
      caseId: input.caseId,
      approvalId: input.approvalId,
      packetSha256: input.packet.packetSha256,
      totalCents: input.packet.quote.totalCents,
      email: input.email,
      sender: input.sender,
    });
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
    .select("id, lookup_token, stripe_session_id, status, price_cents, approved_packet_sha256, approved_price_cents, case_approval_id, workflow_case_id, vertical_metadata, email, sender_name, sender_line1, sender_line2, sender_city, sender_state, sender_postal")
    .single();

  if (insertError || !created) {
    await documents.deleteDocument(uploaded.storagePath);

    // A concurrent request may have won the one-approval/one-order race.
    if (insertError?.code === "23505") {
      const { data: raced } = await supabaseAdmin
        .from("orders")
        .select("id, lookup_token, stripe_session_id, status, price_cents, approved_packet_sha256, approved_price_cents, case_approval_id, workflow_case_id, vertical_metadata, email, sender_name, sender_line1, sender_line2, sender_city, sender_state, sender_postal")
        .eq("case_approval_id", input.approvalId)
        .maybeSingle();
      if (raced) {
        // A unique-constraint race must obey the same owner/hash/price guard
        // as the ordinary reused-order path, never blindly return the winner.
        assertApprovedWorkflowOrderMatches(raced, {
          ownerId: input.userId,
          caseId: input.caseId,
          approvalId: input.approvalId,
          packetSha256: input.packet.packetSha256,
          totalCents: input.packet.quote.totalCents,
          email: input.email,
          sender: input.sender,
        });
        return raced;
      }
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

export async function ensureCheckoutSession(input: {
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
  connectorOperation?: {
    operationId: string;
    requestSha256: string;
  };
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // An order that is already paid must never offer another open checkout URL.
  if (input.order.status !== "draft") {
    return { checkoutUrl: null, sessionId: input.order.stripe_session_id };
  }
  const stripe = createStripeClient();

  const bindConnectorReceipt = async <T extends {
    id: string;
    metadata: Record<string, string> | null;
  }>(session: T): Promise<T> => {
    const correlation = input.connectorOperation;
    if (!correlation) return session;

    const priorOperationId = session.metadata?.connectorOperationId;
    const priorRequestSha256 = session.metadata?.connectorRequestSha256;
    if (priorOperationId || priorRequestSha256) {
      // Correlation is immutable. A later operation may safely reuse the same
      // approval-bound checkout, but it must not steal the earlier receipt.
      return session;
    }

    const bound = await stripe.checkout.sessions.update(session.id, {
      metadata: {
        connectorOperationId: correlation.operationId,
        connectorRequestSha256: correlation.requestSha256,
      },
    });
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", input.order.id)
      .eq("stripe_session_id", session.id);
    if (error) throw new Error("Unable to persist checkout receipt correlation.");
    return bound as T;
  };

  let replacedSessionId: string | null = null;
  if (input.order.stripe_session_id) {
    const priorSessionId = input.order.stripe_session_id;
    let existing = await stripe.checkout.sessions.retrieve(priorSessionId);
    assertHostedCheckoutSessionMatches(
      existing, input.order, input.approvalId, input.caseId,
    );
    if (existing.status === "open") {
      if (!existing.url) throw new Error("Stripe has no payable link for the existing checkout.");
      existing = await bindConnectorReceipt(existing);
      return { checkoutUrl: existing.url, sessionId: existing.id };
    }
    if (existing.status === "complete") {
      await bindConnectorReceipt(existing);
      return { checkoutUrl: null, sessionId: existing.id };
    }
    if (existing.status !== "expired") {
      throw new Error("Unable to safely replace the existing checkout session.");
    }

    // Keep the expired session ID as a database compare-and-swap token.
    // Clearing it before creating a replacement would expose a window where
    // a concurrent retry reused the original Stripe idempotency key and
    // received the same expired session indefinitely.
    replacedSessionId = priorSessionId;
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
      ...(input.connectorOperation ? {
        connectorOperationId: input.connectorOperation.operationId,
        connectorRequestSha256: input.connectorOperation.requestSha256,
      } : {}),
    },
    payment_intent_data: {
      metadata: {
        orderId: input.order.id,
        workflowCaseId: input.caseId,
        caseApprovalId: input.approvalId,
      },
    },
  }, {
    idempotencyKey: await workflowCheckoutAttemptKey(input.approvalId, replacedSessionId),
  });

  assertHostedCheckoutSessionMatches(session, input.order, input.approvalId, input.caseId);
  const claimQuery = supabaseAdmin
    .from("orders")
    .update({ stripe_session_id: session.id })
    .eq("id", input.order.id)
    .eq("status", "draft");
  const { data: claimed, error: claimError } = await (
    replacedSessionId
      ? claimQuery.eq("stripe_session_id", replacedSessionId)
      : claimQuery.is("stripe_session_id", null)
  ).select("id");

  if (claimError) throw new Error(claimError.message);

  if (!claimed || claimed.length !== 1) {
    const { data: winner } = await supabaseAdmin
      .from("orders")
      .select("stripe_session_id, status")
      .eq("id", input.order.id)
      .maybeSingle();

    if (winner?.stripe_session_id === session.id) {
      // The matching session was claimed (or already paid) by a concurrent
      // request. Never expire another request's winning checkout.
      return { checkoutUrl: winner.status === "draft" ? session.url : null, sessionId: session.id };
    }

    try { await stripe.checkout.sessions.expire(session.id); } catch {}

    if (winner?.stripe_session_id) {
      const existing = await stripe.checkout.sessions.retrieve(winner.stripe_session_id);
      assertHostedCheckoutSessionMatches(existing, input.order, input.approvalId, input.caseId);
      return {
        checkoutUrl: winner.status === "draft" && existing.status === "open" ? existing.url : null,
        sessionId: existing.id,
      };
    }

    throw new Error("Checkout session could not be bound to the approved order.");
  }

  return { checkoutUrl: session.url, sessionId: session.id };
}
