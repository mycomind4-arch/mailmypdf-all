/**
 * Collection Due Process (CDP) Notice Extraction Service
 * Multi-LLM extraction with levy threat assessment
 */

import type { TaxDebtItem, CDPNoticeExtraction } from "./types";

/**
 * Extraction schema for CDP notices
 */
export const CDP_EXTRACTION_SCHEMA = {
  notice_date: {
    type: "string",
    format: "YYYY-MM-DD",
    description: "Date notice was issued",
    confidence_threshold: 0.95,
    critical: true,
  },
  notice_type: {
    type: "enum",
    values: ["CDP", "NFTL"],
    description: "CDP or Notice of Federal Tax Lien",
    confidence_threshold: 0.9,
    critical: true,
  },
  response_deadline: {
    type: "string",
    format: "YYYY-MM-DD",
    description: "30-day response deadline from notice date",
    confidence_threshold: 0.98,
    critical: true,
  },
  total_tax_debt: {
    type: "number",
    description: "Total amount of unpaid taxes",
    confidence_threshold: 0.95,
    critical: true,
  },
  tax_debt_items: {
    type: "array",
    description: "Individual tax assessments by year and type",
    confidence_threshold: 0.9,
    critical: true,
  },
  levy_threats: {
    type: "object",
    description: "Specific levy threats (wage, bank, property)",
    confidence_threshold: 0.95,
    critical: true,
  },
  current_payment_status: {
    type: "enum",
    values: ["no-payments", "in-payment-plan", "payments-late", "bankruptcy"],
    description: "Current payment status",
    confidence_threshold: 0.9,
    critical: false,
  },
};

/**
 * Extract Collection Due Process notice data
 */
export async function extractCDPNotice(
  noticeText: string,
  provider: "claude" | "gemini" | "openai" = "claude"
): Promise<CDPNoticeExtraction> {
  if (!noticeText || noticeText.trim().length === 0) {
    throw new Error("Notice text is empty");
  }

  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_type: "collection-due-process",
        text: noticeText,
        provider,
        schema: CDP_EXTRACTION_SCHEMA,
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
    throw new Error(`CDP notice extraction failed: ${message}`);
  }
}

/**
 * Normalize raw LLM output to typed CDPNoticeExtraction
 */
function normalizeExtraction(raw: Record<string, unknown>): CDPNoticeExtraction {
  // Validate required fields
  if (!raw.notice_date) {
    throw new Error("Missing notice date");
  }

  if (!raw.total_tax_debt) {
    throw new Error("Missing total tax debt amount");
  }

  if (!raw.response_deadline) {
    throw new Error("Missing response deadline");
  }

  // Parse dates
  const noticeDate = String(raw.notice_date);
  validateNoticeDate(noticeDate);

  const responseDeadline = String(raw.response_deadline);
  validateResponseDeadline(responseDeadline, noticeDate);

  // Validate tax debt
  const totalDebt = Number(raw.total_tax_debt);
  if (isNaN(totalDebt) || totalDebt <= 0) {
    throw new Error("Invalid tax debt amount");
  }

  // Parse tax debt items
  const debtItems = validateTaxDebtItems(raw.tax_debt_items as unknown[]);

  // Parse levy threats
  const levyThreats = raw.levy_threats as Record<string, unknown> || {};

  // Parse contact info
  const contactInfo = raw.irs_contact_info as Record<string, unknown> | undefined;

  return {
    notice_date: noticeDate,
    notice_date_confidence: (raw.notice_date_confidence as number) || 0.95,
    notice_type: (raw.notice_type as "CDP" | "NFTL") || "CDP",
    notice_type_confidence: (raw.notice_type_confidence as number) || 0.9,
    notice_number: (raw.notice_number as string) || "CDP",
    notice_number_confidence: (raw.notice_number_confidence as number) || 0.85,
    taxpayer_name: (raw.taxpayer_name as string) || "",
    taxpayer_name_confidence: (raw.taxpayer_name_confidence as number) || 0.95,
    taxpayer_ssn_masked: (raw.taxpayer_ssn_masked as string | null) || null,
    ssn_confidence: (raw.ssn_confidence as number) || 0.95,
    address: (raw.address as string | null) || null,
    address_confidence: (raw.address_confidence as number) || 0.9,
    response_deadline: responseDeadline,
    deadline_confidence: (raw.deadline_confidence as number) || 0.98,
    total_tax_debt: totalDebt,
    tax_debt_confidence: (raw.tax_debt_confidence as number) || 0.95,
    tax_debt_items: debtItems,
    tax_debt_detail_confidence: (raw.tax_debt_detail_confidence as number) || 0.9,
    penalties_and_interest: (raw.penalties_and_interest as number) || null,
    penalties_interest_confidence: (raw.penalties_interest_confidence as number) || 0.85,
    total_amount_due: (raw.total_amount_due as number) || totalDebt,
    total_amount_confidence: (raw.total_amount_confidence as number) || 0.95,
    current_payment_status:
      (raw.current_payment_status as "no-payments" | "in-payment-plan" | "payments-late" | "bankruptcy") || "no-payments",
    payment_status_confidence: (raw.payment_status_confidence as number) || 0.85,
    levy_threats: {
      levy_types: (levyThreats.levy_types as string[]) || [],
      specific_assets_named: (levyThreats.specific_assets_named as string[]) || undefined,
      employer_name: (levyThreats.employer_name as string) || undefined,
      bank_routing_number: (levyThreats.bank_routing_number as string) || undefined,
    },
    levy_confidence: (raw.levy_confidence as number) || 0.9,
    collection_activity_history: (raw.collection_activity_history as string | null) || null,
    collection_history_confidence: (raw.collection_history_confidence as number) || 0.8,
    prior_cdp_request: (raw.prior_cdp_request as boolean) || false,
    prior_cdp_confidence: (raw.prior_cdp_confidence as number) || 0.85,
    bankruptcy_reference: (raw.bankruptcy_reference as boolean) || false,
    bankruptcy_reference_confidence: (raw.bankruptcy_reference_confidence as number) || 0.95,
    irs_contact_info: {
      phone: (contactInfo?.phone as string | null) || null,
      address: (contactInfo?.address as string | null) || null,
      employee_id: (contactInfo?.employee_id as string | null) || null,
    },
    contact_confidence: (raw.contact_confidence as number) || 0.9,
    is_business_taxpayer: (raw.is_business_taxpayer as boolean) || false,
    is_joint_return: (raw.is_joint_return as boolean) || false,
    is_deceased_taxpayer: (raw.is_deceased_taxpayer as boolean) || false,
    notice_complexity: (raw.notice_complexity as "simple" | "moderate" | "complex") || "moderate",
  };
}

/**
 * Validate notice date is recent
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
      `Notice is more than 6 months old (${daysOld} days). Response deadline may have passed.`
    );
  }
}

/**
 * Validate response deadline is 30 days from notice date
 */
export function validateResponseDeadline(deadlineStr: string, noticeDate: string): void {
  const deadline = new Date(deadlineStr);
  const notice = new Date(noticeDate);

  if (isNaN(deadline.getTime())) {
    throw new Error(`Invalid deadline format: ${deadlineStr}`);
  }

  // Check deadline is roughly 30 days from notice (allow 25-35 days)
  const daysDiff = Math.floor((deadline.getTime() - notice.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff < 25 || daysDiff > 35) {
    console.warn(
      `Deadline is ${daysDiff} days from notice date. Expected ~30 days. Verify accuracy.`
    );
  }
}

/**
 * Validate tax debt items
 */
export function validateTaxDebtItems(items: unknown[]): TaxDebtItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No tax debt items found in notice");
  }

  const validated: TaxDebtItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Record<string, unknown>;

    if (!item.id) {
      throw new Error(`Debt item ${i} missing id`);
    }

    if (!item.tax_type) {
      throw new Error(`Debt item ${i} missing tax type`);
    }

    const amount = Number(item.amount_owed);
    if (isNaN(amount) || amount <= 0) {
      throw new Error(`Debt item ${i} has invalid amount`);
    }

    validated.push({
      id: String(item.id),
      tax_type: String(item.tax_type),
      tax_year: (item.tax_year as number) || new Date().getFullYear() - 1,
      amount_owed: amount,
      assessed_date: (item.assessed_date as string) || new Date().toISOString().split("T")[0],
      payment_status: (item.payment_status as "unpaid" | "partially-paid" | "in-payment-plan") || "unpaid",
    });
  }

  return validated;
}

/**
 * Assess levy risk level based on notice content
 */
export function assessLevyRisk(extraction: CDPNoticeExtraction): "imminent" | "likely" | "possible" {
  const levyTypes = extraction.levy_threats.levy_types.length;
  const specificAssets = (extraction.levy_threats.specific_assets_named || []).length > 0;
  const collectionHistory = extraction.collection_activity_history ? true : false;

  if (specificAssets || (collectionHistory && levyTypes > 0)) {
    return "imminent";
  }

  if (levyTypes > 1 || (collectionHistory && levyTypes > 0)) {
    return "likely";
  }

  if (levyTypes > 0) {
    return "possible";
  }

  return "possible";
}

/**
 * Calculate estimated days until levy
 */
export function estimateLevyTimeline(extraction: CDPNoticeExtraction): string {
  const deadline = new Date(extraction.response_deadline);
  const now = new Date();
  const daysUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDeadline <= 0) {
    return "Immediate (deadline passed)";
  }

  if (daysUntilDeadline <= 5) {
    return `Within days (${daysUntilDeadline} days remaining)`;
  }

  if (daysUntilDeadline <= 15) {
    return `Within 1-2 weeks (${daysUntilDeadline} days remaining)`;
  }

  return `Within 30 days (${daysUntilDeadline} days remaining)`;
}
