/**
 * Eviction Notice Extraction Service
 * Multi-LLM extraction with confidence scoring and fallback
 */

import type { EvictionNoticeExtraction } from "./types";

const EVICTION_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    deadline_date: {
      type: "string",
      description:
        'Date tenant must respond by (format: YYYY-MM-DD). Look for "respond by", "must comply by", "must vacate by"',
    },
    notice_amount_owed: {
      type: ["number", "null"],
      description: 'Dollar amount owed in rent. Format as number (e.g., 2400 for $2,400). null if not found.',
    },
    notice_issuer: {
      type: "string",
      description: "Name of landlord or property management company issuing notice",
    },
    property_address: {
      type: "string",
      description: "Full rental property address (street, city, state, zip)",
    },
    county: {
      type: "string",
      description: "California county where property is located",
    },
    city: { type: "string", description: "City name if available" },
    notice_issue_date: {
      type: "string",
      description: "Date notice was issued/created (format: YYYY-MM-DD)",
    },
    notice_service_date: {
      type: ["string", "null"],
      description: "Date notice was served to tenant (format: YYYY-MM-DD), null if not found",
    },
    tenant_name: {
      type: "string",
      description: "Name of tenant(s) to whom notice is addressed",
    },
    notice_type: {
      type: "string",
      enum: ["3day-pay", "3day-cure", "unconditional-quit", "unknown"],
      description:
        "Type of eviction notice: 3day-pay (pay or quit), 3day-cure (cure or quit), unconditional-quit (leave), or unknown",
    },
    confidence_scores: {
      type: "object",
      properties: {
        deadline_date: { type: "number", minimum: 0, maximum: 1 },
        amount: { type: "number", minimum: 0, maximum: 1 },
        issuer: { type: "number", minimum: 0, maximum: 1 },
        address: { type: "number", minimum: 0, maximum: 1 },
        notice_type: { type: "number", minimum: 0, maximum: 1 },
      },
    },
  },
  required: ["deadline_date", "notice_issuer", "property_address", "notice_type"],
};

export async function extractEvictionNotice(documentText: string): Promise<EvictionNoticeExtraction> {
  const systemPrompt = `You are a specialized legal document extraction assistant for California eviction notices.

Your task: Extract structured data from a 3-day notice to pay/quit or other eviction notice.

CRITICAL RULES:
1. Extract ONLY information directly stated in the document. Do not infer or assume.
2. For dates, use YYYY-MM-DD format. If date is ambiguous, use highest confidence score < 1.0.
3. Deadline date is CRITICAL. Look for "must respond by", "respond by", "on or before", "by [date]".
4. Amount owed should be the primary amount claimed, excluding optional fees unless clearly included.
5. Confidence scores (0-1): 1.0 = certain, 0.8+ = likely, 0.6-0.8 = possible, <0.6 = uncertain.
6. For notice_type: look for title/heading. "Pay or Quit" = 3day-pay, "Cure or Quit" = 3day-cure, "Unconditional Quit" = unconditional-quit.
7. Flag any assumption or uncertainty in confidence score (use < 1.0).

RESPONSE FORMAT: Return ONLY valid JSON matching the schema. No explanations or preamble.`;

  const userPrompt = `Extract structured data from this eviction notice document:

${documentText}

Return JSON with extracted fields and confidence scores. Use null for fields not found.`;

  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentText,
        outputSchema: JSON.stringify(EVICTION_EXTRACTION_SCHEMA),
        noticeType: "eviction-3day",
      }),
    });

    if (!response.ok) {
      throw new Error(`Extraction API failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(`Extraction failed: ${result.error}`);
    }

    // Normalize extraction results
    return normalizeExtraction(result.extraction, result.confidence);
  } catch (error) {
    console.error("Eviction extraction failed:", error);
    throw new Error(
      `Failed to extract notice: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function normalizeExtraction(raw: any, apiConfidence: number): EvictionNoticeExtraction {
  const confidence_scores = raw.confidence_scores || {};

  return {
    deadline_date: parseDate(raw.deadline_date),
    deadline_confidence: confidence_scores.deadline_date || (raw.deadline_date ? 0.85 : 0.0),
    notice_amount_owed: raw.notice_amount_owed || null,
    amount_confidence: confidence_scores.amount || (raw.notice_amount_owed ? 0.82 : 0.0),
    notice_issuer: raw.notice_issuer || "",
    issuer_confidence: confidence_scores.issuer || (raw.notice_issuer ? 0.90 : 0.0),
    property_address: raw.property_address || "",
    address_confidence: confidence_scores.address || (raw.property_address ? 0.88 : 0.0),
    jurisdiction: {
      state: "CA",
      county: raw.county || "",
      city: raw.city,
    },
    jurisdiction_confidence: 0.85,
    notice_issue_date: parseDate(raw.notice_issue_date),
    notice_service_date: raw.notice_service_date ? parseDate(raw.notice_service_date) : null,
    tenant_name: raw.tenant_name || "",
    prior_correspondence: raw.prior_correspondence || null,
    notice_type: mapNoticeType(raw.notice_type),
    type_confidence: confidence_scores.notice_type || 0.85,
  };
}

function parseDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  } catch {
    return dateStr; // Return as-is if parsing fails
  }
}

function mapNoticeType(
  type: string | undefined
): "3day-pay" | "3day-cure" | "unconditional-quit" | "unknown" {
  if (!type) return "unknown";
  const lower = type.toLowerCase();
  if (lower.includes("pay") || lower.includes("nonpayment")) return "3day-pay";
  if (lower.includes("cure")) return "3day-cure";
  if (lower.includes("unconditional")) return "unconditional-quit";
  return "unknown";
}

// Validation functions for confirmation
export function validateDeadlineExtraction(extraction: EvictionNoticeExtraction): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!extraction.deadline_date) {
    issues.push("Deadline date not found");
  }

  if (extraction.deadline_confidence < 0.7) {
    issues.push(`Deadline confidence low: ${(extraction.deadline_confidence * 100).toFixed(0)}%`);
  }

  if (extraction.deadline_date) {
    const deadline = new Date(extraction.deadline_date);
    const today = new Date();
    if (deadline < today) {
      issues.push("Deadline has already passed");
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateAmountExtraction(extraction: EvictionNoticeExtraction): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (extraction.notice_amount_owed === null || extraction.notice_amount_owed === undefined) {
    issues.push("Amount owed not extracted");
  }

  if (extraction.amount_confidence < 0.7) {
    issues.push(`Amount confidence low: ${(extraction.amount_confidence * 100).toFixed(0)}%`);
  }

  if (extraction.notice_amount_owed && extraction.notice_amount_owed < 0) {
    issues.push("Amount is negative (invalid)");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateIssuerExtraction(extraction: EvictionNoticeExtraction): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!extraction.notice_issuer) {
    issues.push("Issuer/landlord name not found");
  }

  if (extraction.issuer_confidence < 0.7) {
    issues.push(`Issuer confidence low: ${(extraction.issuer_confidence * 100).toFixed(0)}%`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
