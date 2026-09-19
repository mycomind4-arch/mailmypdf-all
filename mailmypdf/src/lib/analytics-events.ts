/**
 * Funnel-specific analytics events for MailMyPDF.
 *
 * These helpers wrap the base `track()` function from analytics.ts
 * with typed event names and properties for the critical customer journey:
 *
 *   VISITOR → LETTER CREATED → CHECKOUT → PAID ORDER →
 *   SUCCESSFUL MAILING → PROOF → REPEAT ORDER → PRO
 *
 * Usage:
 *   import { trackCheckoutStart, trackLetterCreated } from "@/lib/analytics-events";
 *   trackCheckoutStart({ order_id, amount_cents, mail_class });
 */

import { track } from "@/lib/analytics";

// ── Event Names ──────────────────────────────────────────────────────────────

export const FUNNEL_EVENTS = {
  PAGE_VIEW: "page_view",
  TEMPLATE_VIEW: "template_view",
  TEMPLATE_SELECTED: "template_selected",
  WORKFLOW_START: "workflow_start",
  LETTER_CREATED: "letter_created",
  AI_GENERATION: "ai_generation",
  CHECKOUT_START: "checkout_start",
  CHECKOUT_COMPLETE: "checkout_complete",
  MAILING_SUCCESSFUL: "mailing_successful",
  PROOF_VIEWED: "proof_viewed",
  PROOF_DOWNLOADED: "proof_downloaded",
  MAIL_AGAIN_CLICKED: "mail_again_clicked",
  REPEAT_ORDER: "repeat_order",
  PRO_OFFER_VIEWED: "pro_offer_viewed",
  PRO_SUBSCRIBED: "pro_subscribed",
  PRO_CANCELLED: "pro_cancelled",
} as const;

// ── Typed Helpers ────────────────────────────────────────────────────────────

export function trackTemplateView(templateId: string, category: string) {
  void track(FUNNEL_EVENTS.TEMPLATE_VIEW, { template_id: templateId, category });
}

export function trackTemplateSelected(templateId: string, category: string) {
  void track(FUNNEL_EVENTS.TEMPLATE_SELECTED, { template_id: templateId, category });
}

export function trackWorkflowStart(workflowSlug: string) {
  void track(FUNNEL_EVENTS.WORKFLOW_START, { workflow_slug: workflowSlug });
}

export function trackLetterCreated(source: "write" | "upload" | "workflow", options?: {
  template_id?: string;
  workflow_slug?: string;
  page_count?: number;
  mail_class?: string;
  color?: boolean;
}) {
  void track(FUNNEL_EVENTS.LETTER_CREATED, { source, ...options });
}

export function trackAIGeneration(step: "analysis" | "draft" | "revision", workflowSlug: string) {
  void track(FUNNEL_EVENTS.AI_GENERATION, { step, workflow_slug: workflowSlug });
}

export function trackCheckoutStart(orderId: string, amountCents: number, options?: {
  mail_class?: string;
  color?: boolean;
  page_count?: number;
  source?: string;
}) {
  void track(FUNNEL_EVENTS.CHECKOUT_START, {
    order_id: orderId,
    amount_cents: amountCents,
    ...options,
  });
}

export function trackCheckoutComplete(orderId: string, amountCents: number) {
  void track(FUNNEL_EVENTS.CHECKOUT_COMPLETE, {
    order_id: orderId,
    amount_cents: amountCents,
  });
}

export function trackMailingSuccessful(orderId: string, mailClass: string) {
  void track(FUNNEL_EVENTS.MAILING_SUCCESSFUL, {
    order_id: orderId,
    mail_class: mailClass,
  });
}

export function trackProofViewed(orderId: string) {
  void track(FUNNEL_EVENTS.PROOF_VIEWED, { order_id: orderId });
}

export function trackProofDownloaded(orderId: string) {
  void track(FUNNEL_EVENTS.PROOF_DOWNLOADED, { order_id: orderId });
}

export function trackMailAgainClicked(orderId: string) {
  void track(FUNNEL_EVENTS.MAIL_AGAIN_CLICKED, { order_id: orderId });
}

export function trackRepeatOrder(orderId: string, previousOrderId?: string) {
  void track(FUNNEL_EVENTS.REPEAT_ORDER, {
    order_id: orderId,
    previous_order_id: previousOrderId,
  });
}

export function trackProOfferViewed(location: "post_purchase" | "pricing_page" | "banner") {
  void track(FUNNEL_EVENTS.PRO_OFFER_VIEWED, { location });
}

export function trackProSubscribed(priceCents: number) {
  void track(FUNNEL_EVENTS.PRO_SUBSCRIBED, { price_cents: priceCents });
}

export function trackProCancelled(reason?: string) {
  void track(FUNNEL_EVENTS.PRO_CANCELLED, { reason });
}
