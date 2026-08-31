/* ═══════════════════════════════════════════════════════════
   NOTICE EXTRACTION — deterministic text-based extraction.
   Pulls facts, deadlines, and metadata from pasted notice text.
   No LLM — this is deterministic infrastructure.
   ═══════════════════════════════════════════════════════════ */

import { createFact, type NoticeFact } from "../domain/fact";
import { createDeadline, parseDate, type Deadline } from "../domain/deadline";

export interface ExtractionResult {
  facts: NoticeFact[];
  deadlines: { deadline: Deadline }[];
  agency?: string;
  referenceNumber?: string;
  noticeDate?: string;
  amountOwed?: string;
  appealRights?: string;
  extractionConfidence: number;
  rawText: string;
}

/* ── Agency detection ── */

const AGENCY_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /internal\s+revenue\s+service/i, name: "IRS" },
  { pattern: /\bIRS\b/, name: "IRS" },
  { pattern: /department\s+of\s+the\s+treasury/i, name: "IRS" },
  { pattern: /franchise\s+tax\s+board/i, name: "California Franchise Tax Board" },
  { pattern: /superior\s+court/i, name: "Superior Court" },
  { pattern: /social\s+security\s+administration/i, name: "Social Security Administration" },
  { pattern: /board\s+of\s+(professional\s+)?licens/i, name: "State Board of Professional Licensing" },
  { pattern: /department\s+of\s+(?:motor\s+vehicles|transportation)/i, name: "DMV" },
  { pattern: /employment\s+development\s+department/i, name: "EDD" },
  { pattern: /county\s+of\s+\w+/i, name: "County Court" },
];

function detectAgency(text: string): string | undefined {
  for (const { pattern, name } of AGENCY_PATTERNS) {
    if (pattern.test(text)) return name;
  }
  // Fallback: first line might be the agency name
  const firstLine = text.split("\n")[0]?.trim();
  if (firstLine && firstLine.length > 5 && firstLine.length < 100) {
    return firstLine;
  }
  return undefined;
}

/* ── Reference number detection ── */

function detectReferenceNumber(text: string): string | undefined {
  // CP2000-2024-12345-A
  const cpMatch = text.match(/\b(CP\d{3,4}[-\w]*)\b/i);
  if (cpMatch) return cpMatch[1];

  // Case Number: CV-2026-12345
  const caseMatch = text.match(/(?:case|notice|claim|license)\s*(?:number|no\.?)\s*:?\s*([A-Z0-9][-A-Z0-9]{3,})/i);
  if (caseMatch) return caseMatch[1];

  // Notice Number: NPA-2026-98765
  const noticeMatch = text.match(/notice\s*(?:number|no\.?)\s*:?\s*([A-Z0-9][-A-Z0-9]{3,})/i);
  if (noticeMatch) return noticeMatch[1];

  // Generic ref pattern
  const refMatch = text.match(/(?:reference|control)\s*(?:number|no\.?)\s*:?\s*([A-Z0-9][-A-Z0-9]{3,})/i);
  if (refMatch) return refMatch[1];

  // Claim number like 123-45-6789-A
  const claimMatch = text.match(/claim\s*(?:number|no\.?)\s*:?\s*(\d{3}-\d{2}-\d{4}[-A-Z]?)/i);
  if (claimMatch) return claimMatch[1];

  return undefined;
}

/* ── Amount owed detection ── */

function detectAmountOwed(text: string): string | undefined {
  // "Amount due: $3,847.00"
  const dueMatch = text.match(/amount\s*(?:due|owed|owed|payable)\s*:?\s*(\$[\d,]+\.?\d*)/i);
  if (dueMatch) return dueMatch[1];

  // "You owe $5,200.00"
  const oweMatch = text.match(/you\s+owe\s+(\$[\d,]+\.?\d*)/i);
  if (oweMatch) return oweMatch[1];

  // "balance of $X"
  const balanceMatch = text.match(/(?:unpaid\s+)?balance\s+(?:of\s+)?(\$[\d,]+\.?\d*)/i);
  if (balanceMatch) return balanceMatch[1];

  // "pay $X" / "payment of $X"
  const payMatch = text.match(/(?:pay|payment\s+of)\s+(\$[\d,]+\.?\d*)/i);
  if (payMatch) return payMatch[1];

  return undefined;
}

/* ── Appeal rights detection ── */

function detectAppealRights(text: string): string | undefined {
  const patterns = [
    /right\s+to\s+appeal/i,
    /may\s+(?:file|request)\s+(?:an?\s+)?appeal/i,
    /appeal\s+(?:this\s+)?(?:decision|determination)/i,
    /if\s+you\s+disagree.*?appeal/i,
    /you\s+have\s+\d+\s+days\s+to\s+appeal/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return undefined;
}

/* ── Deadline detection ── */

function detectDeadlines(text: string): { deadline: Deadline }[] {
  const deadlines: { deadline: Deadline }[] = [];

  // "You must respond by September 15, 2026"
  const respondByMatch = text.match(/(?:must|should|need\s+to)\s+respond\s+by\s+(.{3,40}?)(?:\.|,|\n|$)/i);
  if (respondByMatch) {
    const dateStr = parseDate(respondByMatch[1]);
    if (dateStr) {
      deadlines.push({
        deadline: createDeadline({
          type: "response",
          date: dateStr,
          rawText: respondByMatch[0],
          certainty: "explicit",
          sourceExcerpt: respondByMatch[0],
        }),
      });
    }
  }

  // "respond within X days"
  const withinMatch = text.match(/(?:respond|file|reply).{0,20}within\s+(\d+)\s+days?\s+of\s+(.+?)(?:\.|,|\n|$)/i);
  if (withinMatch) {
    const days = parseInt(withinMatch[1]);
    const startText = withinMatch[2];
    const startDate = parseDate(startText) || new Date().toISOString().split("T")[0];
    const computedDate = computeDateFromDays(startDate, days);

    if (computedDate && !deadlines.some((d) => d.deadline.date === computedDate)) {
      deadlines.push({
        deadline: createDeadline({
          type: "response",
          date: computedDate,
          rawText: withinMatch[0],
          certainty: "calculated",
          calculationMethod: `${days} calendar days from ${startDate}`,
          startDate,
          daysWindow: days,
          businessDays: false,
          sourceExcerpt: withinMatch[0],
        }),
      });
    }
  }

  // "by [date]"
  const byMatch = text.match(/\bby\s+((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})/i);
  if (byMatch && !deadlines.some((d) => d.deadline.sourceExcerpt === byMatch[0])) {
    const dateStr = parseDate(byMatch[1]);
    if (dateStr && !deadlines.some((d) => d.deadline.date === dateStr)) {
      deadlines.push({
        deadline: createDeadline({
          type: "response",
          date: dateStr,
          rawText: byMatch[0],
          certainty: "explicit",
          sourceExcerpt: byMatch[0],
        }),
      });
    }
  }

  // "pay by [date]"
  const payByMatch = text.match(/pay\s+by\s+(.{3,40}?)(?:\.|,|\n|$)/i);
  if (payByMatch && !deadlines.some((d) => d.deadline.sourceExcerpt === payByMatch[0])) {
    const dateStr = parseDate(payByMatch[1]);
    if (dateStr && !deadlines.some((d) => d.deadline.date === dateStr)) {
      deadlines.push({
        deadline: createDeadline({
          type: "payment",
          date: dateStr,
          rawText: payByMatch[0],
          certainty: "explicit",
          sourceExcerpt: payByMatch[0],
        }),
      });
    }
  }

  return deadlines;
}

function computeDateFromDays(startDate: string, days: number): string | undefined {
  const start = new Date(startDate + "T00:00:00");
  if (isNaN(start.getTime())) return undefined;
  const result = new Date(start);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
}

/* ── Notice date detection ── */

function detectNoticeDate(text: string): string | undefined {
  // "Date: July 15, 2026"
  const dateMatch = text.match(/\bdate\s*:?\s*(.{5,30}?)(?:\n|$)/i);
  if (dateMatch) {
    const parsed = parseDate(dateMatch[1]);
    if (parsed) return parsed;
  }

  // "Dated: [date]"
  const datedMatch = text.match(/\bdated\s*:?\s*(.{5,30}?)(?:\n|$)/i);
  if (datedMatch) {
    const parsed = parseDate(datedMatch[1]);
    if (parsed) return parsed;
  }

  // Look for any date in the first 5 lines
  const lines = text.split("\n").slice(0, 5).join("\n");
  const anyDate = parseDate(lines);
  if (anyDate) return anyDate;

  return undefined;
}

/* ── Fact extraction ── */

function extractFacts(text: string): NoticeFact[] {
  const facts: NoticeFact[] = [];

  // Agency
  const agency = detectAgency(text);
  if (agency) {
    facts.push(createFact("Issuing Agency", agency, "extracted", "high", {
      sourceExcerpt: agency,
      extractionMethod: "pattern_match",
    }));
  }

  // Reference number
  const refNum = detectReferenceNumber(text);
  if (refNum) {
    facts.push(createFact("Reference Number", refNum, "extracted", "high", {
      sourceExcerpt: refNum,
      extractionMethod: "pattern_match",
    }));
  }

  // Notice date
  const noticeDate = detectNoticeDate(text);
  if (noticeDate) {
    facts.push(createFact("Notice Date", noticeDate, "extracted", "high", {
      sourceExcerpt: noticeDate,
      extractionMethod: "date_parse",
    }));
  }

  // Amount owed
  const amount = detectAmountOwed(text);
  if (amount) {
    facts.push(createFact("Amount Owed", amount, "extracted", "high", {
      sourceExcerpt: amount,
      extractionMethod: "pattern_match",
    }));
  }

  // Deadline date
  const deadlineMatches = text.match(/(?:respond|reply|file).{0,20}by\s+(.{3,40}?)(?:\.|,|\n|$)/gi);
  if (deadlineMatches) {
    for (const match of deadlineMatches) {
      const dateStr = parseDate(match);
      if (dateStr && !facts.some((f) => f.label === "Response Deadline" && f.value === dateStr)) {
        facts.push(createFact("Response Deadline", dateStr, "extracted", "high", {
          sourceExcerpt: match.substring(0, 100),
          extractionMethod: "date_parse",
        }));
      }
    }
  }

  // Tax year
  const taxYearMatch = text.match(/\b(20\d{2})\s+tax\s+(?:year|return)\b/i);
  if (taxYearMatch) {
    facts.push(createFact("Tax Year", taxYearMatch[1], "extracted", "medium", {
      sourceExcerpt: taxYearMatch[0],
      extractionMethod: "pattern_match",
    }));
  }

  // License number
  const licenseMatch = text.match(/license\s*(?:number|no\.?)\s*:?\s*([A-Z0-9][-A-Z0-9]{3,})/i);
  if (licenseMatch) {
    facts.push(createFact("License Number", licenseMatch[1], "extracted", "high", {
      sourceExcerpt: licenseMatch[0],
      extractionMethod: "pattern_match",
    }));
  }

  // Case number
  const caseNumMatch = text.match(/case\s*(?:number|no\.?)\s*:?\s*([A-Z]{0,3}[-]?\d{2,4}[-]\d{2,6})/i);
  if (caseNumMatch && !facts.some((f) => f.label === "Reference Number")) {
    facts.push(createFact("Case Number", caseNumMatch[1], "extracted", "high", {
      sourceExcerpt: caseNumMatch[0],
      extractionMethod: "pattern_match",
    }));
  }

  return facts;
}

/* ── Main extraction function ── */

export function extractFromText(text: string): ExtractionResult {
  const facts = extractFacts(text);
  const deadlines = detectDeadlines(text);
  const agency = detectAgency(text);
  const referenceNumber = detectReferenceNumber(text);
  const noticeDate = detectNoticeDate(text);
  const amountOwed = detectAmountOwed(text);
  const appealRights = detectAppealRights(text);

  // Confidence based on how many key items were found
  let confidence = 0.2;
  if (agency) confidence += 0.15;
  if (referenceNumber) confidence += 0.15;
  if (noticeDate) confidence += 0.1;
  if (amountOwed) confidence += 0.1;
  if (deadlines.length > 0) confidence += 0.15;
  if (facts.length >= 4) confidence += 0.15;
  confidence = Math.min(0.95, confidence);

  return {
    facts,
    deadlines,
    agency,
    referenceNumber,
    noticeDate,
    amountOwed,
    appealRights,
    extractionConfidence: confidence,
    rawText: text,
  };
}
