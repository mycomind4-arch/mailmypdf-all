import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validateOrderAddresses } from "@/lib/address-validation";
import { flags } from "@/lib/feature-flags";
import { submitOrderToLob } from "@/lib/lob.server";
import { isPaidStatus } from "@/lib/order-state-machine";
import { createStripeClient } from "@/lib/stripe.server";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import {
  loadApprovedDirectMailExecutionState,
  McpDirectMailError,
  type ApprovedDirectMailExecutionState,
} from "@/lib/mcp/direct-mail.server";
import { getStateMachineService } from "@/services";

type ScheduledMailingRow = Database["public"]["Tables"]["scheduled_mailings"]["Row"];
type BillingProfileRow = Database["public"]["Tables"]["account_billing_profiles"]["Row"];

export type ScheduledMailExecutionResult =
  | { status: "not_due" | "deferred" | "processing"; scheduleId: string; reason?: string; paymentIntentId?: string | null }
  | { status: "blocked"; scheduleId: string; reason: string; paymentIntentId?: string | null }
  | { status: "released"; scheduleId: string; orderId: string; paymentIntentId: string | null; reused: boolean }
  | { status: "cancelled" | "already_released"; scheduleId: string };

export class ScheduledMailError extends Error {
  constructor(readonly status: number, message: string, readonly code?: string) {
    super(message);
    this.name = "ScheduledMailError";
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ScheduledMailError(400, `${field} is required`);
  }
  return value.trim();
}

function parseIdempotencyKey(value: unknown): string {
  const key = requiredString(value, "idempotency_key");
  if (key.length < 8 || key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new ScheduledMailError(
      400,
      "idempotency_key must be 8-128 letters, numbers, periods, underscores, colons, or hyphens",
    );
  }
  return key;
}

function parseFutureInstant(value: unknown): string {
  const raw = requiredString(value, "send_at");
  const time = Date.parse(raw);
  if (!Number.isFinite(time)) throw new ScheduledMailError(400, "send_at must be a valid ISO date-time");
  if (time <= Date.now()) throw new ScheduledMailError(400, "send_at must be in the future");
  return new Date(time).toISOString();
}

function parseTimezone(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const timezone = requiredString(value, "timezone");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new ScheduledMailError(400, "timezone must be a valid IANA time zone");
  }
  return timezone;
}

function publicSchedule(row: ScheduledMailingRow) {
  return {
    scheduleId: row.id,
    orderId: row.order_id,
    sendAt: row.send_at,
    timezone: row.timezone,
    status: row.status,
    approvedMaxTotalCents: row.approved_max_total_cents,
    paymentAuthorizedAt: row.payment_authorized_at,
    paymentAmountCents: row.payment_amount_cents,
    paymentStatus: row.payment_status,
    blockedReason: row.blocked_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadSchedule(scheduleId: string): Promise<ScheduledMailingRow | null> {
  const { data, error } = await supabaseAdmin
    .from("scheduled_mailings")
    .select("*")
    .eq("id", scheduleId)
    .maybeSingle();
  if (error) throw new ScheduledMailError(500, "Unable to load scheduled mailing");
  return data;
}

async function loadBillingProfile(ownerId: string): Promise<BillingProfileRow | null> {
  const { data, error } = await supabaseAdmin
    .from("account_billing_profiles")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new ScheduledMailError(500, "Unable to load saved payment readiness");
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

async function blockSchedule(
  schedule: ScheduledMailingRow,
  reason: string,
  options: {
    paymentIntentId?: string | null;
    paymentStatus?: string | null;
    clearPaymentClaim?: boolean;
  } = {},
): Promise<ScheduledMailExecutionResult> {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("scheduled_mailings")
    .update({
      status: "blocked",
      blocked_reason: reason.slice(0, 500),
      ...(options.paymentIntentId !== undefined
        ? { stripe_payment_intent_id: options.paymentIntentId }
        : {}),
      ...(options.paymentStatus !== undefined
        ? { payment_status: options.paymentStatus }
        : {}),
      last_attempt_at: now,
      updated_at: now,
    })
    .eq("id", schedule.id)
    .eq("owner_id", schedule.owner_id);
  if (error) throw new ScheduledMailError(500, "Unable to block scheduled mailing safely");

  if (options.clearPaymentClaim && schedule.order_id) {
    await supabaseAdmin
      .from("orders")
      .update({ payment_execution_key: null })
      .eq("id", schedule.order_id)
      .eq("status", "draft")
      .eq("payment_execution_key", `scheduled:${schedule.id}`);
  }

  return {
    status: "blocked",
    scheduleId: schedule.id,
    reason,
    paymentIntentId: options.paymentIntentId ?? schedule.stripe_payment_intent_id,
  };
}

async function markScheduleReleased(
  schedule: ScheduledMailingRow,
  paymentIntentId: string | null,
  reused: boolean,
): Promise<ScheduledMailExecutionResult> {
  if (!schedule.order_id) throw new ScheduledMailError(409, "Scheduled mailing has no order");
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("scheduled_mailings")
    .update({
      status: "released",
      released_at: now,
      blocked_reason: null,
      ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId, payment_status: "succeeded" } : {}),
      last_attempt_at: now,
      updated_at: now,
    })
    .eq("id", schedule.id)
    .eq("owner_id", schedule.owner_id);
  if (error) throw new ScheduledMailError(500, "Mailing was submitted but schedule release state could not be saved");
  return {
    status: "released",
    scheduleId: schedule.id,
    orderId: schedule.order_id,
    paymentIntentId,
    reused,
  };
}

async function scheduledPaymentEventExists(orderId: string, scheduleId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("order_events")
    .select("id")
    .eq("order_id", orderId)
    .eq("type", "payment.received")
    .contains("metadata", { schedule_id: scheduleId })
    .limit(1)
    .maybeSingle();
  if (error) throw new ScheduledMailError(500, "Unable to reconcile scheduled payment event");
  return Boolean(data);
}

export function classifyScheduledPaymentIntentStatus(status: string):
  | "confirm"
  | "paid"
  | "wait"
  | "blocked" {
  if (status === "requires_confirmation") return "confirm";
  if (status === "succeeded") return "paid";
  if (status === "processing") return "wait";
  return "blocked";
}

export function scheduledAddressVerificationReady(input: {
  to: { isDeliverable: boolean; level: string };
  from: { isDeliverable: boolean; level: string };
  shouldBlock: boolean;
}): boolean {
  return Boolean(
    !input.shouldBlock &&
    input.to.isDeliverable &&
    input.from.isDeliverable &&
    input.to.level !== "provider_unavailable" &&
    input.from.level !== "provider_unavailable",
  );
}

async function savePaymentIntentState(
  scheduleId: string,
  paymentIntent: { id: string; status: string },
) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("scheduled_mailings")
    .update({
      stripe_payment_intent_id: paymentIntent.id,
      payment_status: paymentIntent.status,
      last_attempt_at: now,
      updated_at: now,
    })
    .eq("id", scheduleId);
  if (error) throw new ScheduledMailError(500, "Unable to persist scheduled payment state");
}

async function loadOrCreatePaymentIntent(
  schedule: ScheduledMailingRow,
  profile: BillingProfileRow,
  amountCents: number,
) {
  const stripe = createStripeClient();
  let paymentIntent = schedule.stripe_payment_intent_id
    ? await stripe.paymentIntents.retrieve(schedule.stripe_payment_intent_id)
    : await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: "usd",
          customer: profile.stripe_customer_id!,
          payment_method: profile.default_payment_method_id!,
          metadata: {
            orderId: schedule.order_id!,
            scheduleId: schedule.id,
            ownerId: schedule.owner_id,
            source: "scheduled_saved_payment",
          },
          description: `MailMyPDF scheduled mailing ${schedule.id}`,
        },
        { idempotencyKey: `scheduled_pi_create_${schedule.id}` },
      );

  const paymentCustomerId =
    typeof paymentIntent.customer === "string"
      ? paymentIntent.customer
      : paymentIntent.customer && typeof paymentIntent.customer === "object" && "id" in paymentIntent.customer
        ? String(paymentIntent.customer.id)
        : null;

  if (
    paymentIntent.amount !== amountCents ||
    paymentIntent.currency !== "usd" ||
    paymentCustomerId !== profile.stripe_customer_id
  ) {
    throw new ScheduledMailError(409, "Scheduled PaymentIntent identity does not match the locked mailing");
  }

  await savePaymentIntentState(schedule.id, paymentIntent);

  if (classifyScheduledPaymentIntentStatus(paymentIntent.status) === "confirm") {
    try {
      paymentIntent = await stripe.paymentIntents.confirm(
        paymentIntent.id,
        {
          payment_method: profile.default_payment_method_id!,
          off_session: true,
        },
        { idempotencyKey: `scheduled_pi_confirm_${schedule.id}` },
      );
    } catch {
      // Stripe can throw for card/authentication failures while still returning
      // a durable PaymentIntent. Retrieve it so retries classify the same intent.
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntent.id);
    }
    await savePaymentIntentState(schedule.id, paymentIntent);
  }

  return paymentIntent;
}

async function resumePaidScheduledOrder(
  schedule: ScheduledMailingRow,
  paymentIntentId: string | null,
): Promise<ScheduledMailExecutionResult> {
  if (!schedule.order_id) throw new ScheduledMailError(409, "Scheduled mailing has no order");
  const recorded = await scheduledPaymentEventExists(schedule.order_id, schedule.id);
  if (!recorded && schedule.payment_status !== "succeeded") {
    return blockSchedule(
      schedule,
      "The order left draft state through another payment path; scheduled execution was stopped.",
    );
  }

  try {
    const fulfillment = await submitOrderToLob(schedule.order_id);
    return markScheduleReleased(schedule, paymentIntentId, "skipped" in fulfillment);
  } catch (error) {
    throw new ScheduledMailError(
      503,
      error instanceof Error ? error.message : "Paid scheduled mailing could not be submitted",
      "SCHEDULED_FULFILLMENT_RETRY",
    );
  }
}

export async function createScheduledDirectMail(
  request: Request,
  raw: {
    orderId: unknown;
    sendAt: unknown;
    timezone?: unknown;
    idempotencyKey: unknown;
    authorizeSavedPayment: unknown;
  },
) {
  if (raw.authorizeSavedPayment !== true) {
    throw new ScheduledMailError(
      400,
      "authorize_saved_payment must be true only after the user explicitly authorizes this scheduled mailing to use their saved payment method",
    );
  }

  const context = await requireAuthenticatedUser(request);
  const orderId = requiredString(raw.orderId, "order_id");
  const sendAt = parseFutureInstant(raw.sendAt);
  const timezone = parseTimezone(raw.timezone);
  const idempotencyKey = parseIdempotencyKey(raw.idempotencyKey);

  const state = await loadApprovedDirectMailExecutionState(orderId, context.user.id);
  if (state.status !== "draft") {
    throw new ScheduledMailError(409, "Only an unpaid approved direct-mail draft can be scheduled");
  }
  if (state.currentTotalCents > state.approvedMaxTotalCents) {
    throw new ScheduledMailError(409, "The current price exceeds the amount already approved; review the mailing again");
  }

  const [{ data: paymentPath, error: paymentPathError }, profile] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select("stripe_session_id,payment_execution_key")
      .eq("id", orderId)
      .maybeSingle(),
    loadBillingProfile(context.user.id),
  ]);
  if (paymentPathError) throw new ScheduledMailError(500, "Unable to verify the order payment path");
  if (paymentPath?.stripe_session_id || paymentPath?.payment_execution_key) {
    throw new ScheduledMailError(409, "This draft already has an active payment path");
  }
  if (!billingReady(profile)) {
    throw new ScheduledMailError(409, "A saved payment method is required before scheduling this mailing");
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("scheduled_mailings")
    .select("*")
    .eq("owner_id", context.user.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existingError) throw new ScheduledMailError(500, "Unable to check scheduled-mail idempotency");
  if (existing) {
    if (
      existing.order_id !== orderId ||
      Date.parse(existing.send_at) !== Date.parse(sendAt) ||
      existing.timezone !== timezone ||
      existing.approval_sha256 !== state.packetSha256 ||
      existing.approved_max_total_cents !== state.approvedMaxTotalCents
    ) {
      throw new ScheduledMailError(409, "The retry key belongs to a different scheduled mailing");
    }
    return { schedule: publicSchedule(existing), reused: true };
  }

  const { data: activeSchedule, error: activeScheduleError } = await supabaseAdmin
    .from("scheduled_mailings")
    .select("id,send_at,status")
    .eq("owner_id", context.user.id)
    .eq("order_id", orderId)
    .in("status", ["scheduled", "processing"])
    .limit(1)
    .maybeSingle();
  if (activeScheduleError) throw new ScheduledMailError(500, "Unable to check active scheduled mail");
  if (activeSchedule) {
    throw new ScheduledMailError(
      409,
      `This approved mailing already has an active schedule for ${activeSchedule.send_at}.`,
      "SCHEDULE_ALREADY_ACTIVE",
    );
  }

  const id = crypto.randomUUID();
  const { data: inserted, error } = await supabaseAdmin
    .from("scheduled_mailings")
    .insert({
      id,
      owner_id: context.user.id,
      idempotency_key: idempotencyKey,
      order_id: orderId,
      batch_id: null,
      send_at: sendAt,
      timezone,
      approval_sha256: state.packetSha256,
      approved_max_total_cents: state.approvedMaxTotalCents,
      payment_authorized_at: new Date().toISOString(),
      status: "scheduled",
    })
    .select("*")
    .single();

  if (error || !inserted) {
    if (error?.code === "23505") {
      const retry = await supabaseAdmin
        .from("scheduled_mailings")
        .select("*")
        .eq("owner_id", context.user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (retry.data) return { schedule: publicSchedule(retry.data), reused: true };
    }
    throw new ScheduledMailError(500, "Unable to save scheduled mailing");
  }

  return {
    schedule: publicSchedule(inserted),
    reused: false,
    chargingAuthorized: false,
    note:
      "The schedule records future authorization only. No payment was taken and no mail was submitted during scheduling.",
  };
}

export async function cancelScheduledDirectMail(request: Request, rawScheduleId: unknown) {
  const context = await requireAuthenticatedUser(request);
  const scheduleId = requiredString(rawScheduleId, "schedule_id");
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("scheduled_mailings")
    .update({ status: "cancelled", cancelled_at: now, updated_at: now })
    .eq("id", scheduleId)
    .eq("owner_id", context.user.id)
    .eq("status", "scheduled")
    .select("*")
    .maybeSingle();

  if (error) throw new ScheduledMailError(500, "Unable to cancel scheduled mailing");
  if (!data) {
    const existing = await supabaseAdmin
      .from("scheduled_mailings")
      .select("*")
      .eq("id", scheduleId)
      .eq("owner_id", context.user.id)
      .maybeSingle();
    if (!existing.data) throw new ScheduledMailError(404, "Scheduled mailing not found");
    if (existing.data.status === "cancelled") {
      return { schedule: publicSchedule(existing.data), reused: true };
    }
    throw new ScheduledMailError(409, "Only a scheduled mailing that has not begun processing can be cancelled");
  }
  return { schedule: publicSchedule(data), reused: false };
}

export async function processScheduledMailing(scheduleId: string): Promise<ScheduledMailExecutionResult> {
  let schedule = await loadSchedule(scheduleId);
  if (!schedule) throw new ScheduledMailError(404, "Scheduled mailing not found");

  if (schedule.status === "cancelled") return { status: "cancelled", scheduleId };
  if (schedule.status === "released") return { status: "already_released", scheduleId };
  if (schedule.status === "blocked") {
    return { status: "blocked", scheduleId, reason: schedule.blocked_reason ?? "Scheduled mailing is blocked" };
  }
  if (schedule.status !== "scheduled" && schedule.status !== "processing") {
    return blockSchedule(schedule, "Scheduled mailing state is not executable.");
  }
  if (Date.parse(schedule.send_at) > Date.now()) {
    return { status: "not_due", scheduleId };
  }
  if (!schedule.order_id || schedule.batch_id) {
    return blockSchedule(schedule, "Only single approved direct-mail orders are executable in this release.");
  }

  // Operational safety interlock: never charge unless automatic provider
  // submission is intentionally enabled and Lob is configured.
  if (!flags.isAutoSubmitEnabled() || !flags.isLobEnabled()) {
    return {
      status: "deferred",
      scheduleId,
      reason: "Automatic mailing is disabled; no payment or mailing action was performed.",
    };
  }

  let state: ApprovedDirectMailExecutionState;
  try {
    state = await loadApprovedDirectMailExecutionState(schedule.order_id, schedule.owner_id);
  } catch (error) {
    if (error instanceof McpDirectMailError && error.status < 500) {
      return blockSchedule(schedule, error.message);
    }
    throw error;
  }

  if (state.status !== "draft") {
    return resumePaidScheduledOrder(schedule, schedule.stripe_payment_intent_id);
  }

  if (state.currentTotalCents > schedule.approved_max_total_cents) {
    return blockSchedule(
      schedule,
      "The current price exceeds the user's approved maximum; fresh review and approval are required.",
    );
  }

  const profile = await loadBillingProfile(schedule.owner_id);
  if (!billingReady(profile)) {
    return blockSchedule(schedule, "No usable saved payment method is available.");
  }

  const addressCheck = await validateOrderAddresses(state.recipient, state.sender);
  if (!scheduledAddressVerificationReady(addressCheck)) {
    return blockSchedule(
      schedule,
      "Current postal verification did not clear both sender and recipient addresses.",
    );
  }

  const requestedAmount = schedule.payment_amount_cents ?? state.currentTotalCents;
  if (
    !Number.isSafeInteger(requestedAmount) ||
    requestedAmount < 0 ||
    requestedAmount > schedule.approved_max_total_cents
  ) {
    return blockSchedule(schedule, "The scheduled charge amount is outside the user's approved limit.");
  }

  const { data: lockedAmount, error: claimError } = await supabaseAdmin.rpc(
    "claim_scheduled_mailing_payment",
    {
      p_schedule_id: schedule.id,
      p_owner_id: schedule.owner_id,
      p_amount_cents: requestedAmount,
    },
  );

  if (claimError || typeof lockedAmount !== "number") {
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("status,stripe_session_id,payment_execution_key")
      .eq("id", schedule.order_id)
      .maybeSingle();
    if (order?.stripe_session_id) {
      return blockSchedule(
        schedule,
        "Hosted checkout already owns this order's payment path; scheduled execution was stopped.",
      );
    }
    if (order && order.status !== "draft") {
      schedule = (await loadSchedule(schedule.id)) ?? schedule;
      return resumePaidScheduledOrder(schedule, schedule.stripe_payment_intent_id);
    }
    throw new ScheduledMailError(
      409,
      claimError?.message ?? "Scheduled mailing could not claim its payment path",
      "SCHEDULED_PAYMENT_CLAIM_FAILED",
    );
  }

  schedule = (await loadSchedule(schedule.id)) ?? schedule;

  let paymentIntent;
  try {
    paymentIntent = await loadOrCreatePaymentIntent(schedule, profile, lockedAmount);
  } catch (error) {
    // A network/provider error is retryable. The payment-path claim stays in
    // place so hosted checkout cannot race a potentially-created PaymentIntent.
    throw new ScheduledMailError(
      503,
      error instanceof Error ? error.message : "Scheduled payment provider request failed",
      "SCHEDULED_PAYMENT_RETRY",
    );
  }

  const paymentState = classifyScheduledPaymentIntentStatus(paymentIntent.status);
  if (paymentState === "wait") {
    return {
      status: "processing",
      scheduleId: schedule.id,
      paymentIntentId: paymentIntent.id,
      reason: "Stripe is still processing the saved-payment charge.",
    };
  }
  if (paymentState === "blocked") {
    return blockSchedule(
      schedule,
      `Saved-payment charge requires user attention (Stripe status: ${paymentIntent.status}).`,
      {
        paymentIntentId: paymentIntent.id,
        paymentStatus: paymentIntent.status,
        clearPaymentClaim: true,
      },
    );
  }

  const paidAt = new Date().toISOString();
  const transition = await getStateMachineService().transitionOrder(
    schedule.order_id,
    "paid_pending_manual_fulfillment",
    {
      triggeredBy: "scheduled_job",
      metadata: {
        payment_intent_id: paymentIntent.id,
        schedule_id: schedule.id,
        amount_cents: lockedAmount,
      },
      extraUpdate: {
        paid_at: paidAt,
        price_cents: lockedAmount,
        payment_execution_key: null,
      },
      labelOverride: "Scheduled saved payment received",
    },
  );

  if (!transition.ok || !transition.persisted) {
    const recorded = await scheduledPaymentEventExists(schedule.order_id, schedule.id);
    if (!recorded) {
      throw new ScheduledMailError(
        503,
        "Stripe payment succeeded but the paid order transition needs reconciliation",
        "SCHEDULED_PAYMENT_RECONCILE",
      );
    }
  }

  await savePaymentIntentState(schedule.id, paymentIntent);
  schedule = (await loadSchedule(schedule.id)) ?? schedule;
  return resumePaidScheduledOrder(schedule, paymentIntent.id);
}

export async function processDueScheduledMailings(limit = 25) {
  const bounded = Math.max(1, Math.min(100, Math.floor(limit)));
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("scheduled_mailings")
    .select("id")
    .in("status", ["scheduled", "processing"])
    .lte("send_at", now)
    .order("send_at", { ascending: true })
    .limit(bounded);
  if (error) throw new ScheduledMailError(500, "Unable to load due scheduled mailings");

  const results: Array<{ scheduleId: string; result?: ScheduledMailExecutionResult; error?: string }> = [];
  for (const row of data ?? []) {
    try {
      results.push({ scheduleId: row.id, result: await processScheduledMailing(row.id) });
    } catch (error) {
      results.push({
        scheduleId: row.id,
        error: error instanceof Error ? error.message : "Scheduled mailing execution failed",
      });
    }
  }
  return { checked: data?.length ?? 0, results };
}

export function isScheduledOrderPaidStatus(status: string): boolean {
  return isPaidStatus(status as Database["public"]["Enums"]["order_status"]);
}
