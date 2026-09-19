/**
 * DisputeMail Category Definitions
 *
 * Useful dispute categories for classification.
 * Users can also choose "Something else" — they are never forced
 * into a legal category.
 */

export interface DisputeCategory {
  id: string;
  label: string;
  description: string;
}

export const DISPUTE_CATEGORIES: DisputeCategory[] = [
  {
    id: "incorrect_charge",
    label: "Incorrect charge",
    description: "Dispute a charge you believe is incorrect.",
  },
  {
    id: "billing_dispute",
    label: "Billing dispute",
    description: "Explain the billing problem and request a correction.",
  },
  {
    id: "refund_dispute",
    label: "Refund dispute",
    description: "Request a refund and document why.",
  },
  {
    id: "service_dispute",
    label: "Service dispute",
    description: "Put your complaint and requested resolution in writing.",
  },
  {
    id: "contract_dispute",
    label: "Contract dispute",
    description: "Clearly state the issue and what you want corrected.",
  },
  {
    id: "record_correction",
    label: "Record correction",
    description: "Ask a company to correct inaccurate information.",
  },
  {
    id: "product_warranty",
    label: "Product/warranty dispute",
    description: "Dispute a product or warranty issue.",
  },
  {
    id: "fee_dispute",
    label: "Fee dispute",
    description: "Dispute a fee you believe should not have been charged.",
  },
  {
    id: "account_dispute",
    label: "Account dispute",
    description: "Dispute an account-related issue or charge.",
  },
  {
    id: "cancellation_dispute",
    label: "Cancellation dispute",
    description: "Dispute charges or issues related to a cancellation.",
  },
  {
    id: "other",
    label: "Something else",
    description: "Describe your dispute in your own words.",
  },
];

/**
 * Get a category by id. Returns "other" if not found.
 */
export function getCategoryById(id: string): DisputeCategory {
  return DISPUTE_CATEGORIES.find((c) => c.id === id) ?? DISPUTE_CATEGORIES[DISPUTE_CATEGORIES.length - 1];
}
