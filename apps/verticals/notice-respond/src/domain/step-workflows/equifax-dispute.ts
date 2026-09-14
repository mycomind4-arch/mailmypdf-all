import type { ChecklistItemState, StepMatterState, StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
import { generateCreditDisputeDraft, type CreditErrorType, type CreditDisputeDraftParams } from "@/domain/credit-dispute";

/**
 * An Equifax credit-report dispute is governed by the same federal statute
 * as TransUnion's and Experian's (FCRA Section 611) and has the identical
 * shape: one recipient (Equifax), a report that commonly carries several
 * disputed tradelines each needing its own FCRA category and evidence, and a
 * single 30/45-day reinvestigation clock rather than a hearing schedule or
 * correspondence timeline to chart. Nothing about Equifax's own dispute
 * process (see `EQUIFAX_PROCESS_NOTES` below — verified against Equifax's
 * own dispute form and independent sources, not assumed from TransUnion's or
 * Experian's pages) changes that shape, so this workflow independently
 * arrives at the same six steps the other two did — Intake, Documents,
 * Analyze, Draft, Review, Mail — not by copying either sibling file but
 * because the underlying legal process all three workflows automate is the
 * same kind of process. Documents collects the credit report and per-item
 * proof; Analyze checks each item's category against what FCRA
 * reinvestigation actually needs, same as TransUnion's and Experian's.
 */
export const equifaxDisputeStepWorkflow: StepWorkflowDefinition = {
  id: "equifax-dispute",
  title: "Equifax Dispute",
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
 * What's genuinely Equifax-specific, verified via web search (and, for the
 * mailing address, Equifax's own published Dispute Request Form at
 * assets.equifax.com/assets/personal/Dispute.pdf) rather than carried over
 * from TransUnion's or Experian's pages:
 * - Mailing address: Equifax Information Services LLC, P.O. Box 740256,
 *   Atlanta, GA 30374-0256. This is a real correction, not a cosmetic one —
 *   before this conversion, two DIFFERENT and BOTH WRONG addresses had
 *   drifted into this app for Equifax: `credit-dispute.ts`'s
 *   `BUREAU_CONFIGS.equifax` had "P.O. Box 105069, Atlanta, GA 30348" (an
 *   Equifax P.O. Box, but not the dispute address — third-party sources
 *   associate that box with other Equifax correspondence), while
 *   `workflow-seo.ts`'s FAQ answer separately said "P.O. Box 25022, Atlanta,
 *   GA 30307" (unverifiable against any Equifax source found — likely
 *   fabricated). Neither matched the other, let alone Equifax's own form.
 *   Both are corrected as part of this conversion (see credit-dispute.ts,
 *   workflow-catalog.ts, workflow-prompts.ts, and workflow-seo.ts).
 * - Phone: 866-349-5191, Equifax's dispute line (verified against multiple
 *   independent consumer-law sources). Equifax's *general* customer-service
 *   line, 1-888-378-4329 ("1-888-EQUIFAX"), is a different number — the
 *   prior codebase value, 866-349-8231, matched neither and could not be
 *   confirmed against any source.
 * - Equifax's online portal is "myEquifax" at myequifax.com — its own
 *   product with its own login, distinct from TransUnion's own portal and
 *   Experian's "Experian Dispute Center", even though all three bureaus (and
 *   most furnishers) exchange the underlying dispute over the same shared
 *   e-OSCAR network.
 * - Credit Karma's Direct Dispute feature does NOT cover Equifax — verified
 *   independently rather than assumed from Experian's page (which claims,
 *   inaccurately, that Credit Karma "partners with Equifax and TransUnion"
 *   for that feature — see the note on the Experian workflow file; that
 *   claim is wrong and worth a follow-up fix). Credit Karma's own published
 *   help content is explicit that Direct Dispute only works for TransUnion;
 *   an Equifax error surfaced in Credit Karma redirects the user to
 *   Equifax's own website rather than filing anything in-app. That makes a
 *   mailed, certified dispute matter here for the same reason it matters for
 *   Experian: it is not a "second option" alongside an in-app dispute, it is
 *   the actual dispute.
 * - Equifax's 2017 data breach (roughly 147 million people affected) and the
 *   resulting multi-state/FTC settlement (up to 10 years of free credit
 *   monitoring, or a cash alternative) is genuinely useful, Equifax-specific
 *   context for a consumer who finds an unfamiliar account on their Equifax
 *   report — see the dedicated FAQ entry in `workflow-seo.ts`. It does not
 *   change the dispute *process* (same FCRA statute, same timeline), so it
 *   is mentioned once, accurately, rather than worked into the step UI.
 */
export const EQUIFAX_PROCESS_NOTES = {
  mailingOrgFull: "Equifax Information Services LLC",
  onlinePortalName: "myEquifax",
  onlinePortalUrl: "myequifax.com",
  phone: "866-349-5191",
  creditKarmaSupportsDirectDispute: false,
} as const;

/**
 * The FCRA dispute-reason categories a bureau reinvestigation actually
 * recognizes — bureau-agnostic (mirrors `CreditErrorType` in
 * `@/domain/credit-dispute`), so this list is intentionally the same set
 * TransUnion's and Experian's workflows offer. It is kept as its own copy
 * here rather than imported from a sibling workflow file so this workflow's
 * step components don't depend on a sibling workflow's file — each Notice
 * Respond workflow owns its own definition (see the comment on
 * `stepWorkflows` in `domain/step-workflows/index.ts`).
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
export type EquifaxDisputeIntake = {
  consumerName?: string;
  consumerAddress?: string;
  reportDate?: string;
  reportNumber?: string;
  disputedBefore?: boolean;
  disputedItems?: DisputedItemDraft[];
  /** Free-text context beyond the per-item descriptions — becomes the letter's "Explanation and Supporting Facts" section. */
  additionalContext?: string;
  /** What the consumer wants Equifax to do — becomes the letter's "Requested Action" section. */
  requestedOutcome?: string;
};

/**
 * The "Readiness checklist" shown in the right rail on every screen —
 * derived from Intake and Documents data, same pattern as every other
 * converted workflow's readiness list.
 */
export function getEquifaxDisputeReadiness(matter: StepMatterState): ChecklistItemState[] {
  const intake = (matter.steps.intake?.data ?? {}) as EquifaxDisputeIntake;
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
 * Identical judging logic to TransUnion's and Experian's — the FCRA
 * reinvestigation standard for a given category doesn't change by bureau.
 */
export function analyzeDisputedItems(matter: StepMatterState): DisputedItemAnalysis[] {
  const intake = (matter.steps.intake?.data ?? {}) as EquifaxDisputeIntake;
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
 * Real pricing profile ("equifax-dispute" under the "notice-respond"
 * vertical in @mailmypdf/pricing — same STANDARD $29.99 band as
 * transunion-dispute and experian-dispute). Verified this should reuse the
 * identical tier rather than get its own: the service is the same
 * document-preparation-and-mailing product regardless of which bureau
 * receives the letter, and Equifax's process (single recipient, no
 * bureau-specific extra work) doesn't justify a different price. See the new
 * "equifax-dispute" entry added next to "experian-dispute" in
 * packages/pricing/src/index.ts.
 */
const _p = getWorkflowPricingProfile("equifax-dispute")!;

export const EQUIFAX_DISPUTE_PRICING = {
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
 * TransUnion/Experian workflows. Kept here (not duplicated in the Draft step
 * component) so the mapping is exercised the same way in the step-workflow
 * UI as anywhere else that generates this letter.
 */
export function buildEquifaxDraftParams(matter: StepMatterState): CreditDisputeDraftParams {
  const intake = (matter.steps.intake?.data ?? {}) as EquifaxDisputeIntake;
  const items = intake.disputedItems ?? [];
  const defaultObjective =
    "I request that Equifax investigate each item listed above and delete or correct any information that is inaccurate, incomplete, or cannot be verified, as required by the Fair Credit Reporting Act.";
  const synthesizedFacts = items
    .filter((item) => item.description.trim())
    .map((item, index) => `${index + 1}. ${item.creditorName || "Account"}: ${item.description.trim()}${item.correctInformation.trim() ? ` The correct information is: ${item.correctInformation.trim()}.` : ""}`)
    .join("\n");

  return {
    bureauId: "equifax",
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

export function generateEquifaxDisputeDraft(matter: StepMatterState): string {
  return generateCreditDisputeDraft(buildEquifaxDraftParams(matter));
}

export const equifaxDisputeMailingPackage = [
  { label: "FCRA dispute letter to Equifax Information Services LLC" },
  { label: "Itemized list of disputed accounts with FCRA dispute categories" },
  { label: "Supporting evidence (proof of identity, statements, payment records)" },
  {
    label: `Preparation fee ($${EQUIFAX_DISPUTE_PRICING.preparationFee.toFixed(2)}, includes ${EQUIFAX_DISPUTE_PRICING.includedResponsePages} response pages)`,
  },
  { label: "Proof of delivery (certified mail recommended to start the FCRA 30-day clock)" },
];
