import type Stripe from "stripe";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validateOrderAddresses } from "@/lib/address-validation";
import { flags } from "@/lib/feature-flags";
import { submitOrderToLob } from "@/lib/lob.server";
import { createStripeClient } from "@/lib/stripe.server";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import {
  loadApprovedDirectMailExecutionState,
  McpDirectMailError,
  type ApprovedDirectMailExecutionState,
} from "@/lib/mcp/direct-mail.server";
import {
  classifyScheduledPaymentIntentStatus,
  scheduledAddressVerificationReady,
} from "@/lib/scheduled-mail.server";
import { getStateMachineService } from "@/services";

type BillingProfileRow = Database["public"]["Tables"]["account_billing_profiles"]["Row"];

const SOURCE = "mcp_immediate_saved_payment";

export class ImmediateMailError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ImmediateMailError";
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ImmediateMailError(400, `${field} is required`);
  }
  return value.trim();
}

function expectedSha256(value: unknown): string {
  const sha = requiredString(value, "expected_packet_sha256");
  if (!/^[a-f0-9]{64}$/.test(sha)) {
    throw new ImmediateMailError(
      400,
      "expected_packet_sha256 must be a lowercase SHA-256",
    );
  }
  return sha;
}

function expectedCents(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new ImmediateMailError(
      400,
      "expected_total_cents must be a non-negative integer",
    );
  }
  return value;
}

function expectedRevision(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new ImmediateMailError(
      400,
      "expected_payment_revision must be a non-negative integer",
    );
  }
  return value;
}

async function loadBillingProfile(ownerId: string): Promise<BillingProfileRow | null> {
  const { data, error } = await supabaseAdmin
    .from("account_billing_profiles")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new ImmediateMailError(500, "Unable to load saved payment readiness");
  return data;
}

function billingReady(profile: BillingProfileRow | null): profile is BillingProfileRow {
  return Boolean(
    profile?.payment_ready &&
      profile.stripe_customer_id &&
      profile.default_payment_method_id &&
      profile.payment_last4 &&
      profile.payment_brand,
  );
}

function publicPayment(profile: BillingProfileRow) {
  return {
    display: `${profile.payment_brand || "Card"} •••• ${profile.payment_last4}`,
    brand: profile.payment_brand,
    last4: profile.payment_last4,
    revision: profile.revision,
  };
}

function immediateExecutionKey(
  state: ApprovedDirectMailExecutionState,
  authorizedPaymentRevision: number,
): string {
  return [
    "immediate",
    state.orderId,
    state.packetSha256.slice(0, 16),
    state.approvedMaxTotalCents,
    authorizedPaymentRevision,
  ].join(":");
}

async function immediatePaymentEvent(
  orderId: string,
  ownerId: string,
  packetSha256: string,
) {
  const { data, error } = await supabaseAdmin
    .from("order_events")
    .select("metadata")
    .eq("order_id", orderId)
    .eq("type", "payment.received")
    .contains("metadata", {
      source: SOURCE,
      owner_id: ownerId,
      approval_sha256: packetSha256,
    })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ImmediateMailError(500, "Unable to reconcile saved-payment execution");
  const metadata =
    data?.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? data.metadata as Record<string, unknown>
      : null;
  return metadata;
}

async function clearPaymentClaim(orderId: string, executionKey: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ payment_execution_key: null })
    .eq("id", orderId)
    .eq("status", "draft")
    .eq("payment_execution_key", executionKey)
    .select("id");
  if (error) throw new ImmediateMailError(500, "Unable to release the saved-payment execution lock");
  return Boolean(data?.length);
}

async function claimPaymentPath(
  state: ApprovedDirectMailExecutionState,
  executionKey: string,
): Promise<{ reused: boolean }> {
  const { data: existing, error: readError } = await supabaseAdmin
    .from("orders")
    .select("status,stripe_session_id,payment_execution_key")
    .eq("id", state.orderId)
    .maybeSingle();
  if (readError || !existing) {
    throw new ImmediateMailError(500, "Unable to verify the order payment path");
  }

  if (existing.stripe_session_id) {
    throw new ImmediateMailError(
      409,
      "Hosted checkout already owns this order's payment path",
      "HOSTED_CHECKOUT_ACTIVE",
    );
  }
  if (existing.payment_execution_key) {
    if (existing.payment_execution_key === executionKey) return { reused: true };
    throw new ImmediateMailError(
      409,
      "Another saved-payment or scheduled execution already owns this order's payment path",
      "PAYMENT_PATH_ALREADY_CLAIMED",
    );
  }
  if (existing.status !== "draft") {
    throw new ImmediateMailError(
      409,
      "This order is no longer an unpaid draft",
      "ORDER_NOT_DRAFT",
    );
  }

  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("orders")
    .update({ payment_execution_key: executionKey })
    .eq("id", state.orderId)
    .eq("status", "draft")
    .is("stripe_session_id", null)
    .is("payment_execution_key", null)
    .select("id");

  if (claimError) {
    throw new ImmediateMailError(500, "Unable to reserve the order payment path");
  }
  if (claimed?.length === 1) return { reused: false };

  const { data: winner, error: winnerError } = await supabaseAdmin
    .from("orders")
    .select("status,stripe_session_id,payment_execution_key")
    .eq("id", state.orderId)
    .maybeSingle();
  if (winnerError || !winner) {
    throw new ImmediateMailError(409, "The order payment path changed");
  }
  if (winner.payment_execution_key === executionKey && !winner.stripe_session_id) return { reused: true };
  if (winner.stripe_session_id) {
    throw new ImmediateMailError(
      409,
      "Hosted checkout won the order payment race",
      "HOSTED_CHECKOUT_ACTIVE",
    );
  }
  throw new ImmediateMailError(
    409,
    "Another payment execution won the order payment race",
    "PAYMENT_PATH_ALREADY_CLAIMED",
  );
}

async function createOrResumePaymentIntent(args: {
  state: ApprovedDirectMailExecutionState;
  profile: BillingProfileRow;
  executionKey: string;
  authorizedPaymentRevision: number;
}) {
  const stripe = createStripeClient();
  let paymentIntent = await stripe.paymentIntents.create(
    {
      amount: args.state.currentTotalCents,
      currency: "usd",
      customer: args.profile.stripe_customer_id!,
      metadata: {
        orderId: args.state.orderId,
        ownerId: args.state.ownerId,
        source: SOURCE,
        approvalSha256: args.state.packetSha256,
        paymentRevision: String(args.authorizedPaymentRevision),
      },
      description: `MailMyPDF approved mailing ${args.state.orderId}`,
    },
    { idempotencyKey: `immediate_pi_create_${args.executionKey}` },
  );

  const customerId =
    typeof paymentIntent.customer === "string"
      ? paymentIntent.customer
      : paymentIntent.customer && typeof paymentIntent.customer === "object" && "id" in paymentIntent.customer
        ? String(paymentIntent.customer.id)
        : null;

  if (
    paymentIntent.amount !== args.state.currentTotalCents ||
    paymentIntent.currency !== "usd" ||
    customerId !== args.profile.stripe_customer_id ||
    paymentIntent.metadata?.orderId !== args.state.orderId ||
    paymentIntent.metadata?.ownerId !== args.state.ownerId ||
    paymentIntent.metadata?.source !== SOURCE ||
    paymentIntent.metadata?.approvalSha256 !== args.state.packetSha256 ||
    paymentIntent.metadata?.paymentRevision !== String(args.authorizedPaymentRevision)
  ) {
    throw new ImmediateMailError(
      409,
      "Stripe PaymentIntent identity does not match the approved mailing",
      "PAYMENT_INTENT_IDENTITY_MISMATCH",
    );
  }

  const mayConfirmWithCurrentSavedMethod =
    args.profile.revision === args.authorizedPaymentRevision;
  if (
    mayConfirmWithCurrentSavedMethod &&
    (paymentIntent.status === "requires_confirmation" ||
      paymentIntent.status === "requires_payment_method")
  ) {
    try {
      paymentIntent = await stripe.paymentIntents.confirm(
        paymentIntent.id,
        {
          payment_method: args.profile.default_payment_method_id!,
          off_session: true,
        },
        { idempotencyKey: `immediate_pi_confirm_${args.executionKey}` },
      );
    } catch {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntent.id);
    }
  }

  return { stripe, paymentIntent };
}

async function releaseBlockedPayment(
  orderId: string,
  executionKey: string,
  stripe: Stripe,
  paymentIntent: Stripe.PaymentIntent,
): Promise<boolean> {
  let current = paymentIntent;
  if (current.status !== "canceled") {
    try {
      current = await stripe.paymentIntents.cancel(current.id);
    } catch {
      return false;
    }
  }
  if (current.status !== "canceled") return false;
  return clearPaymentClaim(orderId, executionKey);
}

function alreadyBeyondProviderSubmission(status: string): boolean {
  return [
    "submitted_to_provider",
    "provider_processing",
    "mailed",
    "in_transit",
    "delivered",
    "returned",
  ].includes(status);
}

async function resumeImmediateFulfillment(
  state: ApprovedDirectMailExecutionState,
  paymentEvent: Record<string, unknown>,
) {
  const paymentIntentId =
    typeof paymentEvent.payment_intent_id === "string"
      ? paymentEvent.payment_intent_id
      : typeof paymentEvent.external_id === "string"
        ? paymentEvent.external_id
        : null;

  if (alreadyBeyondProviderSubmission(state.status)) {
    return {
      status: "already_submitted",
      orderId: state.orderId,
      paymentIntentId,
      paymentSucceeded: true,
      mailingSubmitted: true,
      reused: true,
      nextAction: "Use get_order_status for provider, tracking, mailing, or delivery updates.",
    };
  }

  if (
    ![
      "paid_pending_manual_fulfillment",
      "manual_fulfillment_in_progress",
      "failed_fulfillment",
      "failed_provider_submission",
    ].includes(state.status)
  ) {
    throw new ImmediateMailError(
      409,
      `This order cannot resume immediate fulfillment from status ${state.status}`,
      "IMMEDIATE_FULFILLMENT_NOT_RESUMABLE",
    );
  }

  try {
    const fulfillment = await submitOrderToLob(state.orderId);
    return {
      status: "submitted",
      orderId: state.orderId,
      paymentIntentId,
      paymentSucceeded: true,
      mailingSubmitted: true,
      reused: "skipped" in fulfillment,
      nextAction: "Use get_order_status for provider, tracking, mailing, or delivery updates.",
    };
  } catch (error) {
    return {
      status: "paid_pending_fulfillment",
      orderId: state.orderId,
      paymentIntentId,
      paymentSucceeded: true,
      mailingSubmitted: false,
      reused: true,
      reason:
        error instanceof Error
          ? error.message
          : "Payment succeeded but mailing submission needs retry",
      nextAction:
        "Retry charge_and_send_direct_pdf_mail with the same approved values. It will not charge again; it will resume fulfillment.",
    };
  }
}

export async function chargeAndSendDirectPdfMail(
  request: Request,
  raw: {
    orderId: unknown;
    expectedPacketSha256: unknown;
    expectedTotalCents: unknown;
    expectedPaymentRevision: unknown;
    authorizeSavedPayment: unknown;
    userConfirmedSend: unknown;
  },
) {
  if (raw.authorizeSavedPayment !== true || raw.userConfirmedSend !== true) {
    throw new ImmediateMailError(
      400,
      "authorize_saved_payment and user_confirmed_send must both be true only after the user explicitly authorizes the displayed saved payment method, exact amount, and immediate mailing",
      "EXPLICIT_SEND_AUTHORIZATION_REQUIRED",
    );
  }

  const context = await requireAuthenticatedUser(request);
  const orderId = requiredString(raw.orderId, "order_id");
  const packetSha256 = expectedSha256(raw.expectedPacketSha256);
  const totalCents = expectedCents(raw.expectedTotalCents);
  const paymentRevision = expectedRevision(raw.expectedPaymentRevision);

  if (!flags.isAutoSubmitEnabled() || !flags.isLobEnabled()) {
    throw new ImmediateMailError(
      503,
      "Immediate saved-payment mailing is unavailable because automatic provider submission is disabled",
      "IMMEDIATE_FULFILLMENT_DISABLED",
    );
  }

  let state: ApprovedDirectMailExecutionState;
  try {
    state = await loadApprovedDirectMailExecutionState(orderId, context.user.id);
  } catch (error) {
    if (error instanceof McpDirectMailError) {
      throw new ImmediateMailError(error.status, error.message);
    }
    throw error;
  }

  if (
    state.packetSha256 !== packetSha256 ||
    state.approvedMaxTotalCents !== totalCents ||
    state.currentTotalCents !== totalCents
  ) {
    throw new ImmediateMailError(
      409,
      "The approved PDF or current price no longer matches the user's send-now confirmation. Review and approve again.",
      "APPROVAL_OR_PRICE_CHANGED",
      {
        approvedPacketSha256: state.packetSha256,
        approvedTotalCents: state.approvedMaxTotalCents,
        currentTotalCents: state.currentTotalCents,
      },
    );
  }

  const paidEvent = await immediatePaymentEvent(
    state.orderId,
    context.user.id,
    state.packetSha256,
  );
  if (state.status !== "draft") {
    if (!paidEvent) {
      throw new ImmediateMailError(
        409,
        "This order was paid or changed through a different payment path",
        "DIFFERENT_PAYMENT_PATH",
      );
    }
    return resumeImmediateFulfillment(state, paidEvent);
  }

  const profile = await loadBillingProfile(context.user.id);
  if (!billingReady(profile)) {
    throw new ImmediateMailError(
      409,
      "A verified saved payment method is required. Call get_payment_readiness before trying to send now.",
      "SAVED_PAYMENT_REQUIRED",
    );
  }
  const addressCheck = await validateOrderAddresses(state.recipient, state.sender);
  if (!scheduledAddressVerificationReady(addressCheck)) {
    throw new ImmediateMailError(
      409,
      "Current postal verification did not clear both sender and recipient addresses. Review the mailing again before charging.",
      "ADDRESS_REVERIFICATION_REQUIRED",
    );
  }

  const executionKey = immediateExecutionKey(state, paymentRevision);
  const paymentClaim = await claimPaymentPath(state, executionKey);
  if (!paymentClaim.reused && profile.revision !== paymentRevision) {
    await clearPaymentClaim(state.orderId, executionKey);
    throw new ImmediateMailError(
      409,
      "The saved payment method changed after the user confirmed it. Show the current saved payment method and ask again before charging.",
      "SAVED_PAYMENT_CHANGED",
      {
        currentPaymentRevision: profile.revision,
        payment: publicPayment(profile),
      },
    );
  }

  let stripe: Stripe;
  let paymentIntent: Stripe.PaymentIntent;
  try {
    ({ stripe, paymentIntent } = await createOrResumePaymentIntent({
      state,
      profile,
      executionKey,
      authorizedPaymentRevision: paymentRevision,
    }));
  } catch (error) {
    if (error instanceof ImmediateMailError) throw error;
    throw new ImmediateMailError(
      503,
      error instanceof Error ? error.message : "Saved-payment provider request failed",
      "IMMEDIATE_PAYMENT_RETRY",
    );
  }

  const paymentState = classifyScheduledPaymentIntentStatus(paymentIntent.status);
  if (paymentState === "wait") {
    return {
      status: "payment_processing",
      orderId: state.orderId,
      paymentIntentId: paymentIntent.id,
      paymentStatus: paymentIntent.status,
      payment: publicPayment(profile),
      paymentSucceeded: false,
      mailingSubmitted: false,
      reused: true,
      nextAction:
        "Retry charge_and_send_direct_pdf_mail with the same approved values. Do not start another payment path while Stripe is processing.",
    };
  }

  if (paymentState === "blocked") {
    const savedPaymentChanged = profile.revision !== paymentRevision;
    const released = await releaseBlockedPayment(
      state.orderId,
      executionKey,
      stripe,
      paymentIntent,
    );
    return {
      status: savedPaymentChanged ? "saved_payment_changed" : "payment_attention_required",
      orderId: state.orderId,
      paymentIntentId: paymentIntent.id,
      paymentStatus: paymentIntent.status,
      payment: publicPayment(profile),
      paymentSucceeded: false,
      mailingSubmitted: false,
      reused: false,
      paymentPathReleased: released,
      nextAction: released
        ? "Call get_payment_readiness. Show the current card summary and exact total, then ask for fresh explicit send-now authorization before another charge attempt."
        : "Do not start another payment path. The saved-payment attempt could not be safely released; check get_order_status before retrying.",
    };
  }

  const paidAt = new Date().toISOString();
  const transition = await getStateMachineService().transitionOrder(
    state.orderId,
    "paid_pending_manual_fulfillment",
    {
      triggeredBy: "user",
      metadata: {
        external_id: paymentIntent.id,
        payment_intent_id: paymentIntent.id,
        source: SOURCE,
        owner_id: context.user.id,
        approval_sha256: state.packetSha256,
        amount_cents: state.currentTotalCents,
        payment_revision: profile.revision,
      },
      extraUpdate: {
        paid_at: paidAt,
        price_cents: state.currentTotalCents,
        payment_execution_key: null,
      },
      labelOverride: "Immediate saved payment received",
    },
  );

  if (!transition.ok || !transition.persisted) {
    const reconciled = await immediatePaymentEvent(
      state.orderId,
      context.user.id,
      state.packetSha256,
    );
    if (!reconciled) {
      throw new ImmediateMailError(
        503,
        "Stripe payment succeeded but the paid order transition needs reconciliation",
        "IMMEDIATE_PAYMENT_RECONCILE",
        { paymentIntentId: paymentIntent.id },
      );
    }
  }

  const refreshed = await loadApprovedDirectMailExecutionState(
    state.orderId,
    context.user.id,
  );
  const paymentEvent =
    (await immediatePaymentEvent(
      state.orderId,
      context.user.id,
      state.packetSha256,
    )) ?? {
      payment_intent_id: paymentIntent.id,
      external_id: paymentIntent.id,
    };

  return resumeImmediateFulfillment(refreshed, paymentEvent);
}
