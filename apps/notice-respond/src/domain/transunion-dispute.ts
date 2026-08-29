/* ═══════════════════════════════════════════════════════════
   TRANSUNION DISPUTE DOMAIN LOGIC — specialized extraction and
   draft generation for TransUnion credit report disputes.

   Under the Fair Credit Reporting Act (FCRA), consumers have the
   right to dispute inaccurate information on their credit reports.
   TransUnion must investigate within 30 days (45 days if additional
   information is provided during the 30-day period).

   This module handles:
   - Extraction of disputed items from credit report text
   - Identification of error types (incorrect amounts, accounts not
     yours, outdated information, duplicate entries, etc.)
   - Generation of FCRA-based dispute letters

   All extraction is deterministic (pattern-based, no LLM).
   All language is factual — no legal conclusions.
   ═══════════════════════════════════════════════════════════ */

import { createFact, type NoticeFact } from "./fact";

// ── Types ─────────────────────────────────────────────────────

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

export interface TransUnionExtraction {
  isTransUnionReport: boolean;
  classificationConfidence: number;
  consumerName: string | null;
  consumerAddress: string | null;
  consumerSSN: string | null;
  reportDate: string | null;
  reportNumber: string | null;
  disputedItems: DisputedItem[];
  facts: NoticeFact[];
  warnings: string[];
}

// ── Patterns ──────────────────────────────────────────────────

function detectTransUnion(text: string): boolean {
  return /trans\s*union|transunion/i.test(text);
}

function extractConsumerName(text: string): string | null {
  const patterns = [
    /(?:consumer|name)\s*:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:prepared\s+for|report\s+for)\s*:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractConsumerAddress(text: string): string | null {
  const match = text.match(/(?:address)\s*:?\s*([\s\S]{10,100}?\d{5}(?:-\d{4})?)/i);
  return match ? match[1].trim().replace(/\n/g, ", ") : null;
}

function extractReportDate(text: string): string | null {
  const patterns = [
    /(?:report\s*date|date\s*of\s*report|as\s*of)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/i,
    /(?:pulled|generated)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractReportNumber(text: string): string | null {
  const match = text.match(/(?:report|file|confirmation)\s*(?:number|no\.?|id)\s*:?\s*([A-Z0-9-]{6,20})/i);
  return match ? match[1] : null;
}

function extractDisputedItems(text: string): DisputedItem[] {
  const items: DisputedItem[] = [];

  // Look for account entries with potential errors
  // Pattern: account name + account number
  const accountPattern = /([A-Z][A-Za-z\s&]+?)\s*(?:acct|account|#)\s*:?\s*([*X\d]{4}[\d*]{4,12})/g;
  let match;
  while ((match = accountPattern.exec(text)) !== null) {
    const accountName = match[1].trim();
    const accountNumber = match[2];

    // Try to identify error type from surrounding context
    const contextStart = Math.max(0, match.index - 100);
    const contextEnd = Math.min(text.length, match.index + 200);
    const context = text.substring(contextStart, contextEnd).toLowerCase();

    let errorType: CreditErrorType = "other";
    let errorDescription = "Disputed item on credit report";

    if (/not\s*mine|not\s*my\s*account|never\s*opened|identity\s*theft|fraud/i.test(context)) {
      errorType = "not_mine";
      errorDescription = "Account does not belong to consumer — possible identity theft or mixed file";
    } else if (/incorrect\s*amount|wrong\s*balance|amount\s*is\s*wrong|balance\s*dispute/i.test(context)) {
      errorType = "incorrect_amount";
      errorDescription = "Reported balance or amount is incorrect";
    } else if (/incorrect\s*account|wrong\s*account|account\s*number\s*wrong/i.test(context)) {
      errorType = "incorrect_account";
      errorDescription = "Account number or details are incorrect";
    } else if (/outdated|too\s*old|older\s*than\s*7|older\s*than\s*10|should\s*be\s*removed/i.test(context)) {
      errorType = "outdated";
      errorDescription = "Item is older than the allowable reporting period under FCRA 605";
    } else if (/duplicate|appears\s*twice|listed\s*twice|double/i.test(context)) {
      errorType = "duplicate";
      errorDescription = "Item appears multiple times on the report";
    } else if (/paid|current|closed|settled|incorrect\s*status/i.test(context)) {
      errorType = "incorrect_status";
      errorDescription = "Account status is reported incorrectly";
    } else if (/inquiry|inquiries|hard\s*pull|unauthorized/i.test(context)) {
      errorType = "unauthorized_inquiry";
      errorDescription = "Inquiry was made without consumer authorization";
    }

    items.push({
      accountName,
      accountNumber,
      errorType,
      errorDescription,
      correctInformation: null,
    });
  }

  return items;
}

// ── Extraction ────────────────────────────────────────────────

export function extractTransUnionDispute(text: string): TransUnionExtraction {
  const isTransUnionReport = detectTransUnion(text);
  const consumerName = extractConsumerName(text);
  const consumerAddress = extractConsumerAddress(text);
  const reportDate = extractReportDate(text);
  const reportNumber = extractReportNumber(text);
  const disputedItems = extractDisputedItems(text);

  // ── Build facts ──
  const facts: NoticeFact[] = [];
  if (isTransUnionReport) facts.push(createFact("Credit Bureau", "TransUnion", "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (consumerName) facts.push(createFact("Consumer Name", consumerName, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (consumerAddress) facts.push(createFact("Consumer Address", consumerAddress, "extracted", "medium", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (reportDate) facts.push(createFact("Report Date", reportDate, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (reportNumber) facts.push(createFact("Report Number", reportNumber, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  for (const item of disputedItems) {
    const label = "Disputed: " + (item.accountName ?? "Unknown Account");
    facts.push(createFact(label, item.errorDescription, "extracted", "medium", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  }

  // ── Warnings ──
  const warnings: string[] = [];
  if (!isTransUnionReport) warnings.push("Document may not be a TransUnion credit report — verify before proceeding.");
  if (!consumerName) warnings.push("Consumer name not found — you will need to provide this manually.");
  if (!reportDate) warnings.push("Report date not found — TransUnion must investigate within 30 days of your dispute.");
  if (disputedItems.length === 0) warnings.push("No specific disputed items detected from the document text — you will need to specify which items you are disputing.");
  if (disputedItems.length > 10) warnings.push("Many disputed items detected (" + disputedItems.length + ") — consider prioritizing the most impactful disputes.");

  return {
    isTransUnionReport,
    classificationConfidence: isTransUnionReport ? 0.9 : 0.3,
    consumerName,
    consumerAddress,
    consumerSSN: null,
    reportDate,
    reportNumber,
    disputedItems,
    facts,
    warnings,
  };
}

// ── Draft Generation ─────────────────────────────────────────

export interface TransUnionDraftParams {
  consumerName: string;
  consumerAddress: string | null;
  reportDate: string | null;
  reportNumber: string | null;
  disputedItems: DisputedItem[];
  userFacts: string;
  userObjective: string;
}

export function generateTransUnionDraft(params: TransUnionDraftParams): string {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const lines: string[] = [
    date,
    "",
    "TransUnion LLC",
    "Consumer Dispute Center",
    "P.O. Box 2000",
    "Chester, PA 19016",
    "",
    "Re: Dispute of Inaccurate Information on Credit Report",
    params.reportNumber ? "Report Number: " + params.reportNumber : "",
    params.reportDate ? "Report Date: " + params.reportDate : "",
    "",
    "To Whom It May Concern:",
    "",
    "I am writing to dispute inaccurate information appearing on my TransUnion credit report. Under the Fair Credit Reporting Act (FCRA), 15 U.S.C. Section 1681i, I have the right to dispute incomplete or inaccurate information, and you are required to investigate and correct or delete such information within 30 days.",
    "",
    "Consumer Information:",
    "Name: " + (params.consumerName || "[YOUR NAME]"),
    "Address: " + (params.consumerAddress || "[YOUR ADDRESS]"),
    "",
    "Disputed Items:",
  ];

  if (params.disputedItems.length > 0) {
    params.disputedItems.forEach((item, i) => {
      lines.push("");
      lines.push((i + 1) + ". " + (item.accountName ?? "Account") + " (Acct: " + (item.accountNumber ?? "N/A") + ")");
      lines.push("   Error Type: " + item.errorType);
      lines.push("   Description: " + item.errorDescription);
      if (item.correctInformation) {
        lines.push("   Correct Information: " + item.correctInformation);
      }
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
    params.userObjective || "I request that TransUnion investigate these disputes and remove or correct the inaccurate information as required by FCRA Section 611.",
    "",
    "Supporting Documents:",
    "  [LIST ENCLOSED DOCUMENTS — proof of identity, account statements, payment records, prior correspondence, police report if identity theft, etc.]",
    "",
    "I request that you complete your investigation within 30 days as required by FCRA Section 611(1)(A). Please send me an updated copy of my credit report reflecting the corrections, and notify each information furnisher of the dispute results as required by FCRA Section 611(6).",
    "",
    "If you determine that any disputed information is accurate, please provide me with the name, address, and telephone number of the information furnisher as required by FCRA Section 611(6)(B)(iii).",
    "",
    "Sincerely,",
    "[YOUR NAME]",
    "[YOUR ADDRESS]",
    "[YOUR PHONE]",
    "[YOUR SSN — last 4 digits only]",
  );

  return lines.filter((l) => l !== "").join("\n");
}
