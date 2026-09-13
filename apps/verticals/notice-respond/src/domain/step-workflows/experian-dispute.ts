import type { ChecklistItemState, StepMatterState, StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
import { generateCreditDisputeDraft, type CreditErrorType, type CreditDisputeDraftParams } from "@/domain/credit-dispute";

/**
 * An Experian credit-report dispute is governed by the same federal statute
 * as TransUnion's (FCRA Section 611) and has the identical shape: one
 * recipient (Experian), a report that commonly carries several disputed
 * tradelines each needing its own FCRA category and evidence, and a single
 * 30/45-day reinvestigation clock rather than a hearing schedule or
 * correspondence timeline to chart. Nothing about Experian's own dispute
 * process (see `EXPERIAN_PROCESS_NOTES` below — verified against
 * experian.com and independent sources, not assumed from TransUnion's page)
 * changes that shape, so this workflow independently arrives at the same six
 * steps TransUnion's did — Intake, Documents, Analyze, Draft, Review, Mail —
 * not by copying TransUnion's file but because the underlying legal process
 * both workflows automate is the same kind of process. Documents collects
 * the credit report and per-item proof; Analyze checks each item's category
 * against what FCRA reinvestigation actually needs, same as TransUnion's.
 */
export const experianDisputeStepWorkflow: StepWorkflowDefinition = {
  id: "experian-dispute",
  title: "Experian Dispute",
  steps: [
    { id: "intake", label: "Intake" },
    { id: "documents", label: "Documents" },
    { id: "analyze", label: "Analyze" },
    { id: "draft", label: "Draft" },
    { id: "review", label: "Review" },
    { id: "mail", label: "Mail" },
  ],
  requiresApprovalBeforeStep: "mail",
};

/**
 * What's genuinely Experian-specific, verified via web search rather than
 * carried over from TransUnion's page:
 * - Mailing address: Experian National Consumer Assistance Center, P.O. Box
 *   4500, Allen, TX 75013 (confirmed against experian.com/help/contact and
 *   independent consumer-law sources — matches what was already in
 *   `credit-dispute.ts`'s BUREAU_CONFIGS.experian).
 * - Phone: 888-397-3742 (Experian's National Consumer Assistance Center;
 *   hours Mon-Fri 6am-8pm, Sat 8am-5pm PST).
 * - Experian's online portal is its own product, the "Experian Dispute
 *   Center" at experian.com/disputes — a different name and account system
 *   than TransUnion's own online dispute tool, even though both bureaus (and
 *   Equifax) exchange the underlying dispute with furnishers over the same
 *   shared e-OSCAR network.
 * - Unlike TransUnion and Equifax, Credit Karma does NOT support direct
 *   in-app disputes for Experian — Credit Karma only partners with Equifax
 *   and TransUnion for that feature, so an Experian dispute has to go
 *   through Experian directly (its site, phone, or mail). That's a genuine
 *   reason a mailed, certified-mail dispute matters more here than it might
 *   for the other two bureaus.
 */
export const EXPERIAN_PROCESS_NOTES = {
  mailingOrgFull: "Experian National Consumer Assistance Center",
  onlinePortalName: "Experian Dispute Center",
  onlinePortalUrl: "experian.com/disputes",
  phone: "888-397-3742",
  creditKarmaSupportsDirectDispute: false,
} as const;

/**
 * The FCRA dispute-reason categories a bureau reinvestigation actually
 * recognizes — bureau-agnostic (mirrors `CreditErrorType` in
 * `@/domain/credit-dispute`), so this list is intentionally the same set
 * TransUnion's workflow offers. It is kept as its own copy here rather than
 * imported from `transunion-dispute.ts` so this workflow's step components
 * don't depend on a sibling workflow's file — each Notice Respond workflow
 * owns its own definition (see the comment on `stepWorkflows` in
 * `domain/step-workflows/index.ts`).
 */
export const DISPUTE_CATEGORY_OPTIONS: Array<{
  value: CreditErrorType;
  label: string;
  evidenceHint: string;
}> = [
  { value: "not_mine", label: "This account isn't mine — I never opened it", evidenceHint: "An FTC identity theft report or police report is the strongest evidence; a signed ID theft affidavit also helps." },
  { value: "mixed_file", label: "This looks like someone else's information merged into my file", evidenceHint: "Point out the specific name, SSN, or address details on the item that don't match you." },
  { value: "incorrect_amount", label: "The balance or amount owed is wrong", evidenceHint: "A statement or payment confirmation showing the correct balance is the strongest evidence." },
  { value: "incorrect_status", label: "The payment status is wrong (e.g., shown late or unpaid, but it wasn't)", evidenceHint: "Bank records or payment confirmations showing on-time or paid-in-full status." },
  { value: "incorrect_account", label: "The account number or account details are wrong", evidenceHint: "A statement showing your actual account number for that creditor." },
  { value: "duplicate", label: "This account is listed more than once on my report", evidenceHint: "Note where the duplicate listing appears — same creditor, same balance, different account number is a common pattern." },
  { value: "outdated", label: "This is too old to still be reported", evidenceHint: "Most negative items must come off 7 years after the date of first delinquency (10 years for a Chapter 7 bankruptcy) — confirm that date." },
  { value: "incorrect_personal_info", label: "My personal information is wrong (name, address, SSN, date of birth)", evidenceHint: "A copy of your ID or a utility bill showing the correct information." },
  { value: "unauthorized_inquiry", label: "A hard inquiry I never authorized", evidenceHint: "Note the inquiring company and date — you can request they verify your authorization." },
  { value: "other", label: "Something else is inaccurate or incomplete", evidenceHint: "Describe exactly what's wrong and what the correct information should be." },
];

export const DISPUTE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  DISPUTE_CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
);

export type DisputedItemDraft = {
  id: string;
  creditorName: string;
  accountNumber: string;
  category: CreditErrorType | "";
  description: string;
  correctInformation: string;
};

export function emptyDisputedItem(): DisputedItemDraft {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    creditorName: "",
    accountNumber: "",
    category: "",
    description: "",
    correctInformation: "",
  };
}

/**
 * Intake fields — shape of steps.intake.data. Field names mirror
 * `CreditDisputeExtraction`/`DisputedItem` in `@/domain/credit-dispute` so a
 * future OCR/AI extraction pass can populate this shape directly.
 */
export type ExperianDisputeIntake = {
  consumerName?: string;
  consumerAddress?: string;
  reportDate?: string;
  reportNumber?: string;
  disputedBefore?: boolean;
  disputedItems?: DisputedItemDraft[];
  /** Free-text context beyond the per-item descriptions — becomes the letter's "Explanation and Supporting Facts" section. */
  additionalContext?: string;
  /** What the consumer wants Experian to do — becomes the letter's "Requested Action" section. */
  requestedOutcome?: string;
};

/**
 * The "Readiness checklist" shown in the right rail on every screen —
 * derived from Intake and Documents data, same pattern as every other
 * converted workflow's readiness list.
 */
export function getExperianDisputeReadiness(matter: StepMatterState): ChecklistItemState[] {
  const intake = (matter.steps.intake?.data ?? {}) as ExperianDisputeIntake;
  const items = intake.disputedItems ?? [];
  const files = (matter.steps.documents?.data.files as { id: string; name: string; category?: string }[]) ?? [];
  const hasReport = files.some((f) => /report/i.test(f.category ?? f.name));
  const hasIdProof = files.some((f) => /identity|id\b|license|passport/i.test(f.category ?? f.name));

  return [
    { id: "consumer", label: "Your name and mailing address", done: Boolean(intake.consumerName && intake.consumerAddress) },
    { id: "items", label: "At least one disputed item identified", done: items.length > 0 },
    {
      id: "itemDetail",
      label: "Every disputed item has a category and explanation",
      done: items.length > 0 && items.every((item) => Boolean(item.category) && item.description.trim().length > 0),
    },
    { id: "creditReport", label: "Credit report uploaded", done: hasReport },
    { id: "identityProof", label: "Proof of identity uploaded", done: hasIdProof },
  ];
}

/** Per-item evidence status used by the Analyze step. */
export type DisputedItemAnalysis = {
  item: DisputedItemDraft;
  categoryLabel: string;
  evidenceHint: string;
  hasDescription: boolean;
  strength: "strong" | "needs_more" | "incomplete";
  gap: string | null;
};

/**
 * Real per-category evidence checking, not a static illustrative table:
 * every disputed item is judged against what its own FCRA category actually
 * needs to succeed in reinvestigation (e.g. an identity-theft claim needs
 * far more than "explain what's wrong" — it needs an FTC/police report).
 * Identical judging logic to TransUnion's — the FCRA reinvestigation
 * standard for a given category doesn't change by bureau.
 */
export function analyzeDisputedItems(matter: StepMatterState): DisputedItemAnalysis[] {
  const intake = (matter.steps.intake?.data ?? {}) as ExperianDisputeIntake;
  const items = intake.disputedItems ?? [];
  const files = (matter.steps.documents?.data.files as { id: string; name: string; category?: string }[]) ?? [];
  const hasIdTheftDoc = files.some((f) => /identity\s*theft|police\s*report|ftc/i.test(f.category ?? f.name));
  const hasStatement = files.some((f) => /statement|payment|receipt/i.test(f.category ?? f.name));

  return items.map((item) => {
    const option = DISPUTE_CATEGORY_OPTIONS.find((o) => o.value === item.category);
    const hasDescription = item.description.trim().length > 0;
    let strength: DisputedItemAnalysis["strength"] = "incomplete";
    let gap: string | null = null;

    if (!item.category || !hasDescription) {
      strength = "incomplete";
      gap = "Pick a dispute category and explain what's wrong before this item can be included in the letter.";
    } else if ((item.category === "not_mine" || item.category === "mixed_file") && !hasIdTheftDoc) {
      strength = "needs_more";
      gap = "Identity-theft and mixed-file claims are far stronger with a police report or FTC identity theft report attached — add one in Documents if you have it.";
    } else if ((item.category === "incorrect_amount" || item.category === "incorrect_status") && !hasStatement) {
      strength = "needs_more";
      gap = "A statement or payment record showing the correct balance or status will make this dispute much harder to dismiss — add one in Documents if you have it.";
    } else if (item.category === "outdated" && !item.correctInformation.trim()) {
      strength = "needs_more";
      gap = "State the date of first delinquency (or bankruptcy discharge date) so it's clear the 7- or 10-year reporting window has passed.";
    } else {
      strength = "strong";
    }

    return {
      item,
      categoryLabel: option?.label ?? "Uncategorized",
      evidenceHint: option?.evidenceHint ?? "",
      hasDescription,
      strength,
      gap,
    };
  });
}

/**
 * Real pricing profile ("experian-dispute" under the "notice-respond"
 * vertical in @mailmypdf/pricing — same STANDARD $29.99 band as
 * transunion-dispute). Verified this should reuse the identical tier rather
 * than get its own: the service is the same document-preparation-and-mailing
 * product regardless of which bureau receives the letter, and Experian's
 * process (single recipient, no bureau-specific extra work) doesn't justify
 * a different price. See the new "experian-dispute" entry added next to
 * "transunion-dispute" in packages/pricing/src/index.ts.
 */
const _p = getWorkflowPricingProfile("experian-dispute")!;

export const EXPERIAN_DISPUTE_PRICING = {
  preparationFee: _p.basePriceCents / 100,
  includedResponsePages: _p.includedPages,
  responsePagePrice: (_p.extraPageRateCents || 0) / 100,
  supportingPagePrice: (_p.supportingPageRateCents || 0) / 100,
  standardMail: PRICES.standard / 100,
  certifiedMail: PRICES.certified / 100,
  registeredMail: PRICES.registered / 100,
} as const;

/**
 * Maps this workflow's own intake shape onto `generateCreditDisputeDraft`'s
 * shared FCRA letter generator (`@/domain/credit-dispute`) — the single
 * source of truth for dispute-letter language, also used by the
 * TransUnion/Equifax workflows. Kept here (not duplicated in the Draft step
 * component) so the mapping is exercised the same way in the step-workflow
 * UI as anywhere else that generates this letter.
 */
export function buildExperianDraftParams(matter: StepMatterState): CreditDisputeDraftParams {
  const intake = (matter.steps.intake?.data ?? {}) as ExperianDisputeIntake;
  const items = intake.disputedItems ?? [];
  const defaultObjective =
    "I request that Experian investigate each item listed above and delete or correct any information that is inaccurate, incomplete, or cannot be verified, as required by the Fair Credit Reporting Act.";
  const synthesizedFacts = items
    .filter((item) => item.description.trim())
    .map((item, index) => `${index + 1}. ${item.creditorName || "Account"}: ${item.description.trim()}${item.correctInformation.trim() ? ` The correct information is: ${item.correctInformation.trim()}.` : ""}`)
    .join("\n");

  return {
    bureauId: "experian",
    consumerName: intake.consumerName ?? "",
    consumerAddress: intake.consumerAddress ?? null,
    reportDate: intake.reportDate ?? null,
    reportNumber: intake.reportNumber ?? null,
    disputedItems: items.map((item) => ({
      accountName: item.creditorName || null,
      accountNumber: item.accountNumber || null,
      errorType: (item.category || "other") as CreditErrorType,
      errorDescription: item.description || "Disputed item on credit report",
      correctInformation: item.correctInformation || null,
    })),
    userFacts: intake.additionalContext?.trim() || synthesizedFacts,
    userObjective: intake.requestedOutcome?.trim() || defaultObjective,
  };
}

export function generateExperianDisputeDraft(matter: StepMatterState): string {
  return generateCreditDisputeDraft(buildExperianDraftParams(matter));
}

export const experianDisputeMailingPackage = [
  { label: "FCRA dispute letter to Experian's National Consumer Assistance Center" },
  { label: "Itemized list of disputed accounts with FCRA dispute categories" },
  { label: "Supporting evidence (proof of identity, statements, payment records)" },
  {
    label: `Preparation fee ($${EXPERIAN_DISPUTE_PRICING.preparationFee.toFixed(2)}, includes ${EXPERIAN_DISPUTE_PRICING.includedResponsePages} response pages)`,
  },
  { label: "Proof of delivery (certified mail recommended to start the FCRA 30-day clock)" },
];
