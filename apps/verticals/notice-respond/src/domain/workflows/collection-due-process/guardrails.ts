/**
 * Collection Due Process (CDP) Guardrails & Compliance
 * Ensures levy prevention strategies are legally sound and ethical
 */

import type {
  CDPClassificationResult,
  CDPGuardrail,
  ComplianceCheckResult,
  CDPNoticeExtraction,
  CDPIntakeConfirmation,
} from "./types";

/**
 * Check compliance after classification
 */
export function checkComplianceAfterClassification(
  extraction: CDPNoticeExtraction,
  classification: CDPClassificationResult
): ComplianceCheckResult {
  const guardrails: CDPGuardrail[] = [];
  const warnings: string[] = [];
  const assumptions: string[] = [];

  // 1. Critical Deadline Guardrail
  const deadline = new Date(extraction.response_deadline);
  const now = new Date();
  const daysRemaining = Math.floor(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  guardrails.push({
    id: "critical-deadline",
    type: "critical-deadline",
    triggered: daysRemaining <= 0,
    description: "30-day CDP response deadline",
    message:
      daysRemaining <= 0
        ? "CRITICAL: Response deadline has PASSED. Levy action is imminent."
        : `${daysRemaining} days remaining to respond (deadline: ${extraction.response_deadline})`,
  });

  if (daysRemaining <= 0) {
    warnings.push("DEADLINE PASSED - IMMEDIATE ATTORNEY CONSULTATION REQUIRED");
  }

  if (daysRemaining <= 5 && daysRemaining > 0) {
    warnings.push(`URGENT: Only ${daysRemaining} days remaining to respond`);
  }

  // 2. Levy Prevention Guardrail
  const levyTypes = extraction.levy_threats.levy_types.length;
  const specificAssets =
    (extraction.levy_threats.specific_assets_named || []).length > 0;

  guardrails.push({
    id: "levy-prevention",
    type: "levy-prevention",
    triggered: levyTypes > 0 || specificAssets,
    description:
      "Levy prevention strategies available and appropriate for situation",
    message:
      levyTypes === 0
        ? "No specific levy threats identified"
        : `${levyTypes} levy type(s) threatened. Multiple prevention strategies available.`,
  });

  // 3. Bankruptcy Automatic Stay Guardrail
  guardrails.push({
    id: "bankruptcy-stay",
    type: "bankruptcy-stay",
    triggered: extraction.bankruptcy_reference,
    description: "Bankruptcy automatic stay implications",
    message: extraction.bankruptcy_reference
      ? "Bankruptcy reference detected. Automatic stay immediately halts all collection action."
      : "No bankruptcy reference indicated",
  });

  // 4. No Fabricated Claims Guardrail
  guardrails.push({
    id: "no-fabricated-claims",
    type: "no-fabricated-claims",
    triggered: classification.path === "dispute-liability",
    description: "Liability disputes must be evidence-based",
    message:
      classification.path === "dispute-liability"
        ? "Ensure any liability dispute is supported by documentation"
        : "No liability dispute asserted",
  });

  // 5. Attorney Escalation Guardrail
  const requiresAttorney =
    classification.hard_stop ||
    daysRemaining <= 0 ||
    extraction.total_tax_debt > 100000 ||
    specificAssets ||
    extraction.bankruptcy_reference;

  guardrails.push({
    id: "attorney-escalation",
    type: "attorney-escalation",
    triggered: requiresAttorney,
    description: "Complex situations require professional representation",
    message: requiresAttorney
      ? "This situation warrants attorney or CPA consultation"
      : "Situation may be resolvable without professional representation",
  });

  // 6. Assumption Flagging Guardrail
  const lowConfidenceFields = flagLowConfidenceAssumptions(extraction);
  const hasAssumptions = lowConfidenceFields.length > 0;

  guardrails.push({
    id: "assumption-flag",
    type: "assumption-flag",
    triggered: hasAssumptions,
    description: "Low-confidence extraction fields require verification",
    message: hasAssumptions
      ? `${lowConfidenceFields.length} field(s) with <90% confidence`
      : "All critical fields extracted with high confidence",
  });

  assumptions.push(...lowConfidenceFields);

  // Calculate levy risk level (0-1)
  let levyRiskLevel = 0;

  if (specificAssets) {
    levyRiskLevel = 0.95; // Specific assets named = very high risk
  } else if (levyTypes >= 3) {
    levyRiskLevel = 0.85; // Multiple levy threats = high risk
  } else if (levyTypes >= 2) {
    levyRiskLevel = 0.7; // Two levy threats = moderate-high risk
  } else if (levyTypes === 1) {
    levyRiskLevel = 0.55; // One levy threat = moderate risk
  } else {
    levyRiskLevel = 0.3; // No specific threats = low-moderate risk
  }

  // Adjust for deadline proximity
  if (daysRemaining <= 0) {
    levyRiskLevel = Math.min(1.0, levyRiskLevel + 0.2);
  } else if (daysRemaining <= 5) {
    levyRiskLevel = Math.min(1.0, levyRiskLevel + 0.15);
  }

  const criticalDeadlines = [];

  if (daysRemaining > 0) {
    criticalDeadlines.push({
      event: "CDP Response Deadline",
      date: extraction.response_deadline,
      days_remaining: daysRemaining,
    });
  }

  if (
    extraction.notice_type === "NFTL" &&
    extraction.prior_cdp_request &&
    daysRemaining <= 30
  ) {
    const secondDeadline = new Date(extraction.response_deadline);
    secondDeadline.setDate(secondDeadline.getDate() + 30); // After CDP deadline, 30 days for second CDP

    criticalDeadlines.push({
      event: "Secondary CDP Deadline",
      date: secondDeadline.toISOString().split("T")[0],
      days_remaining: Math.floor(
        (secondDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
    });
  }

  return {
    passed:
      !classification.hard_stop &&
      daysRemaining > 0 &&
      levyRiskLevel < 0.9 &&
      !hasAssumptions,
    guardrails,
    warnings,
    assumptions_flagged: assumptions,
    levy_risk_level: levyRiskLevel,
    days_until_levy: daysRemaining > 0 ? daysRemaining : 0,
    critical_deadlines: criticalDeadlines,
  };
}

/**
 * Check compliance before sending response
 */
export function checkComplianceBeforeSending(
  extraction: CDPNoticeExtraction,
  classification: CDPClassificationResult
): ComplianceCheckResult {
  const compliance = checkComplianceAfterClassification(extraction, classification);

  // Additional pre-sending checks

  // Verify required fields for selected path
  const pathRequirements: Record<string, string[]> = {
    "setup-payment-plan": [
      "total_tax_debt",
      "response_deadline",
      "notice_date",
    ],
    "request-currently-not-collectible": [
      "total_tax_debt",
      "response_deadline",
    ],
    "request-offer-in-compromise": ["total_tax_debt", "response_deadline"],
    "dispute-liability": ["total_tax_debt", "response_deadline"],
    "request-lien-withdrawal": [
      "total_tax_debt",
      "response_deadline",
      "notice_type",
    ],
    "levy-hardship-relief": ["total_tax_debt", "response_deadline"],
    "bankruptcy-protection": ["response_deadline"],
    "escalate-attorney": ["total_tax_debt", "response_deadline"],
  };

  const requirements = pathRequirements[classification.path] || [];
  const missingFields: string[] = [];

  for (const field of requirements) {
    if (
      field === "total_tax_debt" &&
      (!extraction.total_tax_debt || extraction.total_tax_debt <= 0)
    ) {
      missingFields.push("total_tax_debt");
    }
    if (
      field === "response_deadline" &&
      (!extraction.response_deadline ||
        new Date(extraction.response_deadline) <= new Date())
    ) {
      missingFields.push("response_deadline");
    }
    if (
      field === "notice_type" &&
      (!extraction.notice_type ||
        !["CDP", "NFTL"].includes(extraction.notice_type))
    ) {
      missingFields.push("notice_type");
    }
  }

  if (missingFields.length > 0) {
    compliance.warnings.push(
      `Required fields missing for ${classification.path}: ${missingFields.join(", ")}`
    );
    compliance.passed = false;
  }

  // Verify statutory authority for selected path
  if (classification.path === "dispute-liability" && !extraction.notice_type) {
    compliance.warnings.push("Cannot assert liability dispute without notice type");
    compliance.passed = false;
  }

  if (
    classification.path === "request-lien-withdrawal" &&
    extraction.notice_type !== "NFTL"
  ) {
    compliance.warnings.push("Lien withdrawal request only applicable to NFTL notices");
    compliance.passed = false;
  }

  return compliance;
}

/**
 * Flag low-confidence extraction assumptions
 */
export function flagLowConfidenceAssumptions(
  extraction: CDPNoticeExtraction
): string[] {
  const assumptions: string[] = [];
  const confidenceThreshold = 0.9;

  // Critical deadline confidence
  if (extraction.deadline_confidence < confidenceThreshold) {
    assumptions.push(
      `[ASSUMPTION] Response deadline confidence is ${(extraction.deadline_confidence * 100).toFixed(0)}%. Verify: ${extraction.response_deadline}`
    );
  }

  // Tax debt confidence
  if (extraction.tax_debt_confidence < confidenceThreshold) {
    assumptions.push(
      `[ASSUMPTION] Tax debt confidence is ${(extraction.tax_debt_confidence * 100).toFixed(0)}%. Verify: $${extraction.total_tax_debt.toLocaleString()}`
    );
  }

  // Notice date confidence
  if (extraction.notice_date_confidence < confidenceThreshold) {
    assumptions.push(
      `[ASSUMPTION] Notice date confidence is ${(extraction.notice_date_confidence * 100).toFixed(0)}%. Verify: ${extraction.notice_date}`
    );
  }

  // Levy threats confidence
  if (extraction.levy_confidence < confidenceThreshold) {
    assumptions.push(
      `[ASSUMPTION] Levy threats confidence is ${(extraction.levy_confidence * 100).toFixed(0)}%. Verify manually: ${extraction.levy_threats.levy_types.join(", ") || "none identified"}`
    );
  }

  // Notice type confidence
  if (extraction.notice_type_confidence < confidenceThreshold) {
    assumptions.push(
      `[ASSUMPTION] Notice type confidence is ${(extraction.notice_type_confidence * 100).toFixed(0)}%. Verify: ${extraction.notice_type}`
    );
  }

  // Payment status confidence
  if (extraction.payment_status_confidence < 0.85) {
    assumptions.push(
      `[ASSUMPTION] Payment status confidence is ${(extraction.payment_status_confidence * 100).toFixed(0)}%. Verify: ${extraction.current_payment_status}`
    );
  }

  return assumptions;
}

/**
 * Validate extraction quality for classification
 */
export function validateExtractionQuality(
  extraction: CDPNoticeExtraction
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Critical field validation
  if (!extraction.notice_date) {
    errors.push("Missing notice date");
  }

  if (!extraction.response_deadline) {
    errors.push("Missing response deadline");
  }

  if (!extraction.total_tax_debt || extraction.total_tax_debt <= 0) {
    errors.push("Invalid total tax debt");
  }

  if (!extraction.notice_type || !["CDP", "NFTL"].includes(extraction.notice_type)) {
    errors.push("Invalid notice type");
  }

  if (!extraction.tax_debt_items || extraction.tax_debt_items.length === 0) {
    errors.push("No tax debt items found");
  }

  // Date validation
  const noticeDate = new Date(extraction.notice_date);
  const deadline = new Date(extraction.response_deadline);
  const now = new Date();

  if (isNaN(noticeDate.getTime())) {
    errors.push("Invalid notice date format");
  }

  if (isNaN(deadline.getTime())) {
    errors.push("Invalid deadline format");
  }

  // Deadline should be roughly 30 days after notice
  if (!isNaN(noticeDate.getTime()) && !isNaN(deadline.getTime())) {
    const daysDiff = Math.floor(
      (deadline.getTime() - noticeDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff < 25 || daysDiff > 35) {
      errors.push(
        `Deadline appears incorrect: ${daysDiff} days from notice (expected ~30)`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Assess whether classification is appropriate
 */
export function validateClassificationAppropriate(
  extraction: CDPNoticeExtraction,
  classification: CDPClassificationResult
): { appropriate: boolean; concerns: string[] } {
  const concerns: string[] = [];

  // Hard-stop validation
  if (classification.hard_stop) {
    if (!classification.hard_stop_reason) {
      concerns.push("Hard-stop flagged but no reason provided");
    }
  }

  // Path-specific validation
  const levyTypes = extraction.levy_threats.levy_types.length;

  if (
    classification.path === "setup-payment-plan" &&
    extraction.current_payment_status === "bankruptcy"
  ) {
    concerns.push("Payment plan path inappropriate for bankruptcy taxpayer");
  }

  if (
    classification.path === "request-lien-withdrawal" &&
    extraction.notice_type !== "NFTL"
  ) {
    concerns.push("Lien withdrawal only applicable to NFTL notices");
  }

  if (
    classification.path === "dispute-liability" &&
    !extraction.prior_cdp_request &&
    extraction.current_payment_status !== "no-payments"
  ) {
    // Only flag if it's not a reasonable position
  }

  // Confidence validation
  if (
    classification.confidence < 0.7 &&
    !classification.hard_stop
  ) {
    concerns.push(`Low confidence classification (${(classification.confidence * 100).toFixed(0)}%)`);
  }

  return {
    appropriate: concerns.length === 0,
    concerns,
  };
}

/**
 * Generate compliance summary
 */
export function generateComplianceSummary(
  intake: CDPIntakeConfirmation,
  classification: CDPClassificationResult
): string {
  const extraction = intake.extraction;
  const compliance = checkComplianceBeforeSending(extraction, classification);

  const now = new Date();
  const deadline = new Date(extraction.response_deadline);
  const daysRemaining = Math.floor(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  let summary = "# Collection Due Process Compliance Summary\n\n";

  summary += `## Compliance Status: ${compliance.passed ? "✓ PASSED" : "✗ REVIEW REQUIRED"}\n\n`;

  summary += `## Critical Timeline\n`;
  summary += `- Notice Date: ${extraction.notice_date}\n`;
  summary += `- Response Deadline: ${extraction.response_deadline}\n`;
  summary += `- Days Remaining: **${daysRemaining}**\n`;
  summary += `- Levy Risk Level: ${(compliance.levy_risk_level * 100).toFixed(0)}%\n\n`;

  summary += `## Selected Path\n`;
  summary += `- Path: ${classification.path}\n`;
  summary += `- Confidence: ${(classification.confidence * 100).toFixed(0)}%\n`;
  summary += `- Hard Stop: ${classification.hard_stop ? "YES" : "NO"}\n\n`;

  if (compliance.warnings.length > 0) {
    summary += `## ⚠️ Warnings\n`;
    for (const warning of compliance.warnings) {
      summary += `- ${warning}\n`;
    }
    summary += "\n";
  }

  if (compliance.assumptions_flagged.length > 0) {
    summary += `## [ASSUMPTIONS] Low-Confidence Fields\n`;
    for (const assumption of compliance.assumptions_flagged) {
      summary += `- ${assumption}\n`;
    }
    summary += "\n";
  }

  return summary;
}
