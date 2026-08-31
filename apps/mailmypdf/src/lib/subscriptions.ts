// Subscription logic for MailMyPDF Pro.
// Pro members get 5 free standard letters/month, then $3.99/letter.
// Add-ons (color, certified, registered) are always charged at normal rates.

import type Stripe from "stripe";
import { MAIL_CLASS_SURCHARGE, COLOR_PER_PAGE_SURCHARGE } from "@/lib/pricing";
import { logger } from "@/lib/logger";

// ── Plan constants ────────────────────────────────────────────────────────────

export const PRO_PLAN_NAME = "MailMyPDF Pro";
export const PRO_FREE_LETTERS_PER_MONTH = 5;
export const PRO_MEMBER_RATE_CENTS = 399; // $3.99 per letter after free tier
export const PRO_MONTHLY_PRICE_CENTS = 999; // $9.99/month

export function getProPriceId(): string {
  const id = process.env.STRIPE_PRO_PRICE_ID;
  if (!id) throw new Error("STRIPE_PRO_PRICE_ID is not configured");
  return id;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubscriptionStatus {
  isActive: boolean;
  plan: "pro" | "none";
  currentPeriodEnd: number | null;
  canceledAt: number | null;
  lettersUsedThisPeriod: number;
  lettersRemaining: number;
}

// ── Lookup ────────────────────────────────────────────────────────────────────

export async function getActiveSubscription(
  stripe: Stripe,
  email: string,
): Promise<Stripe.Subscription | null> {
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length === 0) return null;

  const customerId = customers.data[0].id;
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });

  return subs.data.length > 0 ? subs.data[0] : null;
}

export async function getLettersUsedThisPeriod(
  supabaseAdmin: any,
  email: string,
  periodStart: Date,
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .in("status", [
      "paid_pending_manual_fulfillment",
      "sent_to_lob",
      "mailed",
      "in_transit",
      "delivered",
      "completed",
    ])
    .gte("paid_at", periodStart.toISOString());

  if (error) {
    logger.error("Failed to count orders for subscription usage", { error: error.message });
    return 0;
  }
  return count ?? 0;
}

export async function getSubscriptionStatus(
  stripe: Stripe,
  supabaseAdmin: any,
  email: string,
): Promise<SubscriptionStatus> {
  try {
    const sub = await getActiveSubscription(stripe, email);
    if (!sub) {
      return {
        isActive: false, plan: "none", currentPeriodEnd: null,
        canceledAt: null, lettersUsedThisPeriod: 0, lettersRemaining: 0,
      };
    }

    const periodStart = new Date(sub.current_period_start * 1000);
    const used = await getLettersUsedThisPeriod(supabaseAdmin, email, periodStart);
    const remaining = Math.max(0, PRO_FREE_LETTERS_PER_MONTH - used);

    return {
      isActive: true, plan: "pro",
      currentPeriodEnd: sub.current_period_end,
      canceledAt: sub.canceled_at,
      lettersUsedThisPeriod: used,
      lettersRemaining: remaining,
    };
  } catch (error) {
    logger.error("Failed to get subscription status", { error: error instanceof Error ? error.message : String(error) });
    return {
      isActive: false, plan: "none", currentPeriodEnd: null,
      canceledAt: null, lettersUsedThisPeriod: 0, lettersRemaining: 0,
    };
  }
}

// ── Pro pricing ───────────────────────────────────────────────────────────────

export interface ProPricingResult {
  totalCents: number;
  baseChargeCents: number;
  addOnCents: number;
  isFreeLetter: boolean;
  isMemberRate: boolean;
  discountCents: number;
  breakdown: string;
}

export function applyProPricing(args: {
  pageCount: number;
  color: boolean;
  mailClass: "standard" | "certified" | "registered";
  subStatus: SubscriptionStatus;
  basePriceCents: number;
}): ProPricingResult {
  const { subStatus, basePriceCents, color, mailClass, pageCount } = args;

  const mailSurcharge = MAIL_CLASS_SURCHARGE[mailClass] ?? 0;
  const colorSurcharge = color ? pageCount * COLOR_PER_PAGE_SURCHARGE : 0;
  const addOnCents = mailSurcharge + colorSurcharge;

  let baseChargeCents = basePriceCents;
  let isFreeLetter = false;
  let isMemberRate = false;
  let breakdown = "";

  if (subStatus.isActive && subStatus.lettersRemaining > 0) {
    baseChargeCents = 0;
    isFreeLetter = true;
    breakdown = `Pro free letter (${subStatus.lettersRemaining}/${PRO_FREE_LETTERS_PER_MONTH} remaining)`;
  } else if (subStatus.isActive) {
    baseChargeCents = PRO_MEMBER_RATE_CENTS;
    isMemberRate = true;
    breakdown = `Pro member rate ($3.99/letter)`;
  }

  const totalCents = baseChargeCents + addOnCents;
  const discountCents = basePriceCents - baseChargeCents;

  return { totalCents, baseChargeCents, addOnCents, isFreeLetter, isMemberRate, discountCents, breakdown };
}
