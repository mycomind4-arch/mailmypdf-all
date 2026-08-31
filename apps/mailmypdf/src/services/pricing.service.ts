/**
 * PricingService — wraps the pricing calculation logic.
 *
 * Extracted from src/lib/pricing.ts to provide a service-level API
 * that returns domain-level Pricing objects instead of raw cents.
 *
 * The existing pricing.ts functions remain unchanged and are the
 * actual implementation — this service is a thin wrapper that adds
 * domain typing.
 */

import {
  calculateTotalPrice as _calculateTotalPrice,
  priceCentsForPageCount,
  priceDescription,
  MAIL_CLASS_LABELS,
  MAIL_CLASS_SURCHARGE,
  COLOR_PER_PAGE_SURCHARGE,
  type MailClass,
} from "@/lib/pricing";
import type { Pricing } from "@/domain/models";

// ── Service ───────────────────────────────────────────────────────────────────

export interface PricingParams {
  pageCount: number;
  color: boolean;
  mailClass: MailClass;
}

export class PricingService {
  /**
   * Calculate the full pricing breakdown for a mail job.
   */
  calculatePrice(params: PricingParams): Pricing {
    const totalCents = _calculateTotalPrice({
      pageCount: params.pageCount,
      color: params.color,
      mailClass: params.mailClass,
    });

    const baseCents = priceCentsForPageCount(params.pageCount);
    const colorSurchargeCents = params.color
      ? params.pageCount * COLOR_PER_PAGE_SURCHARGE
      : 0;
    const deliverySurchargeCents = MAIL_CLASS_SURCHARGE[params.mailClass] ?? 0;

    return {
      baseCents,
      colorSurchargeCents,
      deliverySurchargeCents,
      totalCents,
      currency: "usd",
    };
  }

  /**
   * Get just the total price in cents (convenience for simple use cases).
   */
  calculateTotalCents(params: PricingParams): number {
    return _calculateTotalPrice({
      pageCount: params.pageCount,
      color: params.color,
      mailClass: params.mailClass,
    });
  }

  /**
   * Get the base price (no add-ons) in cents.
   */
  getBasePrice(pageCount: number): number {
    return priceCentsForPageCount(pageCount);
  }

  /**
   * Generate a human-readable product description for Stripe line items.
   */
  describeProduct(params: PricingParams): string {
    return priceDescription({
      pageCount: params.pageCount,
      color: params.color,
      mailClass: params.mailClass,
    });
  }

  /**
   * Get the mail class label for display.
   */
  getMailClassLabel(mailClass: MailClass): string {
    return MAIL_CLASS_LABELS[mailClass];
  }

  /**
   * Get the price tier ID for a page count (used for Stripe price lookup).
   */
  priceIdForPageCount(pages: number): "letter_short" | "letter_medium" | "letter_long" {
    if (pages <= 2) return "letter_short";
    if (pages <= 5) return "letter_medium";
    return "letter_long";
  }
}
