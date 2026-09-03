/**
 * Notice of Deficiency Guardrails & Compliance
 * Critical deadline and statutory requirement enforcement
 */

import type {
  NoticeOfDeficiencyExtraction,
  DeficiencyGuardrail,
  ComplianceCheckResult,
  GeneratedDocument,
} from "./types";

/**
 * Six Core Guardrails for Notice of Deficiency Responses
 */
const DEFICIENCY_GUARDRAILS = {
  CRITICAL_DEADLINE: {
    type: "critical-deadline" as const,
    description: "90/150-day deadline for responding to notice is critical",
    message:
      "Failure to respond by the statutory deadline may waive appeals and Tax Court rights.",
  },
  TAX_COURT_JURISDICTION: {
    type: "tax-court-jurisdiction" as const,
    description: "Tax Court petition must be filed within 90/150 days of notice",
    message:
      "Tax Court has jurisdiction only for timely-filed petitions. This is an absolute deadline.",
  },
  NO_FABRICATED_DEFENSES: {
    type: "no-fabricated-defenses" as const,
    description: "All defenses must be substantiated by evidence",
    message:
      "Only assert tax positions you can support with documentation. Do not fabricate facts.",
  },
  ATTORNEY_ESCALATION: {
    type: "attorney-escalation" as const,
    description: "Complex cases require professional representation",
    message:
      "Substantial deficiencies, fraud allegations, or complex tax issues warrant attorney guidance.",
  },
  FRAUD_DETECTION: {
    type: "fraud-detection" as const,
    description: "Fraud allegations in notice have serious consequences",
    message:
      "Fraud assertions can lead to criminal prosecution. Consult with attorney before responding.",
  },
  ASSUMPTION_FLAG: {
    type: "assumption-flag" as const,
    description: "Flag low-confidence extractions",
    message:
      "[ASSUMPTION] This field has low confidence. Verify accuracy before submitting response.",
  },
};

/**
 * Compliance check after classification
 */
export function checkComplianceAfterClassification(
  extraction: NoticeOfDeficiencyExtraction,
  classification_path: string
): ComplianceCheckResult {
  const guardrails: DeficiencyGuardrail[] = [];
  const warnings: string[] = [];
  const assumptions_flagged: string[] = [];
  const criticalDeadlines: Array<{ event: string; date: string; days_remaining: number }> = [];

  const now = new Date();
  const responseDeadline = new Date(extraction.statutory_notice_deadline);
  const daysUntilDeadline = Math.floor(
    (responseDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Critical deadline check
  const deadlineGuardrail: DeficiencyGuardrail = {
    id: "response-deadline",
    type: "critical-deadline",
    description: DEFICIENCY_GUARDRAILS.CRITICAL_DEADLINE.description,
    triggered: daysUntilDeadline <= 0,
    message:
      daysUntilDeadline <= 0
        ? `🚨 CRITICAL: Response deadline has PASSED (${extraction.statutory_notice_deadline}). Limited options available.`
        : `Response deadline: ${extraction.statutory_notice_deadline} (${daysUntilDeadline} days remaining)`,
  };
  guardrails.push(deadlineGuardrail);

  if (daysUntilDeadline <= 0) {
    warnings.push("Response deadline has passed. Attorney consultation required immediately.");
  } else if (daysUntilDeadline < 15) {
    warnings.push("Response deadline is approaching. Expedite preparations immediately.");
  }

  criticalDeadlines.push({
    event: "Response to Notice of Deficiency",
    date: extraction.statutory_notice_deadline,
    days_remaining: Math.max(0, daysUntilDeadline),
  });

  // Tax Court jurisdiction check
  const taxCourtGuardrail: DeficiencyGuardrail = {
    id: "tax-court-petition",
    type: "tax-court-jurisdiction",
    description: DEFICIENCY_GUARDRAILS.TAX_COURT_JURISDICTION.description,
    triggered: daysUntilDeadline > 0 && daysUntilDeadline <= 90,
    message: `Tax Court petition deadline: ${extraction.statutory_notice_deadline}. Petition must be filed by this date to preserve jurisdiction.`,
  };
  guardrails.push(taxCourtGuardrail);

  if (daysUntilDeadline > 0 && daysUntilDeadline <= 90) {
    criticalDeadlines.push({
      event: "Tax Court Petition Filing Deadline",
      date: extraction.statutory_notice_deadline,
      days_remaining: daysUntilDeadline,
    });
    warnings.push("If considering Tax Court, petition must be filed by this deadline.");
  }

  // Fraud indicators check
  const fraudGuardrail: DeficiencyGuardrail = {
    id: "fraud-indicators",
    type: "fraud-detection",
    description: DEFICIENCY_GUARDRAILS.FRAUD_DETECTION.description,
    triggered: extraction.fraud_indicators.length > 0,
    message:
      extraction.fraud_indicators.length > 0
        ? `Fraud allegations detected: ${extraction.fraud_indicators.join(", ")}. Attorney consultation required.`
        : "No fraud allegations in notice.",
  };
  guardrails.push(fraudGuardrail);

  if (extraction.fraud_indicators.length > 0) {
    warnings.push("Notice contains fraud allegations. Do not respond without legal counsel.");
  }

  // Complexity and deficiency amount check
  const complexityGuardrail: DeficiencyGuardrail = {
    id: "case-complexity",
    type: "attorney-escalation",
    description: DEFICIENCY_GUARDRAILS.ATTORNEY_ESCALATION.description,
    triggered:
      extraction.notice_complexity === "complex" || extraction.deficiency_amount > 100000,
    message:
      extraction.notice_complexity === "complex" || extraction.deficiency_amount > 100000
        ? `Complex case with $${extraction.deficiency_amount.toLocaleString()} deficiency. Professional representation recommended.`
        : `Deficiency of $${extraction.deficiency_amount.toLocaleString()} is manageable in complexity.`,
  };
  guardrails.push(complexityGuardrail);

  if (extraction.notice_complexity === "complex" || extraction.deficiency_amount > 100000) {
    warnings.push("Substantial deficiency or complex adjustments warrant professional guidance.");
  }

  // Confidence level checks
  const lowConfidenceFields: string[] = [];

  if (extraction.notice_date_confidence < 0.95) {
    lowConfidenceFields.push(`notice date (${(extraction.notice_date_confidence * 100).toFixed(0)}%)`);
    assumptions_flagged.push(
      `[ASSUMPTION] Notice date confidence is ${(extraction.notice_date_confidence * 100).toFixed(0)}%. Verify: ${extraction.notice_date}`
    );
  }

  if (extraction.deficiency_confidence < 0.95) {
    lowConfidenceFields.push(`deficiency amount (${(extraction.deficiency_confidence * 100).toFixed(0)}%)`);
    assumptions_flagged.push(
      `[ASSUMPTION] Deficiency confidence is ${(extraction.deficiency_confidence * 100).toFixed(0)}%. Verify: $${extraction.deficiency_amount}`
    );
  }

  if (extraction.tax_year_confidence < 0.98) {
    lowConfidenceFields.push(`tax year (${(extraction.tax_year_confidence * 100).toFixed(0)}%)`);
    assumptions_flagged.push(
      `[ASSUMPTION] Tax year confidence is ${(extraction.tax_year_confidence * 100).toFixed(0)}%. Verify: ${extraction.tax_year}`
    );
  }

  if (extraction.deadline_confidence < 0.95) {
    lowConfidenceFields.push(`deadline (${(extraction.deadline_confidence * 100).toFixed(0)}%)`);
    assumptions_flagged.push(
      `[ASSUMPTION] Deadline confidence is ${(extraction.deadline_confidence * 100).toFixed(0)}%. Verify: ${extraction.statutory_notice_deadline}`
    );
  }

  if (lowConfidenceFields.length > 0) {
    warnings.push(
      `Low confidence extraction on: ${lowConfidenceFields.join(", ")}. Manually verify these critical values.`
    );
  }

  const assumptionGuardrail: DeficiencyGuardrail = {
    id: "low-confidence-fields",
    type: "assumption-flag",
    description: DEFICIENCY_GUARDRAILS.ASSUMPTION_FLAG.description,
    triggered: assumptions_flagged.length > 0,
    message:
      assumptions_flagged.length > 0
        ? `${assumptions_flagged.length} field(s) flagged. Verify before responding.`
        : "All critical fields extracted with high confidence.",
  };
  guardrails.push(assumptionGuardrail);

  // Joint return implications
  const jointReturnGuardrail: DeficiencyGuardrail = {
    id: "joint-return",
    type: "joint-return-rules" as any,
    description: "Joint return cases may have innocent spouse relief implications",
    triggered: extraction.is_joint_return,
    message: extraction.is_joint_return
      ? "This is a joint return. Innocent spouse relief may be available to eligible spouse."
      : "This is an individual return.",
  };
  guardrails.push(jointReturnGuardrail);

  const fraudRiskLevel = extractFraudRiskLevel(extraction);

  return {
    passed: daysUntilDeadline > 0 && warnings.length < 2,
    guardrails,
    warnings,
    assumptions_flagged,
    fraud_risk_level: fraudRiskLevel,
    critical_deadlines: criticalDeadlines,
  };
}

/**
 * Compliance check before sending response
 */
export function checkComplianceBeforeSending(
  document: GeneratedDocument,
  extraction: NoticeOfDeficiencyExtraction
): ComplianceCheckResult {
  const guardrails: DeficiencyGuardrail[] = [];
  const warnings: string[] = [];
  const assumptions_flagged: string[] = [];
  const criticalDeadlines: Array<{ event: string; date: string; days_remaining: number }> = [];

  // Verify document has required disclaimers
  const disclaimerGuardrail: DeficiencyGuardrail = {
    id: "legal-disclaimer",
    type: "no-fabricated-defenses",
    description: "Document must include legal disclaimer",
    triggered: !documentHasDisclaimer(document),
    message: documentHasDisclaimer(document)
      ? "Document includes appropriate legal disclaimers."
      : "WARNING: Document should include disclaimer that this is not legal advice.",
  };
  guardrails.push(disclaimerGuardrail);

  // Verify signature requirement
  const signatureGuardrail: DeficiencyGuardrail = {
    id: "signature-requirement",
    type: "attorney-escalation",
    description: "Response must be signed by taxpayer",
    triggered: document.requires_signature,
    message: document.requires_signature
      ? "Document requires taxpayer signature before submission to IRS."
      : "This document does not require a signature.",
  };
  guardrails.push(signatureGuardrail);

  // Check for unsubstantiated claims in disagreement documents
  if (
    document.type === "disagreement-response" ||
    document.type === "tax-court-petition"
  ) {
    const substantiationGuardrail: DeficiencyGuardrail = {
      id: "substantiation",
      type: "no-fabricated-defenses",
      description: "Tax positions must be substantiated",
      triggered: !documentHasSubstantiation(document),
      message: !documentHasSubstantiation(document)
        ? "Review document to ensure all positions are supported by evidence or legal authority."
        : "Document appears to reference supporting evidence and legal authority.",
    };
    guardrails.push(substantiationGuardrail);

    if (!documentHasSubstantiation(document)) {
      warnings.push(
        "Disagreement and Tax Court documents must reference specific evidence or legal authority."
      );
    }
  }

  // Verify statute citations in Tax Court petitions
  if (document.type === "tax-court-petition") {
    const statuteGuardrail: DeficiencyGuardrail = {
      id: "statute-citations",
      type: "tax-court-jurisdiction",
      description: "Tax Court petitions should reference IRC sections and authorities",
      triggered: documentHasStatuteCitations(document),
      message: documentHasStatuteCitations(document)
        ? "Petition includes statute and regulation citations. Verify accuracy."
        : "Consider adding IRC section references to strengthen Tax Court petition.",
    };
    guardrails.push(statuteGuardrail);
  }

  // Deadline check
  const now = new Date();
  const responseDeadline = new Date(extraction.statutory_notice_deadline);
  const daysUntilDeadline = Math.floor(
    (responseDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilDeadline < 0) {
    warnings.push("CRITICAL: Response deadline has passed. Do not submit without attorney guidance.");
  }

  criticalDeadlines.push({
    event: "Response Deadline",
    date: extraction.statutory_notice_deadline,
    days_remaining: Math.max(0, daysUntilDeadline),
  });

  const fraudRiskLevel = extractFraudRiskLevel(extraction);

  return {
    passed: daysUntilDeadline > 0 && warnings.length === 0,
    guardrails,
    warnings,
    assumptions_flagged,
    fraud_risk_level: fraudRiskLevel,
    critical_deadlines: criticalDeadlines,
  };
}

/**
 * Check if document includes required disclaimers
 */
function documentHasDisclaimer(document: GeneratedDocument): boolean {
  const disclaimerKeywords = [
    "not legal advice",
    "not a substitute",
    "consult",
    "attorney",
    "professional",
    "disclaimer",
  ];

  const content = `${document.content} ${document.markdown_content}`.toLowerCase();
  return disclaimerKeywords.some((keyword) => content.includes(keyword));
}

/**
 * Check if document references supporting evidence
 */
function documentHasSubstantiation(document: GeneratedDocument): boolean {
  const substantiationKeywords = [
    "evidence",
    "documentation",
    "supporting",
    "records",
    "irc",
    "regulation",
    "authority",
  ];

  const content = `${document.content} ${document.markdown_content}`.toLowerCase();
  return substantiationKeywords.some((keyword) => content.includes(keyword));
}

/**
 * Check if document includes statute citations
 */
function documentHasStatuteCitations(document: GeneratedDocument): boolean {
  const content = `${document.content} ${document.markdown_content}`;
  return /IRC|Tax Code|§ \d+|regulation/.test(content);
}

/**
 * Extract fraud risk level
 */
export function extractFraudRiskLevel(extraction: NoticeOfDeficiencyExtraction): number {
  let riskLevel = 0;

  if (extraction.fraud_indicators.length > 0) {
    riskLevel += 0.4; // +40% for fraud indicators
  }

  if (extraction.notice_complexity === "complex") {
    riskLevel += 0.1; // +10% for complexity
  }

  if (extraction.deficiency_amount > 100000) {
    riskLevel += 0.1; // +10% for large amounts
  }

  return Math.min(riskLevel, 1.0);
}
