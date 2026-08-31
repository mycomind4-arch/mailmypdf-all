/* ═══════════════════════════════════════════════════════════
   CP2000 DOMAIN LOGIC — specialized extraction and analysis
   for the IRS CP2000 Underreported Income notice.
   
   This module adds CP2000-specific field extraction on top of the
   general notice-extraction system. It does not duplicate the
   general extractor — it enriches it with CP2000-specific fields.
   
   All extraction is deterministic (pattern-based, no LLM).
   All language is factual — no tax conclusions.
   ═══════════════════════════════════════════════════════════ */

import { createFact, type NoticeFact } from "./fact";
import { classifyNoticeType, type NoticeType } from "./notice-type";

// ── Types ─────────────────────────────────────────────────────

export interface CP2000Extraction {
  isCP2000: boolean;
  classificationConfidence: number;
  noticeNumber: string | null;
  noticeDate: string | null;
  responseDeadline: string | null;
  taxYear: string | null;
  proposedTaxIncrease: string | null;
  proposedPenalty: string | null;
  reportedIncome: string | null;
  irsReportedIncome: string | null;
  incomeSource: string | null;
  payerName: string | null;
  responseAddress: string | null;
  contactPhone: string | null;
  requestedAction: string | null;
  facts: NoticeFact[];
  warnings: string[];
}

// ── Patterns ──────────────────────────────────────────────────

function extractNoticeNumber(text: string): string | null {
  // CP2000 notice numbers typically look like CP2000-YYYY-NNNNN-X
  const match = text.match(/(?:notice|letter|reference)\s*(?:number|no\.?)?\s*:?\s*(CP\s*2000[-\s]*\d{4}[-\s]*\d{3,5}[-\s]*[A-Z]?)/i);
  if (match) return match[1].replace(/\s+/g, "-").trim();
  // Fallback: just CP2000 + digits
  const match2 = text.match(/\b(CP\s*2000[-\s]*\d{2,4}[-\s]*\d{2,6}[-\s]*[A-Z]?)\b/i);
  if (match2) return match2[1].replace(/\s+/g, "-").trim();
  // Even simpler: CP2000 with any trailing identifier
  const match3 = text.match(/\b(CP2000)\b/i);
  if (match3) return match3[1];
  return null;
}

function extractNoticeDate(text: string): string | null {
  // Look for "Date of notice" or date near the top
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
  // CP2000 typically says "respond by" or "if you don't respond by"
  const patterns = [
    /(?:respond|reply)\s*(?:by|within|no later than)\s*(.{8,30}?)(?:\n|\.|,|$)/i,
    /(?:if\s+you\s+(?:do\s+not|don't)\s+respond\s+by)\s*(.{8,30}?)(?:\n|\.|,|$)/i,
    /response\s*deadline\s*:?\s*(.{8,20}?)(?:\n|$)/i,
    /(?:must\s+respond\s+(?:by|no later than))\s*(.{8,30}?)(?:\n|\.|,|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractTaxYear(text: string): string | null {
  // CP2000 references a specific tax year
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
  // Broader: any 4-digit year 2000-2099 that appears near "tax"
  const taxYearMatch = text.match(/\btax.*?(\d{4})\b/i);
  if (taxYearMatch) {
    const year = parseInt(taxYearMatch[1]);
    if (year >= 2000 && year <= 2099) return taxYearMatch[1];
  }
  return null;
}

function extractProposedTaxIncrease(text: string): string | null {
  const patterns = [
    /proposed\s*(?:increase|change|adjustment)\s*(?:in|to|of)?\s*(?:tax|taxes|tax liability|your tax)\s*:?\s*\$?\s*([\d,]+\.?\d*)/i,
    /(?:increase|change|adjustment)\s*(?:in|to|of)\s*(?:your\s*)?tax\s*:?\s*\$?\s*([\d,]+\.?\d*)/i,
    /additional\s*tax\s*(?:owed|due|of)\s*:?\s*\$?\s*([\d,]+\.?\d*)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return `$${match[1]}`;
  }
  return null;
}

function extractProposedPenalty(text: string): string | null {
  const patterns = [
    /penalty\s*(?:amount|of|due)?\s*:?\s*\$?\s*([\d,]+\.?\d*)/i,
    /estimated\s*penalty\s*:?\s*\$?\s*([\d,]+\.?\d*)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return `$${match[1]}`;
  }
  return null;
}

function extractIncomeAmounts(text: string): { reported?: string; irsReported?: string } {
  const result: { reported?: string; irsReported?: string } = {};
  
  // "You reported $X" or "You reported income of: $X" or "income you reported: $X"
  const reportedPatterns = [
    /you\s+reported\s+income\s*(?:of)?\s*:?\s*\$?\s*([\d,]+\.?\d*)/i,
    /income\s+(?:you\s+)?reported\s*:?\s*\$?\s*([\d,]+\.?\d*)/i,
    /you\s+reported.{0,20}?\$?\s*([\d,]+\.?\d*)/i,
  ];
  for (const pattern of reportedPatterns) {
    const match = text.match(pattern);
    if (match) { result.reported = `$${match[1]}`; break; }
  }
  
  // "We received $X" or "Income reported to us on Form W-2: $X"
  // Require $ sign to avoid matching form numbers (W-2, 1099, etc.)
  const irsPatterns = [
    /income\s+reported\s+to\s+us.{0,30}?\$\s*([\d,]+\.?\d*)/i,
    /we\s+received.{0,20}?\$\s*([\d,]+\.?\d*)/i,
    /information\s+returns?\s+(?:show|indicate|reported).{0,20}?\$\s*([\d,]+\.?\d*)/i,
    /shown\s+on.{0,20}?\$\s*([\d,]+\.?\d*)/i,
    /reported\s+to\s+us.{0,30}?\$\s*([\d,]+\.?\d*)/i,
  ];
  for (const pattern of irsPatterns) {
    const match = text.match(pattern);
    if (match) { result.irsReported = `$${match[1]}`; break; }
  }
  
  return result;
}

function extractIncomeSource(text: string): { source?: string; payer?: string } {
  const result: { source?: string; payer?: string } = {};
  
  // Income source type (W-2, 1099, etc.)
  const sourceMatch = text.match(/\b(Form\s+(?:W-2|1099-[A-Z]{1,3}|1099|W-2G|1099-MISC|1099-NEC|1099-INT|1099-DIV|1099-B|1099-R|K-1))\b/i);
  if (sourceMatch) result.source = sourceMatch[1];
  
  // Payer name
  const payerMatch = text.match(/(?:payer|employer|source)\s*:?\s*(.+?)(?:\n|$)/i);
  if (payerMatch) result.payer = payerMatch[1].trim().substring(0, 100);
  
  return result;
}

function extractResponseAddress(text: string): string | null {
  // Look for a mailing address block, typically after "send your response to"
  const addressMatch = text.match(/(?:send\s+(?:your\s+)?(?:response|reply)\s+to|mail\s+to|respond\s+to)\s*:?\s*(.+?)(?:\n\n|\n\n\n|$)/is);
  if (addressMatch) {
    const addr = addressMatch[1].trim();
    if (addr.length > 10 && addr.length < 300) return addr;
  }
  // Look for P.O. Box pattern
  const poBoxMatch = text.match(/(P\.?O\.?\s*Box\s+\d+[^\n]{0,100})/i);
  if (poBoxMatch) return poBoxMatch[1].trim();
  return null;
}

function extractContactPhone(text: string): string | null {
  const phoneMatch = text.match(/(?:phone|telephone|call)\s*:?\s*(\d{3}[-.]?\d{3}[-.]?\d{4})/i);
  if (phoneMatch) return phoneMatch[1];
  // Broader: any phone number pattern
  const phoneMatch2 = text.match(/\b(\d{3}[-.]\d{3}[-.]\d{4})\b/);
  if (phoneMatch2) return phoneMatch2[1];
  return null;
}

function extractRequestedAction(text: string): string | null {
  // What the notice is asking the taxpayer to do
  if (/agree.*?(?:sign|check|box)/i.test(text)) return "Review the proposed changes and respond if you agree or disagree";
  if (/disagree.*?(?:send|mail|documentation)/i.test(text)) return "Send documentation if you disagree with the proposed changes";
  if (/please\s+(?:respond|reply|contact)/i.test(text)) return "Respond to the notice";
  return null;
}

// ── Main CP2000 Extraction ────────────────────────────────────

export function extractCP2000(text: string): CP2000Extraction {
  const classification = classifyNoticeType(text);
  const isCP2000 = classification.type === "irs_cp2000";
  const warnings: string[] = [];
  
  const noticeNumber = extractNoticeNumber(text);
  const noticeDate = extractNoticeDate(text);
  const responseDeadline = extractResponseDeadline(text);
  const taxYear = extractTaxYear(text);
  const proposedTaxIncrease = extractProposedTaxIncrease(text);
  const proposedPenalty = extractProposedPenalty(text);
  const incomeAmounts = extractIncomeAmounts(text);
  const incomeSource = extractIncomeSource(text);
  const responseAddress = extractResponseAddress(text);
  const contactPhone = extractContactPhone(text);
  const requestedAction = extractRequestedAction(text);
  
  // Build structured facts with provenance
  const facts: NoticeFact[] = [];
  
  if (noticeNumber) {
    facts.push(createFact("Notice Number", noticeNumber, "extracted", "high", {
      sourceExcerpt: noticeNumber,
      extractionMethod: "pattern_match",
    }));
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
    warnings.push("No response deadline was found in the notice text. The deadline is typically stated on the CP2000. If you cannot find it, contact the IRS or a tax professional.");
  }
  
  if (taxYear) {
    facts.push(createFact("Tax Year", taxYear, "extracted", "high", {
      sourceExcerpt: taxYear,
      extractionMethod: "pattern_match",
    }));
  } else {
    warnings.push("No tax year was identified. The CP2000 should reference a specific tax year. Verify the tax year on the notice.");
  }
  
  if (proposedTaxIncrease) {
    facts.push(createFact("Proposed Tax Increase", proposedTaxIncrease, "extracted", "high", {
      sourceExcerpt: proposedTaxIncrease,
      extractionMethod: "pattern_match",
    }));
  }
  
  if (proposedPenalty) {
    facts.push(createFact("Proposed Penalty", proposedPenalty, "extracted", "medium", {
      sourceExcerpt: proposedPenalty,
      extractionMethod: "pattern_match",
    }));
  }
  
  if (incomeAmounts.reported) {
    facts.push(createFact("Income You Reported", incomeAmounts.reported, "extracted", "medium", {
      sourceExcerpt: incomeAmounts.reported,
      extractionMethod: "pattern_match",
    }));
  }
  
  if (incomeAmounts.irsReported) {
    facts.push(createFact("Income Reported to IRS", incomeAmounts.irsReported, "extracted", "medium", {
      sourceExcerpt: incomeAmounts.irsReported,
      extractionMethod: "pattern_match",
    }));
  }
  
  if (incomeSource.source) {
    facts.push(createFact("Income Source Type", incomeSource.source, "extracted", "high", {
      sourceExcerpt: incomeSource.source,
      extractionMethod: "pattern_match",
    }));
  }
  
  if (incomeSource.payer) {
    facts.push(createFact("Payer Name", incomeSource.payer, "extracted", "medium", {
      sourceExcerpt: incomeSource.payer,
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
  
  // Classification warning if not CP2000
  if (!isCP2000) {
    warnings.push(`Document was classified as "${classification.type}" (confidence ${(classification.confidence * 100).toFixed(0)}%). This may not be a CP2000 notice. Verify before proceeding.`);
  }
  
  // Confidence warning if low
  if (classification.confidence < 0.5) {
    warnings.push("Classification confidence is low. The document may be ambiguous or incomplete.");
  }
  
  return {
    isCP2000,
    classificationConfidence: classification.confidence,
    noticeNumber,
    noticeDate,
    responseDeadline,
    taxYear,
    proposedTaxIncrease,
    proposedPenalty,
    reportedIncome: incomeAmounts.reported ?? null,
    irsReportedIncome: incomeAmounts.irsReported ?? null,
    incomeSource: incomeSource.source ?? null,
    payerName: incomeSource.payer ?? null,
    responseAddress,
    contactPhone,
    requestedAction,
    facts,
    warnings,
  };
}

// ── CP2000 Response Draft ──────────────────────────────────────

export function generateCP2000Draft(params: {
  noticeNumber: string;
  taxYear: string | null;
  noticeDate: string | null;
  responseDeadline: string | null;
  userFacts: string;
  userObjective: string;
}): string {
  const lines = [
    `Re: CP2000 Notice ${params.noticeNumber || "[Notice Number]"}`,
    params.taxYear ? `Tax Year: ${params.taxYear}` : "Tax year: [Verify on notice]",
    params.noticeDate ? `Notice Date: ${params.noticeDate}` : "",
    params.responseDeadline
      ? `Response Deadline: ${params.responseDeadline}`
      : "Response deadline: [Verify deadline on your notice]",
    "",
    "Dear Sir or Madam,",
    "",
    `I am writing in response to the CP2000 notice referenced above.${params.taxYear ? ` This response concerns the proposed changes for tax year ${params.taxYear}.` : ""}`,
    "",
    "Requested correction:",
    params.userObjective || "[State what you want the IRS to do]",
    "",
    "Mismatch explanation:",
    params.userFacts || "[Explain the income discrepancy and your supporting records here.]",
    "",
    "Supporting records list:",
    "  [LIST ENCLOSED DOCUMENTS — W-2, 1099, return transcript, etc.]",
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
