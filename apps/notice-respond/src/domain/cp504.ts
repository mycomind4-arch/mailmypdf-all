/* ═══════════════════════════════════════════════════════════
   CP504 DOMAIN LOGIC — specialized extraction and analysis
   for the IRS CP504 Intent to Levy notice.

   A CP504 is sent when the taxpayer has an unpaid balance and
   prior notices (CP14, CP501, CP503) have not resolved the
   matter. The CP504 notifies the taxpayer of the IRS's intent
   to levy (seize assets) and gives them a 30-day window to
   request a Collection Due Process (CDP) hearing.

   This is more urgent than CP14 — assets are at risk.
   The response typically requests a CDP hearing, an installment
   agreement, an offer in compromise, or disputes the balance.

   All extraction is deterministic (pattern-based, no LLM).
   All language is factual — no tax conclusions.
   ═══════════════════════════════════════════════════════════ */

import { createFact, type NoticeFact } from "./fact";
import { classifyNoticeType, type NoticeType } from "./notice-type";

// ── Types ─────────────────────────────────────────────────────

export interface CP504Extraction {
  isCP504: boolean;
  classificationConfidence: number;
  noticeNumber: string | null;
  noticeDate: string | null;
  responseDeadline: string | null;
  cdpHearingDeadline: string | null;
  taxYear: string | null;
  balanceDue: string | null;
  penaltyAmount: string | null;
  interestAmount: string | null;
  totalDue: string | null;
  levyType: string | null;
  responseAddress: string | null;
  contactPhone: string | null;
  requestedAction: string | null;
  cdpRightsNotice: boolean;
  facts: NoticeFact[];
  warnings: string[];
}

// ── Patterns ──────────────────────────────────────────────────

function extractNoticeNumber(text: string): string | null {
  const patterns = [
    /(?:notice|letter|reference)\s*(?:number|no\.?)?\s*:?\s*(CP\s*504[-\s]*\d{4}[-\s]*\d{3,6}[-\s]*[A-Z]?)/i,
    /\b(CP504[-\s]*\d{4}[-\s]*\d{3,6}[-\s]*[A-Z]?)\b/i,
    /\b(CP\s*504[-\s]*\d{4}[-\s]*\d{3,6}[-\s]*[A-Z]?)\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].replace(/\s+/g, "-").trim();
  }
  const simple = text.match(/\b(CP504)\b/i);
  return simple ? simple[1].toUpperCase() : null;
}

function extractDate(text: string, labels: string[]): string | null {
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/i;
  for (const label of labels) {
    const labelPattern = new RegExp(label + "\\s*:?\\s*(" + datePattern.source + ")", "i");
    const match = text.match(labelPattern);
    if (match) return match[1];
  }
  return null;
}

function extractAmount(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const pattern = new RegExp(label + "\\s*:?\\s*\\$?\\s*([\\d,]+\\.?\\d*)", "i");
    const match = text.match(pattern);
    if (match) return "$" + match[1].replace(/\s/g, "");
  }
  for (const label of labels) {
    const idx = text.toLowerCase().indexOf(label.toLowerCase());
    if (idx >= 0) {
      const window = text.substring(idx, idx + 100);
      const amountMatch = window.match(/\$[\d,]+\.?\d*/);
      if (amountMatch) return amountMatch[0];
    }
  }
  return null;
}

function extractLevyType(text: string): string | null {
  if (/wage[s]?.*levy|levy.*wage/i.test(text)) return "Wage Levy";
  if (/bank.*levy|levy.*bank/i.test(text)) return "Bank Account Levy";
  if (/property.*levy|levy.*property|seizure/i.test(text)) return "Property Seizure";
  if (/levy/i.test(text)) return "Levy (general)";
  return null;
}

function extractResponseAddress(text: string): string | null {
  const patterns = [
    /(?:mail|send|reply|respond)\s*(?:to|your response to)[:\s]*\n?([\s\S]{20,200}?(?:\d{5}))/i,
    /(?:address|department)[:\s]*\n?([\s\S]{20,200}?(?:\d{5}))/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim().replace(/\n/g, ", ");
  }
  return null;
}

function extractPhone(text: string): string | null {
  const match = text.match(/(?:call|phone|contact)\s*:?\s*(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/i);
  return match ? match[1] : null;
}

function checkCDPRights(text: string): boolean {
  return /collection\s+due\s+process|CDP|hearing\s+rights|notice\s+of\s+right\s+to\s+hearing/i.test(text);
}

// ── Extraction ────────────────────────────────────────────────

export function extractCP504(text: string): CP504Extraction {
  const noticeNumber = extractNoticeNumber(text);
  const isCP504 = noticeNumber?.includes("504") || /\bCP\s*504\b/i.test(text);
  const classification = classifyNoticeType(text);
  const classificationConfidence = isCP504
    ? Math.max(classification.confidence, 0.85)
    : classification.confidence;

  const noticeDate = extractDate(text, ["notice date", "date of notice", "date"]);
  const responseDeadline = extractDate(text, [
    "response deadline", "respond by", "deadline",
    "you must respond", "30 days",
  ]);
  const cdpHearingDeadline = extractDate(text, [
    "hearing", "CDP", "collection due process",
    "30 days from", "30-day",
  ]);

  const taxYear = (() => {
    const match = text.match(/tax\s*year\s*:?\s*(20\d{2})/i) ?? text.match(/\b(20\d{2})\s*tax\s*year\b/i);
    return match ? match[1] : null;
  })();

  const balanceDue = extractAmount(text, ["balance due", "amount you owe", "unpaid balance", "balance"]);
  const penaltyAmount = extractAmount(text, ["penalty", "penalties"]);
  const interestAmount = extractAmount(text, ["interest", "interest charged"]);
  const totalDue = extractAmount(text, ["total due", "total amount", "total owed", "amount due"]);

  const levyType = extractLevyType(text);
  const responseAddress = extractResponseAddress(text);
  const contactPhone = extractPhone(text);
  const cdpRightsNotice = checkCDPRights(text);

  const requestedAction = (() => {
    if (cdpRightsNotice) return "Request a Collection Due Process hearing or pay the balance";
    if (/pay.*balance|payment/i.test(text)) return "Pay the balance or request a hearing";
    return "Respond to the notice";
  })();

  // ── Build facts ──
  const facts: NoticeFact[] = [];
  if (noticeNumber) facts.push(createFact("Notice Number", noticeNumber, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (noticeDate) facts.push(createFact("Notice Date", noticeDate, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (taxYear) facts.push(createFact("Tax Year", taxYear, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (balanceDue) facts.push(createFact("Balance Due", balanceDue, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (penaltyAmount) facts.push(createFact("Penalty Amount", penaltyAmount, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (interestAmount) facts.push(createFact("Interest Amount", interestAmount, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (totalDue) facts.push(createFact("Total Due", totalDue, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (responseDeadline) facts.push(createFact("Response Deadline", responseDeadline, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (cdpHearingDeadline) facts.push(createFact("CDP Hearing Deadline", cdpHearingDeadline, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (levyType) facts.push(createFact("Levy Type", levyType, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (responseAddress) facts.push(createFact("Response Address", responseAddress, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (contactPhone) facts.push(createFact("Contact Phone", contactPhone, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));

  // ── Warnings ──
  const warnings: string[] = [];
  if (!isCP504) warnings.push("Document may not be a CP504 notice — verify before proceeding.");
  if (!noticeNumber) warnings.push("Notice number not found — check the document manually.");
  if (!responseDeadline && !cdpHearingDeadline) warnings.push("No deadline found — the CP504 typically gives 30 days to request a CDP hearing. Verify the deadline immediately.");
  if (!balanceDue && !totalDue) warnings.push("No balance due amount found — verify the amount manually.");
  if (cdpRightsNotice && !cdpHearingDeadline) warnings.push("CDP hearing rights detected but no hearing deadline found — verify the 30-day deadline immediately.");
  if (levyType) warnings.push("Levy type detected: " + levyType + ". This is urgent — assets may be at risk.");

  return {
    isCP504,
    classificationConfidence,
    noticeNumber,
    noticeDate,
    responseDeadline,
    cdpHearingDeadline,
    taxYear,
    balanceDue,
    penaltyAmount,
    interestAmount,
    totalDue,
    levyType,
    responseAddress,
    contactPhone,
    requestedAction,
    cdpRightsNotice,
    facts,
    warnings,
  };
}

// ── Draft Generation ─────────────────────────────────────────

export interface CP504DraftParams {
  noticeNumber: string;
  taxYear: string | null;
  noticeDate: string | null;
  responseDeadline: string | null;
  cdpHearingDeadline: string | null;
  userFacts: string;
  userObjective: string;
}

export function generateCP504Draft(params: CP504DraftParams): string {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const lines = [
    date,
    "",
    "Internal Revenue Service",
    params.noticeNumber ? "Re: " + params.noticeNumber : "Re: CP504 — Intent to Levy Notice",
    params.taxYear ? "Tax Year: " + params.taxYear : "",
    "",
    "Dear Sir or Madam,",
    "",
    "I am writing in response to the CP504 Notice of Intent to Levy referenced above." + (params.taxYear ? " This response concerns the unpaid balance for tax year " + params.taxYear + "." : ""),
    "",
    "I am exercising my right to a Collection Due Process (CDP) hearing pursuant to IRC section 6330 and section 6320. I respectfully request that the IRS suspend any levy actions pending the outcome of this hearing.",
    "",
    "Response and position:",
    params.userObjective || "[State whether you are requesting a CDP hearing, an installment agreement, an offer in compromise, or disputing the balance]",
    "",
    "Factual explanation:",
    params.userFacts || "[Explain the circumstances regarding the unpaid balance and your supporting records here.]",
    "",
    "Supporting records list:",
    "  [LIST ENCLOSED DOCUMENTS — tax returns, payment records, prior correspondence, financial statements, etc.]",
    "",
    "Attachments:",
    "  [LIST ATTACHED DOCUMENTS]",
    "",
    "I respectfully request that you review this response and the enclosed documentation, and that you contact me to schedule a CDP hearing or discuss alternative collection options. If you require additional information, please contact me at your earliest convenience.",
    "",
    "Sincerely,",
    "[YOUR NAME]",
    "[YOUR ADDRESS]",
    "[YOUR PHONE]",
    "[YOUR TAXPAYER ID — last 4 digits only]",
  ];

  return lines.filter((l) => l !== "").join("\n");
}
