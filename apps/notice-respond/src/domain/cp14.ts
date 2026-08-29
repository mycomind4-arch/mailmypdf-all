/* ═══════════════════════════════════════════════════════════
   CP14 DOMAIN LOGIC — specialized extraction and analysis
   for the IRS CP14 Balance Due notice.
   
   A CP14 tells the taxpayer they have an unpaid balance on their
   account. Unlike the CP2000 (which proposes changes based on a
   mismatch), the CP14 asserts that a balance is already owed and
   requests payment or a response explaining why the balance is
   incorrect.
   
   This module adds CP14-specific field extraction on top of the
   general notice-extraction system. It does not duplicate the
   general extractor — it enriches it with CP14-specific fields.
   
   All extraction is deterministic (pattern-based, no LLM).
   All language is factual — no tax conclusions.
   ═══════════════════════════════════════════════════════════ */

import { createFact, type NoticeFact } from "./fact";
import { classifyNoticeType, type NoticeType } from "./notice-type";

// ── Types ─────────────────────────────────────────────────────

export interface CP14Extraction {
  isCP14: boolean;
  classificationConfidence: number;
  noticeNumber: string | null;
  noticeDate: string | null;
  responseDeadline: string | null;
  taxYear: string | null;
  balanceDue: string | null;
  penaltyAmount: string | null;
  interestAmount: string | null;
  totalDue: string | null;
  paymentDeadline: string | null;
  responseAddress: string | null;
  contactPhone: string | null;
  requestedAction: string | null;
  installmentOption: boolean;
  facts: NoticeFact[];
  warnings: string[];
}

// ── Patterns ──────────────────────────────────────────────────

function extractNoticeNumber(text: string): string | null {
  // CP14 notice numbers typically look like CP14-YYYY-NNNNN-X or just CP14
  // Try labeled patterns first: "Notice Number: CP14-2024-56789-B"
  const patterns = [
    /(?:notice|letter|reference)\s*(?:number|no\.?)?\s*:?\s*(CP\s*14[-\s]*\d{4}[-\s]*\d{3,6}[-\s]*[A-Z]?)/i,
    /(?:notice|letter|reference)\s*(?:number|no\.?)?\s*:?\s*(CP14[-\s]*\d{4}[-\s]*\d{3,6}[-\s]*[A-Z]?)/i,
    /\b(CP14[-\s]*\d{4}[-\s]*\d{3,6}[-\s]*[A-Z]?)\b/i,
    /\b(CP\s*14[-\s]*\d{4}[-\s]*\d{3,6}[-\s]*[A-Z]?)\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].replace(/\s+/g, "-").trim();
  }
  // Simplest: just CP14 with no suffix
  const simple = text.match(/\b(CP14)\b/i);
  if (simple) return simple[1];
  return null;
}

function extractNoticeDate(text: string): string | null {
  const patterns = [
    /date\s*(?:of\s*notice|of\s*this\s*notice)\s*:?\s*(.{8,20}?)(?:\n|$)/i,
    /notice\s*date\s*:?\s*(.{8,20}?)(?:\n|$)/i,
    /dated?\s*:?\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
    /(\w+\s+\d{1,2},?\s+\d{4})\s*(?:\n|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractResponseDeadline(text: string): string | null {
  // CP14 typically says "pay by" or "if you don't pay by" or "respond by"
  // Use \n or end-of-string as terminator, NOT comma or period, so dates like
  // "April 20, 2024" are captured in full.
  const patterns = [
    /(?:respond|reply)\s*(?:by|within|no later than)\s*(.{8,40}?)(?:\n|$)/i,
    /(?:if\s+you\s+(?:do\s+not|don't)\s+(?:pay|respond)\s+by)\s*(.{8,40}?)(?:\n|$)/i,
    /(?:please\s+)?pay\s*(?:by|before|no later than)\s*(.{8,40}?)(?:\n|\.|$)/i,
    /(?:pay|payment)\s*(?:by|within|no later than|due\s*by)\s*(.{8,40}?)(?:\n|$)/i,
    /response\s*deadline\s*:?\s*(.{8,30}?)(?:\n|$)/i,
    /(?:must\s+(?:pay|respond)\s+(?:by|no later than))\s*(.{8,40}?)(?:\n|$)/i,
    /due\s*date\s*:?\s*(.{8,30}?)(?:\n|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractTaxYear(text: string): string | null {
  const patterns = [
    /\btax\s*year\s*(\d{4})\b/i,
    /\bfor\s*(?:tax\s*year|the\s*year)\s*(\d{4})\b/i,
    /\b(\d{4})\s*(?:tax\s*year|Form\s*1040|return)\b/i,
    /\bForm\s*1040.*?(\d{4})\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  const taxYearMatch = text.match(/\btax.*?(\d{4})\b/i);
  if (taxYearMatch) {
    const year = parseInt(taxYearMatch[1]);
    if (year >= 2000 && year <= 2099) return taxYearMatch[1];
  }
  return null;
}

function extractBalanceDue(text: string): string | null {
  // CP14 shows the unpaid balance (tax only, before penalty/interest)
  const patterns = [
    /(?:unpaid\s*balance|balance\s*due|amount\s*you\s*owe|tax\s*owed|balance\s*on\s*your\s*account)\s*:?\s*\$\s*([\d,]+\.?\d*)/i,
    /(?:balance|amount\s*due)\s*:?\s*\$\s*([\d,]+\.?\d*)/i,
    /you\s*owe\s*:?\s*\$\s*([\d,]+\.?\d*)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return `$${match[1]}`;
  }
  return null;
}

function extractPenaltyAmount(text: string): string | null {
  const patterns = [
    /penalty\s*(?:amount|charged|assessed)?\s*:?\s*\$\s*([\d,]+\.?\d*)/i,
    /estimated\s*penalty\s*:?\s*\$\s*([\d,]+\.?\d*)/i,
    /penalty\s*(?:of|is)\s*\$\s*([\d,]+\.?\d*)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return `$${match[1]}`;
  }
  return null;
}

function extractInterestAmount(text: string): string | null {
  const patterns = [
    /interest\s*(?:amount|charged|assessed)?\s*:?\s*\$\s*([\d,]+\.?\d*)/i,
    /estimated\s*interest\s*:?\s*\$\s*([\d,]+\.?\d*)/i,
    /interest\s*(?:of|is)\s*\$\s*([\d,]+\.?\d*)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return `$${match[1]}`;
  }
  return null;
}

function extractTotalDue(text: string): string | null {
  const patterns = [
    /total\s*(?:amount\s*due|balance|owed|you\s*owe)\s*:?\s*\$\s*([\d,]+\.?\d*)/i,
    /total\s*due\s*:?\s*\$\s*([\d,]+\.?\d*)/i,
    /please\s*pay\s*:?\s*\$\s*([\d,]+\.?\d*)/i,
    /amount\s*to\s*pay\s*:?\s*\$\s*([\d,]+\.?\d*)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return `$${match[1]}`;
  }
  return null;
}

function extractPaymentDeadline(text: string): string | null {
  // CP14 may have a separate payment deadline from response deadline
  const patterns = [
    /payment\s*(?:is\s*due|due)\s*(?:by|on)\s*(.{8,30}?)(?:\n|\.|,|$)/i,
    /pay\s*(?:by|before)\s*(.{8,30}?)(?:\n|\.|,|$)/i,
    /if\s+(?:not\s+)?paid\s+by\s*(.{8,30}?)(?:\n|\.|,|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractResponseAddress(text: string): string | null {
  const addressMatch = text.match(/(?:send\s+(?:your\s+)?(?:response|reply|payment)\s+to|mail\s+to|remit\s+to|write\s+to)\s*:?\s*(.+?)(?:\n\n|\n\n\n|$)/is);
  if (addressMatch) {
    const addr = addressMatch[1].trim();
    if (addr.length > 10 && addr.length < 300) return addr;
  }
  const poBoxMatch = text.match(/(P\.?O\.?\s*Box\s+\d+[^\n]{0,100})/i);
  if (poBoxMatch) return poBoxMatch[1].trim();
  return null;
}

function extractContactPhone(text: string): string | null {
  const phoneMatch = text.match(/(?:phone|telephone|call\s*us(?:\s+at)?)\s*:?\s*(\d{3}[-.]?\d{3}[-.]?\d{4})/i);
  if (phoneMatch) return phoneMatch[1];
  const phoneMatch2 = text.match(/\b(\d{3}[-.]\d{3}[-.]\d{4})\b/);
  if (phoneMatch2) return phoneMatch2[1];
  return null;
}

function extractRequestedAction(text: string): string | null {
  if (/pay.*?(?:online|by phone|check|money order)/i.test(text)) return "Pay the balance or contact the IRS to resolve";
  if (/installment|payment\s*plan/i.test(text)) return "Pay the balance or request an installment agreement";
  if (/dispute|disagree|incorrect/i.test(text)) return "Pay the balance or respond explaining why it is incorrect";
  if (/please\s+(?:respond|reply|contact|pay)/i.test(text)) return "Pay the balance or respond to the notice";
  return null;
}

function hasInstallmentOption(text: string): boolean {
  return /installment|payment\s*plan|form\s*9465|offer\s*in\s*compromise/i.test(text);
}

// ── Main CP14 Extraction ────────────────────────────────────

export function extractCP14(text: string): CP14Extraction {
  const classification = classifyNoticeType(text);
  const isCP14 = classification.type === "irs_cp14";
  const warnings: string[] = [];
  
  const noticeNumber = extractNoticeNumber(text);
  const noticeDate = extractNoticeDate(text);
  const responseDeadline = extractResponseDeadline(text);
  const taxYear = extractTaxYear(text);
  const balanceDue = extractBalanceDue(text);
  const penaltyAmount = extractPenaltyAmount(text);
  const interestAmount = extractInterestAmount(text);
  const totalDue = extractTotalDue(text);
  const paymentDeadline = extractPaymentDeadline(text);
  const responseAddress = extractResponseAddress(text);
  const contactPhone = extractContactPhone(text);
  const requestedAction = extractRequestedAction(text);
  const installmentOption = hasInstallmentOption(text);
  
  // Build structured facts with provenance
  const facts: NoticeFact[] = [];
  
  if (noticeNumber) {
    facts.push(createFact("Notice Number", noticeNumber, "extracted", "high", {
      sourceExcerpt: noticeNumber,
      extractionMethod: "pattern_match",
    }));
  } else {
    warnings.push("No notice number was found. The CP14 should have a notice number (e.g., CP14-XXXX-XXXXX-X). Verify the notice number on the document.");
  }
  
  if (noticeDate) {
    facts.push(createFact("Notice Date", noticeDate, "extracted", "high", {
      sourceExcerpt: noticeDate,
      extractionMethod: "pattern_match",
    }));
  }
  
  if (responseDeadline) {
    facts.push(createFact("Response Deadline", responseDeadline, "extracted", "high", {
      sourceExcerpt: responseDeadline,
      extractionMethod: "pattern_match",
    }));
  } else {
    warnings.push("No response deadline was found in the notice text. The CP14 typically states a payment or response deadline. If you cannot find it, contact the IRS or a tax professional.");
  }
  
  if (taxYear) {
    facts.push(createFact("Tax Year", taxYear, "extracted", "high", {
      sourceExcerpt: taxYear,
      extractionMethod: "pattern_match",
    }));
  } else {
    warnings.push("No tax year was identified. The CP14 should reference a specific tax year. Verify the tax year on the notice.");
  }
  
  if (balanceDue) {
    facts.push(createFact("Balance Due", balanceDue, "extracted", "high", {
      sourceExcerpt: balanceDue,
      extractionMethod: "pattern_match",
    }));
  } else {
    warnings.push("No balance due amount was found. The CP14 should state the unpaid balance. Verify the amount on the notice.");
  }
  
  if (penaltyAmount) {
    facts.push(createFact("Penalty Amount", penaltyAmount, "extracted", "medium", {
      sourceExcerpt: penaltyAmount,
      extractionMethod: "pattern_match",
    }));
  }
  
  if (interestAmount) {
    facts.push(createFact("Interest Amount", interestAmount, "extracted", "medium", {
      sourceExcerpt: interestAmount,
      extractionMethod: "pattern_match",
    }));
  }
  
  if (totalDue) {
    facts.push(createFact("Total Amount Due", totalDue, "extracted", "high", {
      sourceExcerpt: totalDue,
      extractionMethod: "pattern_match",
    }));
  }
  
  if (paymentDeadline) {
    facts.push(createFact("Payment Deadline", paymentDeadline, "extracted", "high", {
      sourceExcerpt: paymentDeadline,
      extractionMethod: "pattern_match",
    }));
  }
  
  if (responseAddress) {
    facts.push(createFact("Response Address", responseAddress, "extracted", "high", {
      sourceExcerpt: responseAddress.substring(0, 100),
      extractionMethod: "pattern_match",
    }));
  }
  
  if (contactPhone) {
    facts.push(createFact("Contact Phone", contactPhone, "extracted", "medium", {
      sourceExcerpt: contactPhone,
      extractionMethod: "pattern_match",
    }));
  }
  
  if (requestedAction) {
    facts.push(createFact("Requested Action", requestedAction, "extracted", "medium", {
      sourceExcerpt: requestedAction,
      extractionMethod: "pattern_match",
    }));
  }
  
  if (installmentOption) {
    facts.push(createFact("Installment Agreement Option", "Available", "extracted", "medium", {
      sourceExcerpt: "installment/payment plan mentioned in notice",
      extractionMethod: "pattern_match",
    }));
  }
  
  // Classification warning if not CP14
  if (!isCP14) {
    warnings.push(`Document was classified as "${classification.type}" (confidence ${(classification.confidence * 100).toFixed(0)}%). This may not be a CP14 notice. Verify before proceeding.`);
  }
  
  // Confidence warning if low
  if (classification.confidence < 0.5) {
    warnings.push("Classification confidence is low. The document may be ambiguous or incomplete.");
  }
  
  // Consistency check: total due should be >= balance due
  if (totalDue && balanceDue) {
    const total = parseFloat(totalDue.replace(/[$,]/g, ""));
    const balance = parseFloat(balanceDue.replace(/[$,]/g, ""));
    if (!isNaN(total) && !isNaN(balance) && total < balance) {
      warnings.push(`Total due (${totalDue}) is less than balance due (${balanceDue}). Verify the amounts on the notice.`);
    }
  }
  
  return {
    isCP14,
    classificationConfidence: classification.confidence,
    noticeNumber,
    noticeDate,
    responseDeadline,
    taxYear,
    balanceDue,
    penaltyAmount,
    interestAmount,
    totalDue,
    paymentDeadline,
    responseAddress,
    contactPhone,
    requestedAction,
    installmentOption,
    facts,
    warnings,
  };
}

// ── CP14 Response Draft ──────────────────────────────────────

export function generateCP14Draft(params: {
  noticeNumber: string;
  taxYear: string | null;
  noticeDate: string | null;
  responseDeadline: string | null;
  balanceDue: string | null;
  totalDue: string | null;
  userFacts: string;
  userObjective: string;
}): string {
  const lines = [
    `CP14 reference number: ${params.noticeNumber || "[Notice Number]"}`,
    params.taxYear ? `Tax year: ${params.taxYear}` : "Tax year: [Verify on notice]",
    params.noticeDate ? `Notice date: ${params.noticeDate}` : "",
    params.responseDeadline
      ? `Response deadline: ${params.responseDeadline}`
      : "Response deadline: [Verify deadline on your notice]",
    params.balanceDue ? `Balance due: ${params.balanceDue}` : "",
    params.totalDue ? `Total amount due: ${params.totalDue}` : "",
    "",
    "Dear Sir or Madam,",
    "",
    `I am writing in response to the CP14 notice referenced above.${params.taxYear ? ` This response concerns the balance due for tax year ${params.taxYear}.` : ""}`,
    "",
    "Payment or dispute position:",
    params.userObjective || "[State whether you are paying the balance, requesting an installment agreement, or disputing the amount]",
    "",
    "Balance explanation:",
    params.userFacts || "[Explain the circumstances regarding the balance due and your supporting records here.]",
    "",
    "Supporting records list:",
    "  [LIST ENCLOSED DOCUMENTS — payment confirmations, prior correspondence, return transcript, etc.]",
    "",
    "Attachments:",
    "  [LIST ATTACHED DOCUMENTS]",
    "",
    "I respectfully request that you review this response and the enclosed documentation. If you require additional information, please contact me at your earliest convenience.",
    "",
    "Sincerely,",
    "[YOUR NAME]",
    "[YOUR ADDRESS]",
    "[YOUR PHONE]",
    "[YOUR TAXPAYER ID — last 4 digits only]",
  ];
  
  return lines.filter((l) => l !== "").join("\n");
}
