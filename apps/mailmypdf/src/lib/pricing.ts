// MailMyPDF order pricing — uses canonical @mailmypdf/pricing for mailing prices.
// The page-count tier model represents the physical fulfillment service
// (printing + postage + handling), NOT workflow preparation.
//
// Workflow preparation pricing (AI-assisted document analysis, drafting, etc.)
// is handled by the canonical @mailmypdf/pricing engine via workflow profiles.
// This module handles only the core "mail a document" fulfillment service.

import {
  PRICES,
  LABELS,
  MAIL_TYPE_MAP,
  isValidPricingKey,
  type PricingKey,
} from "@mailmypdf/pricing";
import type { VerticalOrderMetadata } from "@/verticals/types";

export type MailClass = "standard" | "certified" | "registered";

// Re-export canonical mailing prices for backward compatibility
export { PRICES, LABELS, MAIL_TYPE_MAP, isValidPricingKey };
export type { PricingKey };

export const MAIL_CLASS_LABELS: Record<MailClass, string> = {
  standard: "Standard (3–7 business days)",
  certified: "Certified Mail (delivery tracking + confirmation, 3–7 days)",
  registered: "Registered Mail (secure handling + tracking, 5–10 days)",
};

// ── Fulfillment cost configuration (from canonical package) ────────────────
// These costs come from @mailmypdf/pricing and represent the Lob/USPS
// pass-through costs. The customer-facing prices include a margin.
export const LOB_CERTIFIED_COST = 695;   // $6.95 per piece
export const LOB_REGISTERED_COST = 2450; // $24.50 per piece
export const MAIL_CLASS_MARGIN = 300; // $3.00

export const MAIL_CLASS_SURCHARGE: Record<MailClass, number> = {
  standard: 0,
  certified: LOB_CERTIFIED_COST + MAIL_CLASS_MARGIN,    // $9.95
  registered: LOB_REGISTERED_COST + MAIL_CLASS_MARGIN,  // $27.50
};

// ── Display helpers ─────────────────────────────────────────────────────────
export function mailClassSurchargeLabel(mailClass: MailClass): string {
  const cents = MAIL_CLASS_SURCHARGE[mailClass];
  if (cents === 0) return "";
  return `+$${(cents / 100).toFixed(2)}`;
}

export function mailClassSurchargeUsd(mailClass: MailClass): string {
  return (MAIL_CLASS_SURCHARGE[mailClass] / 100).toFixed(2);
}

// Base price by page count tier — this is the fulfillment/printing service.
// These prices represent the physical mailing service (print + postage + handling).
// Workflow preparation fees are separate and come from the canonical pricing engine.
function basePriceCents(pageCount: number): number {
  if (pageCount <= 2) return 499;
  if (pageCount <= 5) return 699;
  return 999;
}

// Color surcharge: +$0.15 per page.
export const COLOR_PER_PAGE_SURCHARGE = 15;

export function colorPerPageLabel(): string {
  return `+$${(COLOR_PER_PAGE_SURCHARGE / 100).toFixed(2)}`;
}

export function colorPerPageUsd(): string {
  return (COLOR_PER_PAGE_SURCHARGE / 100).toFixed(2);
}

export function priceCentsForPageCount(pages: number): number {
  return basePriceCents(pages);
}

// ── Vertical Pricing Configuration ──────────────────────────────────────────
export interface VerticalPricingConfig {
  verticalSlug: string;
  basePrices?: { short: number; medium: number; long: number };
  minimumMailClass?: MailClass;
  includesCertified?: boolean;
  processingFeeCents?: number;
}

const verticalPricingConfigs = new Map<string, VerticalPricingConfig>();

export function registerVerticalPricing(config: VerticalPricingConfig): void {
  verticalPricingConfigs.set(config.verticalSlug, config);
}

export function getVerticalPricing(slug: string): VerticalPricingConfig | undefined {
  return verticalPricingConfigs.get(slug);
}

// ── Mail class resolution with vertical context ─────────────────────────────
export function resolveMailClass(
  requested: MailClass,
  verticalSlug?: string,
): MailClass {
  if (!verticalSlug) return requested;
  const config = getVerticalPricing(verticalSlug);
  if (!config?.minimumMailClass) return requested;

  const classRank: Record<MailClass, number> = { standard: 0, certified: 1, registered: 2 };
  if (classRank[requested] < classRank[config.minimumMailClass]) {
    return config.minimumMailClass;
  }
  return requested;
}

// ── Core pricing calculation with vertical context ──────────────────────────
export function calculateTotalPrice(args: {
  pageCount: number;
  color: boolean;
  mailClass: MailClass;
  vertical?: VerticalOrderMetadata;
}): number {
  const verticalSlug = args.vertical?.vertical_slug;
  const config = verticalSlug ? getVerticalPricing(verticalSlug) : undefined;

  let base: number;
  if (config?.basePrices) {
    if (args.pageCount <= 2) base = config.basePrices.short;
    else if (args.pageCount <= 5) base = config.basePrices.medium;
    else base = config.basePrices.long;
  } else {
    base = basePriceCents(args.pageCount);
  }

  const effectiveMailClass = resolveMailClass(args.mailClass, verticalSlug);
  const colorSurcharge = args.color ? args.pageCount * COLOR_PER_PAGE_SURCHARGE : 0;

  let deliverySurcharge = MAIL_CLASS_SURCHARGE[effectiveMailClass] ?? 0;
  if (config?.includesCertified && effectiveMailClass === "certified") {
    deliverySurcharge = 0;
  }

  const processingFee = config?.processingFeeCents ?? 0;

  return base + colorSurcharge + deliverySurcharge + processingFee;
}

export function priceDescription(args: {
  pageCount: number;
  color: boolean;
  mailClass: MailClass;
  vertical?: VerticalOrderMetadata;
}): string {
  const verticalSlug = args.vertical?.vertical_slug;
  const config = verticalSlug ? getVerticalPricing(verticalSlug) : undefined;
  const effectiveMailClass = resolveMailClass(args.mailClass, verticalSlug);

  const parts: string[] = [];

  if (verticalSlug) {
    parts.push(`${verticalSlug} letter (${args.pageCount} page${args.pageCount === 1 ? "" : "s"})`);
  } else {
    parts.push(`MailMyPDF Letter (${args.pageCount} page${args.pageCount === 1 ? "" : "s"})`);
  }

  if (args.color) parts.push("Color printing");
  if (effectiveMailClass === "certified" && !config?.includesCertified) parts.push("Certified Mail");
  if (effectiveMailClass === "registered") parts.push("Registered Mail");
  if (config?.processingFeeCents) parts.push("Processing fee");

  return parts.join(" · ");
}
