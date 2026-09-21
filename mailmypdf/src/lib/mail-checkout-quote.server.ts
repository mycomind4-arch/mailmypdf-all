import type { Database } from "@/integrations/supabase/types";
import { calculateTotalPrice, priceDescription, type MailClass } from "@/lib/pricing";
import { createStripeClient } from "@/lib/stripe.server";
import { getSubscriptionStatus, applyProPricing } from "@/lib/subscriptions";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type QuoteOrder = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  "email" | "page_count" | "color" | "mail_class"
>;

/** Shared by pre-checkout review and checkout; no session or charge is created. */
export async function mailCheckoutQuote(order: QuoteOrder) {
  const options = {
    pageCount: order.page_count,
    color: order.color ?? false,
    mailClass: (order.mail_class || "standard") as MailClass,
  };
  let totalCents = calculateTotalPrice(options);
  let description = priceDescription(options);
  const subStatus = await getSubscriptionStatus(createStripeClient(), supabaseAdmin, order.email);
  if (subStatus.isActive) {
    const pro = applyProPricing({
      ...options,
      subStatus,
      basePriceCents: calculateTotalPrice({
        pageCount: order.page_count,
        color: false,
        mailClass: "standard",
      }),
    });
    totalCents = pro.totalCents;
    if (pro.breakdown) description += ` · ${pro.breakdown}`;
  }
  return { totalCents, description };
}
