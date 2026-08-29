/**
 * @mailmypdf/pricing — compatibility re-export
 *
 * This file re-exports the backward-compatible mailing pricing API
 * from the canonical @mailmypdf/pricing package. This allows existing
 * code that imports from "@/platform/pricing" to continue working
 * while the full migration to the canonical package proceeds.
 *
 * The canonical package is the single source of truth for:
 * - Mailing prices (standard/certified/registered)
 * - Workflow pricing profiles
 * - Quote calculation
 * - Commercial status gating
 * - Discount validation
 *
 * Once all code is migrated to import directly from
 * @mailmypdf/pricing, this shim can be removed.
 */

export {
  PRICES,
  LABELS,
  MAIL_TYPE_MAP,
  PRICING_KEY_MAP,
  getPriceCents,
  getPriceForMailType,
  getLabel,
  isValidPricingKey,
} from "@mailmypdf/pricing";

export type {
  PricingKey,
  MailType,
} from "@mailmypdf/pricing";
