import type { ChecklistItemState, StepMatterState, StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
import { generateCreditDisputeDraft, type CreditErrorType, type CreditDisputeDraftParams } from "@/domain/credit-dispute";

/**
 * A TransUnion credit-report dispute is a single-recipient FCRA process
 * (everything goes to one bureau), but it is not single-issue — a report
 * commonly has several disputed tradelines, each needing its own FCRA
 * category and evidence. That per-item structure lives inside Intake (a
 * repeatable disputed-item list) rather than as a separate "Evidence" step:
 * unlike Car Insurance Appeal's three fixed dispute types (liability,
 * damage, coverage) or Administrative Decision Appeal's procedural
 * chronology, a credit dispute doesn't have a small fixed set of issue
 * categories to build a dedicated builder around, and it has no hearing
 * schedule or correspondence timeline to chart — the only "timeline" is the
 * single 30/45-day FCRA investigation clock that starts when TransUnion
 * receives the letter, which is better shown as a fact on Analyze/Review
 * than as its own step. Documents collects the credit report and per-item
 * proof; Analyze checks each item's category against what FCRA reinvestigation
 * actually needs. Six steps — Intake, Documents, Analyze, Draft, Review,
 * Mail — is what this specific process needs, not a template step count.
 */
export const transunionDisputeStepWorkflow: StepWorkflowDefinition = {
  id: "transunion-dispute",
  title: "TransUnion Dispute",
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
 * The FCRA dispute-reason categories a bureau reinvestigation actually
 * recognizes (mirrors `CreditErrorType` in `@/domain/credit-dispute`, kept as
 * a single source of truth so Draft's call into `generateCreditDisputeDraft`
 * type-checks directly against whatever the user picks here). Each carries
 * plain-language copy and the evidence that actually moves a FCRA
 * reinvestigation for that category — used by both Intake's help text and
 * Analyze's gap-checking below.
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
export type TransUnionDisputeIntake = {
  consumerName?: string;
  consumerAddress?: string;
  reportDate?: string;
  reportNumber?: string;
  disputedBefore?: boolean;
  disputedItems?: DisputedItemDraft[];
  /** Free-text context beyond the per-item descriptions — becomes the letter's "Explanation and Supporting Facts" section. */
  additionalContext?: string;
  /** What the consumer wants TransUnion to do — becomes the letter's "Requested Action" section. */
  requestedOutcome?: string;
};

/**
 * The "Readiness checklist" shown in the right rail on every screen —
 * derived from Intake and Documents data, same pattern as every other
 * converted workflow's readiness list.
 */
export function getTransUnionDisputeReadiness(matter: StepMatterState): ChecklistItemState[] {
  const intake = (matter.steps.intake?.data ?? {}) as TransUnionDisputeIntake;
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
 */
export function analyzeDisputedItems(matter: StepMatterState): DisputedItemAnalysis[] {
  const intake = (matter.steps.intake?.data ?? {}) as TransUnionDisputeIntake;
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
 * Real pricing profile ("transunion-dispute" under the "notice-respond"
 * vertical in @mailmypdf/pricing — STANDARD band, $29.99, same tier as this
 * catalog's other single-bureau credit-report workflow) rather than
 * hardcoded numbers, so the step-workflow UI can't drift from what checkout
 * actually charges.
 */
const _p = getWorkflowPricingProfile("transunion-dispute")!;

export const TRANSUNION_DISPUTE_PRICING = {
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
 * Experian/Equifax workflows. Kept here (not duplicated in the Draft step
 * component) so the mapping is exercised the same way in the step-workflow
 * UI as anywhere else that generates this letter.
 */
export function buildTransUnionDraftParams(matter: StepMatterState): CreditDisputeDraftParams {
  const intake = (matter.steps.intake?.data ?? {}) as TransUnionDisputeIntake;
  const items = intake.disputedItems ?? [];
  const defaultObjective =
    "I request that TransUnion investigate each item listed above and delete or correct any information that is inaccurate, incomplete, or cannot be verified, as required by the Fair Credit Reporting Act.";
  const synthesizedFacts = items
    .filter((item) => item.description.trim())
    .map((item, index) => `${index + 1}. ${item.creditorName || "Account"}: ${item.description.trim()}${item.correctInformation.trim() ? ` The correct information is: ${item.correctInformation.trim()}.` : ""}`)
    .join("\n");

  return {
    bureauId: "transunion",
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

export function generateTransUnionDisputeDraft(matter: StepMatterState): string {
  return generateCreditDisputeDraft(buildTransUnionDraftParams(matter));
}

export const transunionDisputeMailingPackage = [
  { label: "FCRA dispute letter to TransUnion's Consumer Dispute Center" },
  { label: "Itemized list of disputed accounts with FCRA dispute categories" },
  { label: "Supporting evidence (proof of identity, statements, payment records)" },
  {
    label: `Preparation fee ($${TRANSUNION_DISPUTE_PRICING.preparationFee.toFixed(2)}, includes ${TRANSUNION_DISPUTE_PRICING.includedResponsePages} response pages)`,
  },
  { label: "Proof of delivery (certified mail recommended to start the FCRA 30-day clock)" },
];
