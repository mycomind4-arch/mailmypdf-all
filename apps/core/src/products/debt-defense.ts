/**
 * DebtDefense Mail — product definition
 *
 * Respond to debt collection by mail. FDCPA-compliant letters:
 * validation requests, dispute letters, cease-and-desist notices.
 * Certified mail with proof of delivery.
 */

export const debtDefenseProduct = {
  id: "debt-defense",
  name: "DebtDefense Mail",
  tagline: "Don't pay what you can't verify.",
  description:
    "Request debt validation, dispute collections, and assert your rights under the FDCPA — by certified mail, with proof of delivery.",
  responseTypes: [
    "Debt validation request",
    "Dispute the debt (I don't owe this)",
    "Dispute the amount",
    "Cease and desist (stop contacting me)",
    "Pay-for-delete offer",
    "Request debt verification + dispute",
  ],
} as const;

export type DebtDefenseResponseType = (typeof debtDefenseProduct.responseTypes)[number];

export type DebtDefenseInput = {
  responseType: string;
  collectorName: string;
  collectorAddress: string;
  accountReference: string;
  originalCreditor: string;
  claimedAmount: string;
  firstContactDate: string;
  consumerName: string;
  consumerAddress: string;
  consumerEmail: string;
  consumerPhone: string;
  disputeReason: string;
  additionalNotes: string;
  documentText: string;
};

export type DebtDefenseAnalysis = {
  thirtyDayDeadline: string | null;
  deadlinePassed: boolean;
  warnings: string[];
  tips: string[];
  fdcpaRights: string[];
};
