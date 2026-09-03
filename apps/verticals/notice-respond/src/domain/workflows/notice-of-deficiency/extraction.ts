/**
 * Notice of Deficiency Extraction Service
 * Multi-LLM extraction with Claude primary, Gemini/OpenAI fallback
 */

import type { TaxAdjustmentLine, NoticeOfDeficiencyExtraction } from "./types";

/**
 * Extraction schema for Notice of Deficiency
 */
export const DEFICIENCY_EXTRACTION_SCHEMA = {
  notice_date: {
    type: "string",
    format: "YYYY-MM-DD",
    description: "Date notice was issued",
    confidence_threshold: 0.95,
    critical: true,
  },
  deficiency_notice_number: {
    type: "string",
    description: "Notice number (e.g., Form 90-day letter)",
    confidence_threshold: 0.9,
    critical: true,
  },
  tax_year: {
    type: "number",
    description: "Tax year under deficiency",
    confidence_threshold: 0.98,
    critical: true,
  },
  taxpayer_name: {
    type: "string",
    description: "Name of taxpayer",
    confidence_threshold: 0.95,
    critical: false,
  },
  deficiency_amount: {
    type: "number",
    description: "Amount of tax deficiency",
    confidence_threshold: 0.95,
    critical: true,
  },
  tax_adjustment_lines: {
    type: "array",
    description: "Detailed adjustment line items",
    confidence_threshold: 0.9,
    critical: true,
  },
  statutory_notice_deadline: {
    type: "string",
    format: "YYYY-MM-DD",
    description: "Deadline to respond (90 or 150 days from notice)",
    confidence_threshold: 0.98,
    critical: true,
  },
  fraud_indicators: {
    type: "array",
    description: "Any fraud-related language",
    confidence_threshold: 0.95,
    critical: true,
  },
};

/**
 * Extract Notice of Deficiency data
 */
export async function extractDeficiencyNotice(
  noticeText: string,
  provider: "claude" | "gemini" | "openai" = "claude"
): Promise<NoticeOfDeficiencyExtraction> {
  if (!noticeText || noticeText.trim().length === 0) {
    throw new Error("Notice text is empty");
  }

  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_type: "notice-of-deficiency",
        text: noticeText,
        provider,
        schema: DEFICIENCY_EXTRACTION_SCHEMA,
      }),
    });

    if (!response.ok) {
      throw new Error(`Extraction API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Extraction failed");
    }

    return normalizeExtraction(data.extraction);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Notice of Deficiency extraction failed: ${message}`);
  }
}

/**
 * Normalize raw LLM output to typed NoticeOfDeficiencyExtraction
 */
function normalizeExtraction(raw: Record<string, unknown>): NoticeOfDeficiencyExtraction {
  // Validate required fields
  if (!raw.notice_date) {
    throw new Error("Missing notice date");
  }

  if (!raw.tax_year) {
    throw new Error("Missing tax year");
  }

  if (!raw.deficiency_amount) {
    throw new Error("Missing deficiency amount");
  }

  // Parse dates
  const noticeDate = String(raw.notice_date);
  validateNoticeDate(noticeDate);

  const taxYear = raw.tax_year as number;
  validateTaxYear(taxYear);

  // Calculate statutory deadline (90 or 150 days from notice)
  const isOutsideUs = (raw.is_outside_us_flag as boolean) || false;
  const deadlineDays = isOutsideUs ? 150 : 90;
  const noticeDateTime = new Date(noticeDate);
  const deadlineDate = new Date(noticeDateTime.getTime() + deadlineDays * 24 * 60 * 60 * 1000);
  const statutoryDeadline = deadlineDate.toISOString().split("T")[0];

  // Validate deficiency amount
  const deficiencyAmount = Number(raw.deficiency_amount);
  if (isNaN(deficiencyAmount)) {
    throw new Error("Invalid deficiency amount");
  }

  // Parse tax adjustment lines
  const adjustmentLines = validateTaxAdjustmentLines(
    raw.tax_adjustment_lines as unknown[]
  );

  // Parse contact info
  const contactInfo = raw.irs_contact_info as Record<string, unknown> | undefined;

  return {
    notice_date: noticeDate,
    notice_date_confidence: (raw.notice_date_confidence as number) || 0.95,
    deficiency_notice_number: (raw.deficiency_notice_number as string) || "90-Day Letter",
    deficiency_notice_confidence: (raw.deficiency_notice_confidence as number) || 0.9,
    tax_year: taxYear,
    tax_year_confidence: (raw.tax_year_confidence as number) || 0.98,
    taxpayer_name: (raw.taxpayer_name as string) || "",
    taxpayer_name_confidence: (raw.taxpayer_name_confidence as number) || 0.95,
    taxpayer_ssn_masked: (raw.taxpayer_ssn_masked as string | null) || null,
    ssn_confidence: (raw.ssn_confidence as number) || 0.95,
    address: (raw.address as string | null) || null,
    address_confidence: (raw.address_confidence as number) || 0.9,
    deficiency_amount: deficiencyAmount,
    deficiency_confidence: (raw.deficiency_confidence as number) || 0.95,
    interest_amount: (raw.interest_amount as number) || null,
    interest_confidence: (raw.interest_confidence as number) || 0.85,
    penalty_amount: (raw.penalty_amount as number) || null,
    penalty_confidence: (raw.penalty_confidence as number) || 0.8,
    total_amount_due: (raw.total_amount_due as number) || deficiencyAmount,
    total_amount_confidence: (raw.total_amount_confidence as number) || 0.95,
    tax_adjustment_lines: adjustmentLines,
    deficiency_calculations: (raw.deficiency_calculations as Record<string, unknown>[]) || [],
    calculation_method:
      (raw.calculation_method as string) ||
      "Adjustments to reported amounts per examination findings",
    irs_contact_info: {
      phone: (contactInfo?.phone as string | null) || null,
      mailing_address: (contactInfo?.mailing_address as string | null) || null,
      tax_court_address: (contactInfo?.tax_court_address as string | null) || null,
    },
    contact_confidence: (raw.contact_confidence as number) || 0.9,
    statutory_notice_deadline: statutoryDeadline,
    deadline_confidence: (raw.deadline_confidence as number) || 0.98,
    prior_examination_reference: (raw.prior_examination_reference as string | null) || null,
    examination_history_confidence: (raw.examination_history_confidence as number) || 0.85,
    fraud_indicators: (raw.fraud_indicators as string[]) || [],
    notice_complexity: (raw.notice_complexity as "simple" | "moderate" | "complex") || "moderate",
    is_joint_return: (raw.is_joint_return as boolean) || false,
    is_outside_us_flag: isOutsideUs,
  };
}

/**
 * Validate notice date is recent and not in future
 */
export function validateNoticeDate(dateStr: string): void {
  const noticeDate = new Date(dateStr);
  if (isNaN(noticeDate.getTime())) {
    throw new Error(`Invalid notice date format: ${dateStr}`);
  }

  const now = new Date();
  const daysOld = Math.floor((now.getTime() - noticeDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysOld < 0) {
    throw new Error(`Notice date is in the future: ${dateStr}`);
  }

  if (daysOld > 180) {
    throw new Error(
      `Notice is more than 6 months old (${daysOld} days). Verify date is correct.`
    );
  }
}

/**
 * Validate tax year
 */
export function validateTaxYear(taxYear: number): void {
  const currentYear = new Date().getFullYear();

  if (taxYear < 1900 || taxYear >= currentYear) {
    throw new Error(
      `Invalid tax year: ${taxYear}. Must be a past year (< ${currentYear}).`
    );
  }

  if (taxYear < currentYear - 10) {
    throw new Error(
      `Tax year ${taxYear} is more than 10 years old. Verify extraction is correct (may be outside statute of limitations).`
    );
  }
}

/**
 * Validate tax adjustment lines
 */
export function validateTaxAdjustmentLines(adjustments: unknown[]): TaxAdjustmentLine[] {
  if (!Array.isArray(adjustments) || adjustments.length === 0) {
    throw new Error("No tax adjustments found in notice");
  }

  const validated: TaxAdjustmentLine[] = [];

  for (let i = 0; i < adjustments.length; i++) {
    const adj = adjustments[i] as Record<string, unknown>;

    if (!adj.id) {
      throw new Error(`Adjustment ${i} missing id`);
    }

    if (!adj.form_line) {
      throw new Error(`Adjustment ${i} missing form line reference`);
    }

    const reportedAmount = Number(adj.reported_amount);
    const proposedAmount = Number(adj.proposed_amount);

    if (isNaN(reportedAmount) || isNaN(proposedAmount)) {
      throw new Error(`Adjustment ${i} has invalid amounts`);
    }

    const adjustment = proposedAmount - reportedAmount;

    validated.push({
      id: String(adj.id),
      year: (adj.year as number) || new Date().getFullYear() - 1,
      form_line: String(adj.form_line),
      item_description: (adj.item_description as string) || "",
      reported_amount: reportedAmount,
      proposed_amount: proposedAmount,
      adjustment: adjustment,
      category: (adj.category as string) || "Other",
      confidence: (adj.confidence as number) || 0.9,
    });
  }

  return validated;
}

/**
 * Validate deficiency calculation math
 */
export function validateDeficiencyMath(
  originalTax: number,
  adjustedTax: number,
  reportedDeficiency: number
): boolean {
  const calculatedDeficiency = adjustedTax - originalTax;
  // Allow small rounding differences
  return Math.abs(calculatedDeficiency - reportedDeficiency) < 1;
}
