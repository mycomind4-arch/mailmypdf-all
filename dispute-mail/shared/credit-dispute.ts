/* ═══════════════════════════════════════════════════════════
   SHARED CREDIT-BUREAU DISPUTE DOMAIN LOGIC — ported from
   apps/verticals/notice-respond/src/domain/credit-dispute.ts.

   Supports: TransUnion, Experian, Equifax
   Legal basis: Fair Credit Reporting Act (FCRA) — 15 U.S.C. 1681
   Key sections: § 605 (reporting time limits), § 611 (dispute procedure),
   § 623 (duties of furnishers)

   This module is parameterized by bureau configuration so each workflow
   only needs to provide bureau-specific details (name, mailing address,
   phone) rather than reimplementing draft logic.

   Mailing addresses and phone numbers below are carried forward EXACTLY
   from the legacy source, including its verification notes. Do not alter
   without independently re-verifying against each bureau's own published
   dispute materials.
   ═══════════════════════════════════════════════════════════ */

// ── Bureau Configuration ───────────────────────────────────────

export interface BureauConfig {
  id: "transunion" | "experian" | "equifax";
  name: string;
  displayName: string;
  mailingAddress: {
    org: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    zip: string;
  };
  phone: string;
  detectionPattern: RegExp;
}

export const BUREAU_CONFIGS: Record<BureauConfig["id"], BureauConfig> = {
  transunion: {
    id: "transunion",
    name: "TransUnion",
    displayName: "TransUnion",
    mailingAddress: { org: "TransUnion LLC", line1: "Consumer Dispute Center", line2: "P.O. Box 2000", city: "Chester", state: "PA", zip: "19016" },
    phone: "800-916-8800",
    detectionPattern: /trans\s*union|transunion/i,
  },
  experian: {
    id: "experian",
    name: "Experian",
    displayName: "Experian",
    // Experian National Consumer Assistance Center — verified against
    // experian.com/help/contact and independent consumer-law sources.
    mailingAddress: { org: "Experian", line1: "P.O. Box 4500", line2: "", city: "Allen", state: "TX", zip: "75013" },
    phone: "888-397-3742",
    detectionPattern: /experian/i,
  },
  equifax: {
    id: "equifax",
    name: "Equifax",
    displayName: "Equifax",
    // Verified against Equifax's own Dispute Request Form
    // (assets.equifax.com/assets/personal/Dispute.pdf) and corroborated by
    // independent consumer-law sources — this replaced two prior, DIFFERENT
    // and BOTH WRONG addresses that had drifted into the legacy codebase
    // (see equifax-dispute.ts's step-workflow comment for the full history).
    // Phone is Equifax's dispute line, verified against multiple independent
    // sources (1-888-378-4329 / 1-888-EQUIFAX is Equifax's separate general
    // customer-service line, not the dispute line).
    mailingAddress: { org: "Equifax Information Services LLC", line1: "P.O. Box 740256", line2: "", city: "Atlanta", state: "GA", zip: "30374-0256" },
    phone: "866-349-5191",
    detectionPattern: /equifax/i,
  },
};

// ── Types ───────────────────────────────────────────────────────

export type CreditErrorType =
  | "not_mine"
  | "incorrect_amount"
  | "incorrect_account"
  | "outdated"
  | "duplicate"
  | "incorrect_status"
  | "incorrect_personal_info"
  | "unauthorized_inquiry"
  | "mixed_file"
  | "other";

export interface DisputedItem {
  accountName: string | null;
  accountNumber: string | null;
  errorType: CreditErrorType;
  errorDescription: string;
  correctInformation: string | null;
}

// ── Draft Generation (shared) ─────────────────────────────────

export interface CreditDisputeDraftParams {
  bureauId: BureauConfig["id"];
  consumerName: string;
  consumerAddress: string | null;
  reportDate: string | null;
  reportNumber: string | null;
  disputedItems: DisputedItem[];
  userFacts: string;
  userObjective: string;
}

export function generateCreditDisputeDraft(params: CreditDisputeDraftParams): string {
  const config = BUREAU_CONFIGS[params.bureauId];
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const lines: string[] = [
    date,
    "",
    config.mailingAddress.org,
  ];
  if (config.mailingAddress.line1) lines.push(config.mailingAddress.line1);
  if (config.mailingAddress.line2) lines.push(config.mailingAddress.line2);
  lines.push(
    config.mailingAddress.city + ", " + config.mailingAddress.state + " " + config.mailingAddress.zip,
    "",
    "Re: Dispute of Inaccurate Information on Credit Report",
    params.reportNumber ? "Report Number: " + params.reportNumber : "",
    params.reportDate ? "Report Date: " + params.reportDate : "",
    "",
    "To Whom It May Concern:",
    "",
    "I am writing to dispute inaccurate information appearing on my " + config.displayName + " credit report. Under the Fair Credit Reporting Act (FCRA), 15 U.S.C. Section 1681i, I have the right to dispute incomplete or inaccurate information, and you are required to investigate and correct or delete such information within 30 days.",
    "",
    "Consumer Information:",
    "Name: " + (params.consumerName || "[YOUR NAME]"),
    "Address: " + (params.consumerAddress || "[YOUR ADDRESS]"),
    "",
    "Disputed Items:",
  );

  if (params.disputedItems.length > 0) {
    params.disputedItems.forEach((item, i) => {
      lines.push(
        "",
        (i + 1) + ". " + (item.accountName ?? "Account") + " (Acct: " + (item.accountNumber ?? "N/A") + ")",
        "   Error Type: " + item.errorType,
        "   Description: " + item.errorDescription,
      );
      if (item.correctInformation) lines.push("   Correct Information: " + item.correctInformation);
    });
  } else {
    lines.push("  [LIST EACH ITEM YOU ARE DISPUTING — account name, account number, and the specific error]");
  }

  lines.push(
    "",
    "Explanation and Supporting Facts:",
    params.userFacts || "[Explain why each item is inaccurate and what the correct information should be.]",
    "",
    "Requested Action:",
    params.userObjective || "I request that " + config.displayName + " investigate these disputes and remove or correct the inaccurate information as required by FCRA Section 611.",
    "",
    "Supporting Documents:",
    "  [LIST ENCLOSED DOCUMENTS — proof of identity, account statements, payment records, prior correspondence, police report if identity theft, etc.]",
    "",
    "I request that you complete your reinvestigation within 30 days of receiving this letter, as required by FCRA Section 611(a)(1)(A) (45 days if I submit additional relevant information during that period). If any item cannot be verified as accurate and complete, please delete or correct it, provide me with a free updated copy of my credit report reflecting the change, and notify each furnisher of information that provided the inaccurate information, as required by FCRA Section 611(a)(6) and 611(d).",
    "",
    "If any information I have corrected or disputed here was furnished to anyone within the past two years for employment purposes, or within the past six months for any other purpose, please provide corrected notices to each such recipient at my request, as permitted under FCRA Section 611(d).",
    "",
    "If you determine that any disputed information is accurate, please (1) provide me with the name, address, and telephone number of the furnisher, as required by FCRA Section 611(a)(6)(B)(iii); (2) provide me, upon my written request within 15 days of receiving your results, a description of the procedure used to determine the accuracy and completeness of the information, including the business name and address of any furnisher contacted, as required by FCRA Section 611(a)(7); and (3) if I still disagree after your reinvestigation, place a statement of the dispute (not to exceed 100 words, at my election) in my file and include it or a clear summary of it in any subsequent report, as required by FCRA Section 611(b)-(c).",
    "",
    "Sincerely,",
    "[YOUR NAME]",
    "[YOUR ADDRESS]",
    "[YOUR PHONE]",
    "[YOUR SSN — last 4 digits only]",
  );

  return lines.filter((l) => l !== "").join("\n");
}

// ── Dispute-reason categories (bureau-agnostic) ────────────────

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
 * Real per-category evidence checking: every disputed item is judged
 * against what its own FCRA category actually needs to succeed in
 * reinvestigation. Bureau-agnostic — the FCRA reinvestigation standard for
 * a given category doesn't change by bureau.
 */
export function analyzeDisputedItems(
  items: DisputedItemDraft[],
  documentCategories: string[],
): DisputedItemAnalysis[] {
  const hasIdTheftDoc = documentCategories.some((c) => /identity\s*theft|police\s*report|ftc/i.test(c));
  const hasStatement = documentCategories.some((c) => /statement|payment|receipt/i.test(c));

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

export type CreditDisputeIntake = {
  consumerName?: string;
  consumerAddress?: string;
  reportDate?: string;
  reportNumber?: string;
  disputedBefore?: boolean;
  disputedItems?: DisputedItemDraft[];
  additionalContext?: string;
  requestedOutcome?: string;
  documentCategories?: string[];
};

export function buildCreditDisputeDraftParams(
  bureauId: BureauConfig["id"],
  intake: CreditDisputeIntake,
): CreditDisputeDraftParams {
  const config = BUREAU_CONFIGS[bureauId];
  const items = intake.disputedItems ?? [];
  const defaultObjective =
    `I request that ${config.displayName} investigate each item listed above and delete or correct any information that is inaccurate, incomplete, or cannot be verified, as required by the Fair Credit Reporting Act.`;
  const synthesizedFacts = items
    .filter((item) => item.description.trim())
    .map((item, index) => `${index + 1}. ${item.creditorName || "Account"}: ${item.description.trim()}${item.correctInformation.trim() ? ` The correct information is: ${item.correctInformation.trim()}.` : ""}`)
    .join("\n");

  return {
    bureauId,
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

export function getCreditDisputeReadiness(intake: CreditDisputeIntake): Array<{ id: string; label: string; done: boolean }> {
  const items = intake.disputedItems ?? [];
  const categories = intake.documentCategories ?? [];
  const hasReport = categories.some((c) => /report/i.test(c));
  const hasIdProof = categories.some((c) => /identity|id\b|license|passport/i.test(c));

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
