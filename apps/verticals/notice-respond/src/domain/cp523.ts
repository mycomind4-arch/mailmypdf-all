/* ═══════════════════════════════════════════════════════════
   CP523 DOMAIN LOGIC — specialized extraction and analysis
   for the IRS CP523 Notice of Default on Installment Agreement
   and Intent to Levy.

   A CP523 is sent when a taxpayer has defaulted on an
   installment agreement. The IRS informs the taxpayer of the
   intent to terminate the installment agreement and seize
   (levy) their assets. The taxpayer has 30 days from the
   notice date to respond.

   The response options include:
   - Request reinstatement of the installment agreement
   - Request a Collection Due Process (CDP) hearing
   - Dispute the default determination
   - Pay the balance in full
   - Request a new installment agreement

   All extraction is deterministic (pattern-based, no LLM).
   All language is factual — no tax conclusions.

   Authoritative source:
   https://www.irs.gov/individuals/understanding-your-cp523-notice
   ═══════════════════════════════════════════════════════════ */

import { createFact, type NoticeFact } from "./fact";
import { classifyNoticeType, type NoticeType } from "./notice-type";

// ── Types ─────────────────────────────────────────────────────

export interface CP523Extraction {
  isCP523: boolean;
  classificationConfidence: number;
  noticeNumber: string | null;
  noticeDate: string | null;
  responseDeadline: string | null;
  cdpHearingDeadline: string | null;
  terminationDate: string | null;
  installmentAgreementNumber: string | null;
  defaultReason: string | null;
  taxYearsCovered: string[];
  balanceDue: string | null;
  penaltyAmount: string | null;
  interestAmount: string | null;
  totalDue: string | null;
  levyType: string | null;
  responseAddress: string | null;
  contactPhone: string | null;
  requestedAction: string | null;
  cdpRightsNotice: boolean;
  passportCertification: boolean;
  facts: NoticeFact[];
  warnings: string[];
}

// ── Patterns ──────────────────────────────────────────────────

function extractNoticeNumber(text: string): string | null {
  const patterns = [
    /(?:notice|letter|reference)\s*(?:number|no\.?)?\s*:?\s*(CP\s*523[-\s]*\d{4}[-\s]*\d{3,6}[-\s]*[A-Z]?)/i,
    /\b(CP523[-\s]*\d{4}[-\s]*\d{3,6}[-\s]*[A-Z]?)\b/i,
    /\b(CP\s*523[-\s]*\d{4}[-\s]*\d{3,6}[-\s]*[A-Z]?)\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].replace(/\s+/g, "-").trim();
  }
  const simple = text.match(/\b(CP523)\b/i);
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
  return /collection\s+due\s+process|CDP|hearing\s+rights|notice\s+of\s+right\s+to\s+hearing|appeal\s+rights/i.test(text);
}

function checkPassportCertification(text: string): boolean {
  return /passport|seriously\s+delinquent|FAST\s+Act/i.test(text);
}

function extractDefaultReason(text: string): string | null {
  // Look for explicit default reason statements
  if (/missed\s+payment|failed\s+to\s+make\s+(?:a\s+)?payment|payment\s+was\s+not\s+received/i.test(text)) {
    return "Missed payment";
  }
  if (/new\s+tax\s+liability|owed\s+additional\s+tax|new\s+balance\s+owed/i.test(text)) {
    return "New tax liability not paid in full";
  }
  if (/failed\s+to\s+file|did\s+not\s+file|return\s+not\s+filed/i.test(text)) {
    return "Failed to file a required tax return";
  }
  if (/default/i.test(text)) {
    return "Default on installment agreement (reason not specified)";
  }
  return null;
}

function extractInstallmentAgreementNumber(text: string): string | null {
  const patterns = [
    /installment\s+agreement\s*(?:number|no\.?)\s*:?\s*([A-Z0-9-]{4,20})/i,
    /\bIA[-\s]*([A-Z0-9]{4,20})\b/i,
    /agreement\s*(?:number|no\.?)\s*:?\s*([A-Z0-9-]{4,20})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractTaxYearsCovered(text: string): string[] {
  const years: string[] = [];
  // Match "tax year(s) 2022, 2023" or "2022-2024"
  const rangeMatch = text.match(/tax\s*years?\s*:?\s*(20\d{2})\s*[-–]\s*(20\d{2})/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    for (let y = start; y <= end; y++) years.push(String(y));
    return years;
  }
  // Match individual years after "tax year" label
  const yearMatches = text.matchAll(/tax\s*years?\s*:?\s*(20\d{2}(?:\s*,\s*20\d{2})*)/gi);
  for (const m of yearMatches) {
    const yr = m[1].match(/20\d{2}/g);
    if (yr) years.push(...yr);
  }
  // Deduplicate
  return [...new Set(years)];
}

// ── Extraction ────────────────────────────────────────────────

export function extractCP523(text: string): CP523Extraction {
  const noticeNumber = extractNoticeNumber(text);
  const isCP523 = noticeNumber?.includes("523") || /\bCP\s*523\b/i.test(text);
  const classification = classifyNoticeType(text);
  const classificationConfidence = isCP523
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
  const terminationDate = extractDate(text, [
    "termination date", "will be terminated on", "terminated on", "will terminate", "will be terminated",
    "agreement will end", "ends on",
  ]);

  const installmentAgreementNumber = extractInstallmentAgreementNumber(text);
  const defaultReason = extractDefaultReason(text);
  const taxYearsCovered = extractTaxYearsCovered(text);

  const balanceDue = extractAmount(text, ["balance due", "amount you owe", "unpaid balance", "balance"]);
  const penaltyAmount = extractAmount(text, ["penalty", "penalties"]);
  const interestAmount = extractAmount(text, ["interest", "interest charged"]);
  const totalDue = extractAmount(text, ["total due", "total amount", "total owed", "amount due"]);

  const levyType = extractLevyType(text);
  const responseAddress = extractResponseAddress(text);
  const contactPhone = extractPhone(text);
  const cdpRightsNotice = checkCDPRights(text);
  const passportCertification = checkPassportCertification(text);

  const requestedAction = (() => {
    if (cdpRightsNotice) return "Request a Collection Due Process hearing, reinstate the installment agreement, or pay the balance";
    if (/pay.*balance|payment/i.test(text)) return "Pay the balance or contact the IRS to reinstate the agreement";
    return "Contact the IRS immediately to discuss reinstatement options";
  })();

  // ── Build facts ──
  const facts: NoticeFact[] = [];
  if (noticeNumber) facts.push(createFact("Notice Number", noticeNumber, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (noticeDate) facts.push(createFact("Notice Date", noticeDate, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (taxYearsCovered.length > 0) facts.push(createFact("Tax Years Covered", taxYearsCovered.join(", "), "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (balanceDue) facts.push(createFact("Balance Due", balanceDue, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (penaltyAmount) facts.push(createFact("Penalty Amount", penaltyAmount, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (interestAmount) facts.push(createFact("Interest Amount", interestAmount, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (totalDue) facts.push(createFact("Total Due", totalDue, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (responseDeadline) facts.push(createFact("Response Deadline", responseDeadline, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (cdpHearingDeadline) facts.push(createFact("CDP Hearing Deadline", cdpHearingDeadline, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (terminationDate) facts.push(createFact("Termination Date", terminationDate, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (installmentAgreementNumber) facts.push(createFact("Installment Agreement Number", installmentAgreementNumber, "extracted", "medium", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (defaultReason) facts.push(createFact("Default Reason", defaultReason, "extracted", "medium", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (levyType) facts.push(createFact("Levy Type", levyType, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (responseAddress) facts.push(createFact("Response Address", responseAddress, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (contactPhone) facts.push(createFact("Contact Phone", contactPhone, "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (cdpRightsNotice) facts.push(createFact("CDP Rights Notice", "true", "extracted", "high", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));
  if (passportCertification) facts.push(createFact("Passport Certification", "true", "extracted", "medium", { extractionMethod: "pattern", sourceExcerpt: text.substring(0, 200) }));

  // ── Warnings ──
  const warnings: string[] = [];
  if (!isCP523) warnings.push("Document may not be a CP523 notice — verify before proceeding.");
  if (!noticeNumber) warnings.push("Notice number not found — check the document manually.");
  if (!responseDeadline && !cdpHearingDeadline) warnings.push("No deadline found — the CP523 typically gives 30 days to respond. Verify the deadline immediately.");
  if (!balanceDue && !totalDue) warnings.push("No balance due amount found — verify the amount manually.");
  if (cdpRightsNotice && !cdpHearingDeadline) warnings.push("CDP hearing rights detected but no hearing deadline found — verify the 30-day deadline immediately.");
  if (levyType) warnings.push("Levy type detected: " + levyType + ". This is urgent — assets may be at risk.");
  if (passportCertification) warnings.push("Passport certification detected — seriously delinquent tax debt may affect passport status.");
  if (!defaultReason) warnings.push("Default reason not found — the notice should state why the installment agreement is in default.");

  return {
    isCP523,
    classificationConfidence,
    noticeNumber,
    noticeDate,
    responseDeadline,
    cdpHearingDeadline,
    terminationDate,
    installmentAgreementNumber,
    defaultReason,
    taxYearsCovered,
    balanceDue,
    penaltyAmount,
    interestAmount,
    totalDue,
    levyType,
    responseAddress,
    contactPhone,
    requestedAction,
    cdpRightsNotice,
    passportCertification,
    facts,
    warnings,
  };
}

// ── Draft Generation ─────────────────────────────────────────

export interface CP523DraftParams {
  noticeNumber: string;
  taxYearsCovered: string[];
  noticeDate: string | null;
  responseDeadline: string | null;
  cdpHearingDeadline: string | null;
  terminationDate: string | null;
  installmentAgreementNumber: string | null;
  defaultReason: string | null;
  userFacts: string;
  userObjective: string;
}

export function generateCP523Draft(params: CP523DraftParams): string {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const lines = [
    date,
    "",
    "Internal Revenue Service",
    params.noticeNumber ? "Re: " + params.noticeNumber : "Re: CP523 — Notice of Default on Installment Agreement",
    params.installmentAgreementNumber ? "Installment Agreement Number: " + params.installmentAgreementNumber : "",
    params.taxYearsCovered.length > 0 ? "Tax Year(s): " + params.taxYearsCovered.join(", ") : "",
    "",
    "Dear Sir or Madam:",
    "",
    "I am writing in response to the CP523 notice dated " + (params.noticeDate ?? "[NOTICE DATE]") +
      ", which states that the IRS intends to terminate my installment agreement" +
      (params.terminationDate ? " on " + params.terminationDate : "") +
      " and seize (levy) my assets.",
    "",
  ];

  // ── Default reason acknowledgement ──
  if (params.defaultReason) {
    lines.push(
      "The notice states the reason for default as: " + params.defaultReason + ".",
      "",
    );
  }

  // ── User facts ──
  if (params.userFacts.trim()) {
    lines.push(
      "The following facts are relevant to my response:",
      params.userFacts.trim(),
      "",
    );
  }

  // ── User objective ──
  if (params.userObjective.trim()) {
    lines.push(
      "I am requesting the following action:",
      params.userObjective.trim(),
      "",
    );
  } else {
    lines.push(
      "I respectfully request that the IRS consider reinstating my installment agreement" +
        (params.cdpHearingDeadline ? " or that I be granted a Collection Due Process hearing" : "") + ".",
      "",
    );
  }

  // ── Deadline reference ──
  if (params.responseDeadline || params.cdpHearingDeadline) {
    const deadline = params.cdpHearingDeadline ?? params.responseDeadline;
    lines.push(
      "I understand that I must respond within 30 days of the notice date" +
        (deadline ? ", by " + deadline : "") + ".",
      "",
    );
  }

  // ── CDP rights ──
  if (params.cdpHearingDeadline) {
    lines.push(
      "I am aware of my right to request a Collection Due Process (CDP) hearing under IRC §6320/6330.",
      "",
    );
  }

  // ── Closing ──
  lines.push(
    "Enclosed are copies of the following supporting documents:",
    "- The original CP523 notice",
    "- Payment records demonstrating my payment history under the installment agreement",
    "",
    "Please contact me if you need additional information to evaluate this request.",
    "",
    "Sincerely,",
    "",
    "[YOUR NAME]",
    "[YOUR ADDRESS]",
    "[YOUR PHONE]",
    "[YOUR TAXPAYER ID]",
  );

  return lines.filter((line) => line !== null).join("\n");
}
