/**
 * CP2000 Notice Extraction Service
 * Multi-LLM extraction with Claude primary, Gemini/OpenAI fallback
 */

import type { ProposedAdjustment, CP2000NoticeExtraction } from "./types";

/**
 * Extraction schema for CP2000 notices
 * Defines the structure expected from LLM extraction
 */
export const CP2000_EXTRACTION_SCHEMA = {
  deadline_date: {
    type: "string",
    format: "YYYY-MM-DD",
    description: "Deadline to respond (30 days domestic, 60 days outside US)",
    confidence_threshold: 0.9,
    critical: true,
  },
  deadline_days: {
    type: "number",
    description: "Days allowed to respond (30 or 60)",
    confidence_threshold: 0.9,
    critical: true,
  },
  notice_number: {
    type: "string",
    description: "IRS notice number (e.g., CP2000, CP2001, etc.)",
    confidence_threshold: 0.85,
    critical: false,
  },
  notice_issue_date: {
    type: "string",
    format: "YYYY-MM-DD",
    description: "Date notice was issued",
    confidence_threshold: 0.85,
    critical: false,
  },
  taxpayer_name: {
    type: "string",
    description: "Name of taxpayer",
    confidence_threshold: 0.9,
    critical: false,
  },
  taxpayer_ssn_masked: {
    type: "string",
    pattern: "###-##-####",
    description: "Masked SSN for privacy",
    confidence_threshold: 0.9,
    critical: false,
  },
  tax_year: {
    type: "number",
    description: "Tax year under examination",
    confidence_threshold: 0.95,
    critical: true,
  },
  proposed_adjustments: {
    type: "array",
    description: "Array of proposed adjustments by line item",
    items: {
      category: "string",
      line_reference: "string",
      original_amount: "number",
      adjustment_amount: "number",
      resulting_amount: "number",
    },
    confidence_threshold: 0.85,
    critical: true,
  },
  total_additional_tax: {
    type: "number",
    description: "Total additional tax owed including adjustments",
    confidence_threshold: 0.85,
    critical: false,
  },
  proposed_penalty_amount: {
    type: "number",
    description: "Proposed penalty amount (typically 20% accuracy-related)",
    confidence_threshold: 0.8,
    critical: false,
  },
  irs_contact_info: {
    type: "object",
    description: "IRS contact information",
    properties: {
      phone: "string",
      fax: "string",
      address: "string",
    },
    confidence_threshold: 0.75,
    critical: false,
  },
  is_outside_us_flag: {
    type: "boolean",
    description: "Whether taxpayer is outside US (affects deadline: 60 vs 30 days)",
    confidence_threshold: 0.85,
    critical: true,
  },
  notice_complexity: {
    type: "enum",
    values: ["simple", "moderate", "complex"],
    description: "Complexity assessment (affects response strategy)",
    confidence_threshold: 0.8,
    critical: false,
  },
  fraud_indicators: {
    type: "array",
    description: "Any fraud-related language found in notice",
    items: "string",
    confidence_threshold: 0.9,
    critical: true,
  },
};

/**
 * Main extraction function
 * Calls /api/extract endpoint with multi-LLM fallback
 */
export async function extractCP2000Notice(
  noticeText: string,
  provider: "claude" | "gemini" | "openai" = "claude"
): Promise<CP2000NoticeExtraction> {
  if (!noticeText || noticeText.trim().length === 0) {
    throw new Error("Notice text is empty");
  }

  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_type: "cp2000",
        text: noticeText,
        provider,
        schema: CP2000_EXTRACTION_SCHEMA,
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
    throw new Error(`CP2000 extraction failed: ${message}`);
  }
}

/**
 * Normalize raw LLM output to typed CP2000NoticeExtraction
 */
function normalizeExtraction(raw: Record<string, unknown>): CP2000NoticeExtraction {
  // Validate required fields
  if (!raw.deadline_date) {
    throw new Error("Missing deadline date");
  }

  if (!raw.deadline_days) {
    throw new Error("Missing deadline days");
  }

  if (!raw.tax_year) {
    throw new Error("Missing tax year");
  }

  if (!Array.isArray(raw.proposed_adjustments)) {
    throw new Error("Missing or invalid proposed adjustments array");
  }

  // Parse dates
  const deadlineDate = String(raw.deadline_date);
  const noticeIssueDate = raw.notice_issue_date ? String(raw.notice_issue_date) : deadlineDate;

  // Validate deadline extraction
  validateDeadlineExtraction(deadlineDate, raw.deadline_days as number);

  // Validate tax year extraction
  validateTaxYearExtraction(raw.tax_year as number);

  // Validate proposed adjustments
  const proposedAdjustments = validateProposedAdjustmentsExtraction(
    raw.proposed_adjustments as unknown[]
  );

  // Parse contact info
  const contactInfo = raw.irs_contact_info as
    | Record<string, unknown>
    | undefined;

  return {
    deadline_date: deadlineDate,
    deadline_confidence: (raw.deadline_confidence as number) || 0.9,
    deadline_days: raw.deadline_days as number,
    notice_number: (raw.notice_number as string) || "CP2000",
    notice_number_confidence: (raw.notice_number_confidence as number) || 0.85,
    notice_issue_date: noticeIssueDate,
    notice_issue_date_confidence: (raw.notice_issue_date_confidence as number) || 0.85,
    taxpayer_name: (raw.taxpayer_name as string) || "",
    taxpayer_name_confidence: (raw.taxpayer_name_confidence as number) || 0.85,
    taxpayer_ssn_masked: (raw.taxpayer_ssn_masked as string | null) || null,
    ssn_confidence: (raw.ssn_confidence as number) || 0.85,
    tax_year: raw.tax_year as number,
    tax_year_confidence: (raw.tax_year_confidence as number) || 0.95,
    proposed_adjustments: proposedAdjustments,
    adjustments_confidence: (raw.adjustments_confidence as number) || 0.85,
    total_additional_tax: (raw.total_additional_tax as number) || null,
    total_tax_confidence: (raw.total_tax_confidence as number) || 0.85,
    proposed_penalty_amount: (raw.proposed_penalty_amount as number) || null,
    penalty_confidence: (raw.penalty_confidence as number) || 0.8,
    irs_contact_info: {
      phone: (contactInfo?.phone as string | null) || null,
      fax: (contactInfo?.fax as string | null) || null,
      address: (contactInfo?.address as string | null) || null,
    },
    contact_confidence: (raw.contact_confidence as number) || 0.75,
    is_outside_us_flag: (raw.is_outside_us_flag as boolean) || false,
    notice_complexity: (raw.notice_complexity as "simple" | "moderate" | "complex") || "moderate",
    fraud_indicators: (raw.fraud_indicators as string[]) || [],
  };
}

/**
 * Validate deadline extraction
 * Deadline is critical: must be within 30 days (domestic) or 60 days (outside US)
 */
export function validateDeadlineExtraction(deadline: string, deadlineDays: number): void {
  // Parse deadline date
  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    throw new Error(`Invalid deadline date format: ${deadline}`);
  }

  // Deadline days must be 30 or 60
  if (deadlineDays !== 30 && deadlineDays !== 60) {
    throw new Error(
      `Invalid deadline days: ${deadlineDays}. Must be 30 (domestic) or 60 (outside US).`
    );
  }

  // Check if deadline is reasonable (not more than 90 days from today)
  const today = new Date();
  const daysUntilDeadline = Math.floor(
    (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilDeadline < 0) {
    throw new Error(`Deadline has already passed: ${deadline}`);
  }

  if (daysUntilDeadline > 90) {
    throw new Error(
      `Deadline appears too far in future: ${deadline} (${daysUntilDeadline} days). Verify date is correct.`
    );
  }
}

/**
 * Validate tax year extraction
 * Tax year is critical: must be 4 digits, not current or future
 */
export function validateTaxYearExtraction(taxYear: number): void {
  const currentYear = new Date().getFullYear();

  if (taxYear < 1900 || taxYear >= currentYear) {
    throw new Error(
      `Invalid tax year: ${taxYear}. Must be a past year (< ${currentYear}).`
    );
  }

  if (taxYear < currentYear - 10) {
    throw new Error(
      `Tax year ${taxYear} is more than 10 years old. Verify extraction is correct (statute of limitations may apply).`
    );
  }
}

/**
 * Validate proposed adjustments extraction
 * Each line item must have required fields with valid numbers
 */
export function validateProposedAdjustmentsExtraction(
  adjustments: unknown[]
): ProposedAdjustment[] {
  if (!Array.isArray(adjustments) || adjustments.length === 0) {
    throw new Error("No proposed adjustments found in notice");
  }

  const validated: ProposedAdjustment[] = [];

  for (let i = 0; i < adjustments.length; i++) {
    const adj = adjustments[i] as Record<string, unknown>;

    if (!adj.id) {
      throw new Error(`Adjustment ${i} missing id`);
    }

    if (!adj.category) {
      throw new Error(`Adjustment ${i} missing category`);
    }

    if (!adj.line_reference) {
      throw new Error(`Adjustment ${i} missing line reference`);
    }

    const originalAmount = Number(adj.original_amount);
    const adjustmentAmount = Number(adj.adjustment_amount);
    const resultingAmount = Number(adj.resulting_amount);

    if (isNaN(originalAmount) || isNaN(adjustmentAmount) || isNaN(resultingAmount)) {
      throw new Error(`Adjustment ${i} has invalid amounts`);
    }

    // Verify math: original + adjustment = resulting
    const expectedResulting = originalAmount + adjustmentAmount;
    if (Math.abs(expectedResulting - resultingAmount) > 0.01) {
      throw new Error(
        `Adjustment ${i} math error: ${originalAmount} + ${adjustmentAmount} should equal ${resultingAmount}`
      );
    }

    validated.push({
      id: String(adj.id),
      category: String(adj.category),
      line_reference: String(adj.line_reference),
      original_amount: originalAmount,
      adjustment_amount: adjustmentAmount,
      resulting_amount: resultingAmount,
      confidence: (adj.confidence as number) || 0.85,
    });
  }

  return validated;
}

/**
 * Validate IRS contact information extraction
 * At least one contact method should be present
 */
export function validateContactInfoExtraction(contactInfo: {
  phone?: string | null;
  fax?: string | null;
  address?: string | null;
}): boolean {
  const hasPhone = contactInfo.phone && contactInfo.phone.trim().length > 0;
  const hasFax = contactInfo.fax && contactInfo.fax.trim().length > 0;
  const hasAddress = contactInfo.address && contactInfo.address.trim().length > 0;

  return hasPhone || hasFax || hasAddress;
}
