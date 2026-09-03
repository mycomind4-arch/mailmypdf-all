/* ═══════════════════════════════════════════════════════════
   IRS NOTICE PARSER — Document intelligence module for parsing
   IRS CP-series notices (CP2000, CP14, CP504, CP523).

   This is the DOCUMENT-INTELLIGENCE ANCHOR for Wave 2.
   It establishes the pattern for structured extraction from
   government notices — deterministic, testable, no AI.

   Each notice type has:
   - A detection pattern (identifies the notice type)
   - A structured extraction schema
   - Deadline computation rules
   - Response strategy hints

   ═══════════════════════════════════════════════════════════ */

// ── Types ────────────────────────────────────────────────────

export type NoticeType = "CP2000" | "CP14" | "CP504" | "CP523" | "UNKNOWN";

export interface IRSNoticeData {
  noticeType: NoticeType;
  taxpayerName: string | null;
  taxpayerSSN: string | null;
  taxYear: string | null;
  noticeDate: string | null;
  responseDeadline: string | null;
  balanceDue: number | null;
  noticeNumber: string | null;
  // CP2000-specific
  discrepancies: IRSDiscrepancy[];
  totalAdjustment: number | null;
  // CP14-specific
  taxPeriod: string | null;
  amountOwed: number | null;
  penaltyAmount: number | null;
  interestAmount: number | null;
  // CP504-specific
  levyWarning: boolean;
  levyDeadline: string | null;
  // CP523-specific
  installmentAgreementDefault: boolean;
  defaultedAmount: number | null;
  remainingBalance: number | null;
  // Extraction metadata
  extractionConfidence: number;
  matchedPatterns: string[];
  missingFields: string[];
}

export interface IRSDiscrepancy {
  category: string;
  reportedAmount: number | null;
  irsAmount: number | null;
  difference: number | null;
  source: string;
}

// ── Notice Detection ─────────────────────────────────────────

interface NoticePattern {
  type: NoticeType;
  patterns: RegExp[];
}

const NOTICE_PATTERNS: NoticePattern[] = [
  {
    type: "CP2000",
    patterns: [
      /\bCP\s*2000\b/i,
      /\bnotice\s+(?:of\s+)?underreported\s+income\b/i,
      /\bunderreported\s+(?:income|payments)\b/i,
      /\bAUR\b.*\bnotice\b/i, // Automated Underreporter
    ],
  },
  // CP504 and CP523 checked BEFORE CP14 because they may contain "balance due"
  // but are more specific notice types
  {
    type: "CP504",
    patterns: [
      /\bCP\s*504\b/i,
      /\bfinal\s+notice\b.{0,20}\blevy\b/i,
      /\bintent\s+to\s+levy\b/i,
      /\bnotice\s+of\s+levy\b/i,
    ],
  },
  {
    type: "CP523",
    patterns: [
      /\bCP\s*523\b/i,
      /\binstallment\s+agreement\s+default\b/i,
      /\bdefault\s+on\s+(?:your\s+)?installment\b/i,
      /\bterminated\s+installment\s+agreement\b/i,
    ],
  },
  {
    type: "CP14",
    patterns: [
      /\bCP\s*14\b/i,
      /\bamount\s+you\s+owe\b/i,
      /\btax\s+due\s+and\s+payable\b/i,
    ],
  },
];

// ── Extraction Helpers ──────────────────────────────────────

function extractCurrency(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match) return null;
  const raw = match[1].replace(/[,$\s]/g, "");
  const value = parseFloat(raw);
  return isNaN(value) ? null : value;
}

function extractDate(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  if (!match) return null;
  // Normalize to ISO-ish format
  const dateStr = match[1].trim();
  // Try to parse common US date formats
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return dateStr;
}

function extractField(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

// ── Notice-Specific Extractors ──────────────────────────────

function parseCP2000(text: string): Partial<IRSNoticeData> {
  const discrepancies: IRSDiscrepancy[] = [];

  // CP2000 shows a table of income discrepancies
  // Pattern: Category | Reported | IRS | Difference
  const discrepancyPattern = /([A-Za-z\s]+?)\s+[\$]?([\d,]+\.?\d*)\s+[\$]?([\d,]+\.?\d*)\s+[\$]?([\d,]+\.?\d*)/g;
  let match: RegExpExecArray | null;
  while ((match = discrepancyPattern.exec(text)) !== null) {
    const reported = parseFloat(match[2].replace(/,/g, ""));
    const irs = parseFloat(match[3].replace(/,/g, ""));
    const diff = parseFloat(match[4].replace(/,/g, ""));
    if (!isNaN(reported) && !isNaN(irs) && !isNaN(diff)) {
      discrepancies.push({
        category: match[1].trim(),
        reportedAmount: reported,
        irsAmount: irs,
        difference: diff,
        source: "CP2000 discrepancy table",
      });
    }
  }

  const totalAdjustment = extractCurrency(text, /total\s+(?:adjustment|change|increase)\s*[:\s]+\$?([\d,]+\.?\d*)/i);

  return {
    discrepancies,
    totalAdjustment,
  };
}

function parseCP14(text: string): Partial<IRSNoticeData> {
  const amountOwed = extractCurrency(text, /amount\s+you\s+owe\s*[:\s]+\$?([\d,]+\.?\d*)/i)
    ?? extractCurrency(text, /balance\s+due\s*[:\s]+\$?([\d,]+\.?\d*)/i);
  const penaltyAmount = extractCurrency(text, /penalty\s*[:\s]+\$?([\d,]+\.?\d*)/i);
  const interestAmount = extractCurrency(text, /interest\s*[:\s]+\$?([\d,]+\.?\d*)/i);
  const taxPeriod = extractField(text, /tax\s+period\s*(?:ending)?\s*[:\s]+([\w\s,]+)/i);

  return {
    amountOwed,
    penaltyAmount,
    interestAmount,
    taxPeriod,
    balanceDue: amountOwed,
  };
}

function parseCP504(text: string): Partial<IRSNoticeData> {
  const levyDeadline = extractDate(text, /(?:within|by)\s+(\d+\s+days)/i)
    ?? extractDate(text, /respond\s+by\s+([A-Za-z]+\s+\d+,?\s*\d{4})/i);
  const balanceDue = extractCurrency(text, /balance\s+due\s*[:\s]+\$?([\d,]+\.?\d*)/i)
    ?? extractCurrency(text, /amount\s+(?:you\s+owe|owed)\s*[:\s]+\$?([\d,]+\.?\d*)/i);

  return {
    levyWarning: true,
    levyDeadline,
    balanceDue,
  };
}

function parseCP523(text: string): Partial<IRSNoticeData> {
  const defaultedAmount = extractCurrency(text, /defaulted\s+amount\s*[:\s]+\$?([\d,]+\.?\d*)/i)
    ?? extractCurrency(text, /amount\s+in\s+default\s*[:\s]+\$?([\d,]+\.?\d*)/i);
  const remainingBalance = extractCurrency(text, /remaining\s+balance\s*[:\s]+\$?([\d,]+\.?\d*)/i)
    ?? extractCurrency(text, /unpaid\s+balance\s*[:\s]+\$?([\d,]+\.?\d*)/i);

  return {
    installmentAgreementDefault: true,
    defaultedAmount,
    remainingBalance,
    balanceDue: remainingBalance ?? defaultedAmount,
  };
}

// ── Main Parser ─────────────────────────────────────────────

export function detectNoticeType(text: string): NoticeType {
  for (const { type, patterns } of NOTICE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return type;
      }
    }
  }
  return "UNKNOWN";
}

export function parseIRSNotice(text: string): IRSNoticeData {
  const noticeType = detectNoticeType(text);
  const matchedPatterns: string[] = [];

  // Track which patterns matched
  if (noticeType !== "UNKNOWN") {
    const noticeDef = NOTICE_PATTERNS.find((n) => n.type === noticeType);
    if (noticeDef) {
      for (const pattern of noticeDef.patterns) {
        if (pattern.test(text)) {
          matchedPatterns.push(pattern.source);
        }
      }
    }
  }

  // Common extraction — all notices share these
  const taxpayerName = extractField(text, /(?:dear|taxpayer\s+name)\s*[:\s]+([A-Za-z\s,.]+?)[,\n]/i);
  const taxpayerSSN = extractField(text, /(?:SSN|social\s+security(?:\s+number)?)\s*[:\s]+(\d{3}-?\d{2}-?\d{4})/i)
    ?? extractField(text, /\b(\d{3}-\d{2}-\d{4})\b/);
  const taxYear = extractField(text, /tax\s+year\s*[:\s]+(\d{4})/i);
  const noticeDate = extractDate(text, /notice\s+date\s*[:\s]+([A-Za-z]+\s+\d+,?\s*\d{4})/i)
    ?? extractDate(text, /date\s+(?:of\s+notice|issued)\s*[:\s]+([A-Za-z]+\s+\d+,?\s*\d{4})/i);
  const responseDeadline = extractDate(text, /respond\s+(?:by|within|no\s+later\s+than)\s+([A-Za-z]+\s+\d+,?\s*\d{4})/i)
    ?? extractDate(text, /deadline\s*[:\s]+([A-Za-z]+\s+\d+,?\s*\d{4})/i)
    ?? extractDate(text, /(?:within|by)\s+(\d+\s+days)/i);
  const noticeNumber = extractField(text, /notice\s+(?:number|no\.?)\s*[:\s]+(CP\s*\d+)/i);

  // Notice-specific extraction
  let noticeSpecific: Partial<IRSNoticeData> = {};
  switch (noticeType) {
    case "CP2000":
      noticeSpecific = parseCP2000(text);
      break;
    case "CP14":
      noticeSpecific = parseCP14(text);
      break;
    case "CP504":
      noticeSpecific = parseCP504(text);
      break;
    case "CP523":
      noticeSpecific = parseCP523(text);
      break;
  }

  // Build the complete result
  const result: IRSNoticeData = {
    noticeType,
    taxpayerName,
    taxpayerSSN,
    taxYear,
    noticeDate,
    responseDeadline,
    balanceDue: null,
    noticeNumber: noticeNumber ?? (noticeType !== "UNKNOWN" ? noticeType : null),
    discrepancies: [],
    totalAdjustment: null,
    taxPeriod: null,
    amountOwed: null,
    penaltyAmount: null,
    interestAmount: null,
    levyWarning: false,
    levyDeadline: null,
    installmentAgreementDefault: false,
    defaultedAmount: null,
    remainingBalance: null,
    extractionConfidence: 0,
    matchedPatterns,
    missingFields: [],
  };

  Object.assign(result, noticeSpecific);

  // Compute extraction confidence
  const allFields = [
    "taxpayerName", "taxpayerSSN", "taxYear", "noticeDate",
    "responseDeadline", "balanceDue",
  ];
  const found = allFields.filter((f) => result[f as keyof IRSNoticeData] !== null && result[f as keyof IRSNoticeData] !== "");
  result.extractionConfidence = found.length / allFields.length;

  // Identify missing fields
  result.missingFields = allFields.filter((f) => result[f as keyof IRSNoticeData] === null || result[f as keyof IRSNoticeData] === "");

  return result;
}

// ── Response Strategy ───────────────────────────────────────

export interface IRSResponseStrategy {
  noticeType: NoticeType;
  responseWindow: string;
  urgency: "critical" | "high" | "standard";
  strategy: string[];
  evidenceToGather: string[];
  filingOptions: string[];
  warnings: string[];
}

export function getResponseStrategy(noticeType: NoticeType): IRSResponseStrategy {
  const strategies: Record<Exclude<NoticeType, "UNKNOWN">, IRSResponseStrategy> = {
    CP2000: {
      noticeType: "CP2000",
      responseWindow: "30 days from notice date",
      urgency: "high",
      strategy: [
        "Verify each income discrepancy against taxpayer records (W-2s, 1099s, K-1s)",
        "If the IRS is correct, agree and pay the additional tax or request a payment plan",
        "If the IRS is incorrect, provide documentation showing the correct income",
        "If partially correct, agree with correct items and dispute incorrect items",
        "Consider whether a corrected return (1040X) is needed",
      ],
      evidenceToGather: [
        "Original tax return for the disputed year",
        "All W-2s, 1099s, and K-1s for the disputed year",
        "Brokerage statements showing cost basis",
        "Records of any income not reported to IRS",
        "Prior correspondence with IRS about this tax year",
      ],
      filingOptions: [
        "Agree — sign and return with payment",
        "Disagree — attach explanation and supporting documents",
        "Partial agreement — dispute specific items, agree with others",
        "Request audit reconsideration if new information is available",
      ],
      warnings: [
        "CP2000 is NOT a bill — it is a proposal. Interest and penalties accrue if no response is received.",
        "Failing to respond within 30 days may result in an automatic assessment (CP3219A).",
        "Do not file an amended return while the CP2000 is open — respond to the notice instead.",
      ],
    },
    CP14: {
      noticeType: "CP14",
      responseWindow: "Pay immediately or set up a plan within 21 days",
      urgency: "high",
      strategy: [
        "Verify the amount owed against tax return and IRS account transcript",
        "If the balance is correct, pay in full to stop further penalties and interest",
        "If unable to pay in full, request an installment agreement (Form 9465)",
        "If the balance is incorrect, dispute with supporting documentation",
        "Consider an Offer in Compromise if paying in full creates financial hardship",
      ],
      evidenceToGather: [
        "Tax return for the period shown",
        "IRS account transcript (Form 4506-T)",
        "Payment records or cancelled checks",
        "Records of any penalties previously abated",
        "Financial statement (Form 433-F) if requesting a payment plan",
      ],
      filingOptions: [
        "Pay in full — online, by phone, or by check",
        "Installment agreement — Form 9465",
        "Offer in Compromise — Form 656",
        "Currently Not Collectible — request temporary hardship status",
        "Dispute the balance — attach explanation and evidence",
      ],
      warnings: [
        "Interest and penalties continue to accrue until the balance is paid in full.",
        "A CP14 does not trigger a lien or levy yet, but failure to respond will escalate to CP501/CP503/CP504.",
        "Setting up an installment agreement stops the failure-to-pay penalty from increasing (but not interest).",
      ],
    },
    CP504: {
      noticeType: "CP504",
      responseWindow: "30 days from notice date — CRITICAL",
      urgency: "critical",
      strategy: [
        "This is a FINAL notice before levy — immediate action required",
        "Pay the full amount immediately if possible",
        "If unable to pay, request a Collection Due Process (CDP) hearing — Form 12153",
        "File Form 12153 within 30 days to preserve right to a hearing before an independent appeals officer",
        "Consider an Offer in Compromise or installment agreement as alternatives",
        "Request a Collection Information Statement (Form 433-F) to negotiate",
      ],
      evidenceToGather: [
        "IRS account transcript showing the balance",
        "All prior IRS notices for this balance (CP14, CP501, CP503)",
        "Financial statement — Form 433-F",
        "Proof of financial hardship if claiming inability to pay",
        "Records supporting any dispute of the underlying tax",
      ],
      filingOptions: [
        "Pay in full — stop the levy action",
        "Request CDP hearing — Form 12153 (within 30 days)",
        "Installment agreement — Form 9465",
        "Offer in Compromise — Form 656",
        "Currently Not Collectible — Form 433-F",
      ],
      warnings: [
        "CP504 is the LAST notice before the IRS can levy bank accounts, wages, and other assets.",
        "The 30-day window is a hard deadline — missing it forfeits the right to a CDP hearing.",
        "After 30 days, the IRS can issue a levy without further notice.",
        "A federal tax lien may already be filed — check your credit report.",
      ],
    },
    CP523: {
      noticeType: "CP523",
      responseWindow: "30 days from notice date to reinstate",
      urgency: "high",
      strategy: [
        "Determine why the installment agreement defaulted (missed payment, new balance, etc.)",
        "If the default was due to a temporary hardship, request reinstatement",
        "Pay the missed amount to bring the agreement current",
        "If unable to reinstate, request a new installment agreement with updated terms",
        "Consider a partial pay installment agreement (PPIA) if full payment is not feasible",
        "File Form 9465 to propose new payment terms",
      ],
      evidenceToGather: [
        "Original installment agreement terms",
        "Payment history showing which payments were missed",
        "Current financial statement — Form 433-F",
        "Proof of changed circumstances (job loss, medical bills, etc.)",
        "IRS account transcript showing the default",
      ],
      filingOptions: [
        "Reinstate the agreement — pay missed amount",
        "New installment agreement — Form 9465",
        "Offer in Compromise — Form 656",
        "Currently Not Collectible — Form 433-F",
        "Request a CDP hearing if you disagree with the default — Form 12153",
      ],
      warnings: [
        "CP523 gives you 30 days to act before the agreement is permanently terminated.",
        "If the agreement terminates, the full balance becomes immediately due and the IRS can levy.",
        "Reinstatement is generally allowed once — a second default may not get the same grace.",
        "Interest continues to accrue during the default period.",
      ],
    },
  };

  if (noticeType === "UNKNOWN") {
    return {
      noticeType: "UNKNOWN",
      responseWindow: "Check the notice for the response deadline",
      urgency: "standard",
      strategy: ["Review the notice carefully for the response deadline and required action."],
      evidenceToGather: ["The original notice", "Any related tax returns", "Prior IRS correspondence"],
      filingOptions: ["Respond as instructed in the notice"],
      warnings: ["Unknown notice type — treat the stated deadline as binding."],
    };
  }

  return strategies[noticeType];
}
