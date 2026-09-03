/**
 * CP2000 Guardrails & Compliance
 * Ensures legal and ethical standards in IRS notice responses
 */

import type {
  CP2000NoticeExtraction,
  CP2000Guardrail,
  ComplianceCheckResult,
  GeneratedDocument,
} from "./types";

/**
 * Six Core Guardrails for CP2000 Responses
 */
const CP2000_GUARDRAILS = {
  NO_UNSUBSTANTIATED_CLAIMS: {
    type: "no-unsubstantiated-claims" as const,
    description: "All claims must be substantiated by evidence or documentation",
    message:
      "Only assert facts you can support with documentation. Do not make unsupported claims about deductions or income.",
  },
  NO_FRAUD_ACCUSATIONS: {
    type: "no-fraud-accusations" as const,
    description: "Do not accuse IRS of fraud or bad faith without legal grounds",
    message: "Do not make accusations against the IRS. Focus on the merits of your position.",
  },
  TAX_LAW_COMPLIANCE: {
    type: "tax-law-compliance" as const,
    description: "All positions must reference applicable tax law (IRC sections, Treasury Regs, case law)",
    message:
      "Cite specific tax law authorities (IRC sections, Treasury Regulations, court cases) to support your position.",
  },
  PROFESSIONAL_ESCALATION: {
    type: "professional-escalation" as const,
    description: "Complex or high-risk cases must be escalated to tax professionals",
    message:
      "This case warrants professional representation. Consult with a CPA or tax attorney.",
  },
  ASSUMPTION_FLAG: {
    type: "assumption-flag" as const,
    description: "Flag uncertain or unverified extraction data",
    message:
      "[ASSUMPTION] This field has low confidence. Verify this information is accurate before submitting response.",
  },
  STATUTE_VERIFICATION: {
    type: "statute-verification" as const,
    description: "Verify all statute and regulation citations are current and accurate",
    message: "Ensure all cited authorities are current and applicable to your tax year.",
  },
};

/**
 * Compliance check after classification
 * Validates guardrails before allowing document generation
 */
export function checkComplianceAfterClassification(
  extraction: CP2000NoticeExtraction,
  classification_path: string
): ComplianceCheckResult {
  const guardrails: CP2000Guardrail[] = [];
  const warnings: string[] = [];
  const assumptions_flagged: string[] = [];

  // Check for fraud indicators
  const fraudGuardrail: CP2000Guardrail = {
    id: "fraud-indicators",
    type: "professional-escalation",
    description: CP2000_GUARDRAILS.PROFESSIONAL_ESCALATION.description,
    triggered: extraction.fraud_indicators.length > 0,
    message: extraction.fraud_indicators.length > 0
      ? `Fraud indicators detected: ${extraction.fraud_indicators.join(", ")}. Professional representation strongly recommended.`
      : CP2000_GUARDRAILS.PROFESSIONAL_ESCALATION.message,
  };
  guardrails.push(fraudGuardrail);

  if (extraction.fraud_indicators.length > 0) {
    warnings.push("Notice contains fraud-related language or allegations.");
  }

  // Check complexity level
  const complexityGuardrail: CP2000Guardrail = {
    id: "complexity-assessment",
    type: "professional-escalation",
    description: "Complex cases require professional representation",
    triggered: extraction.notice_complexity === "complex",
    message:
      extraction.notice_complexity === "complex"
        ? "IRS has determined this is a complex examination. Professional representation is essential."
        : "Notice is relatively straightforward in complexity.",
  };
  guardrails.push(complexityGuardrail);

  if (extraction.notice_complexity === "complex") {
    warnings.push("This is a complex examination requiring professional guidance.");
  }

  // Check confidence levels
  const lowConfidenceFields: string[] = [];

  if (extraction.deadline_confidence < 0.9) {
    lowConfidenceFields.push(`deadline (${(extraction.deadline_confidence * 100).toFixed(0)}%)`);
    assumptions_flagged.push(
      `[ASSUMPTION] Deadline extraction confidence is ${(extraction.deadline_confidence * 100).toFixed(0)}%. Verify deadline is correct: ${extraction.deadline_date}`
    );
  }

  if (extraction.tax_year_confidence < 0.95) {
    lowConfidenceFields.push(`tax year (${(extraction.tax_year_confidence * 100).toFixed(0)}%)`);
    assumptions_flagged.push(
      `[ASSUMPTION] Tax year extraction confidence is ${(extraction.tax_year_confidence * 100).toFixed(0)}%. Verify tax year is correct: ${extraction.tax_year}`
    );
  }

  if (extraction.adjustments_confidence < 0.85) {
    lowConfidenceFields.push(
      `proposed adjustments (${(extraction.adjustments_confidence * 100).toFixed(0)}%)`
    );
    assumptions_flagged.push(
      `[ASSUMPTION] Adjustment confidence is ${(extraction.adjustments_confidence * 100).toFixed(0)}%. Review each adjustment carefully before responding.`
    );
  }

  if (lowConfidenceFields.length > 0) {
    warnings.push(
      `Low confidence extraction on: ${lowConfidenceFields.join(", ")}. Manually verify these values.`
    );
  }

  const assumptionGuardrail: CP2000Guardrail = {
    id: "low-confidence-flags",
    type: "assumption-flag",
    description: CP2000_GUARDRAILS.ASSUMPTION_FLAG.description,
    triggered: assumptions_flagged.length > 0,
    message:
      assumptions_flagged.length > 0
        ? `${assumptions_flagged.length} assumption(s) flagged. Review carefully.`
        : "All key fields extracted with high confidence.",
  };
  guardrails.push(assumptionGuardrail);

  // Check for penalty amounts (should be verified)
  const penaltyGuardrail: CP2000Guardrail = {
    id: "penalty-verification",
    type: "assumption-flag",
    description: "Verify accuracy of penalty calculations",
    triggered: (extraction.proposed_penalty_amount || 0) > 0,
    message:
      extraction.proposed_penalty_amount && extraction.proposed_penalty_amount > 0
        ? `Proposed penalty of $${extraction.proposed_penalty_amount.toLocaleString()} should be reviewed. Accuracy-related penalties are 20% of underpayment.`
        : "No penalties indicated.",
  };
  guardrails.push(penaltyGuardrail);

  // Check for outside US implications
  const jurisdictionGuardrail: CP2000Guardrail = {
    id: "jurisdiction-implications",
    type: "tax-law-compliance",
    description: "Verify jurisdiction-specific tax law applies",
    triggered: extraction.is_outside_us_flag,
    message: extraction.is_outside_us_flag
      ? "As a taxpayer outside the US, additional deadlines (60 days) and foreign earned income exclusion rules may apply."
      : "Standard domestic IRS procedures apply.",
  };
  guardrails.push(jurisdictionGuardrail);

  // Determine compliance status
  const hasSeriosWarnings = warnings.length > 0 || lowConfidenceFields.length > 0;
  const fraudRiskLevel = extractFraudRiskLevel(extraction);

  return {
    passed: !hasSeriosWarnings || classification_path === "escalate-attorney",
    guardrails,
    warnings,
    assumptions_flagged,
    fraud_risk_level: fraudRiskLevel,
  };
}

/**
 * Compliance check before sending response
 * Final validation before user submits to IRS
 */
export function checkComplianceBeforeSending(
  document: GeneratedDocument,
  extraction: CP2000NoticeExtraction
): ComplianceCheckResult {
  const guardrails: CP2000Guardrail[] = [];
  const warnings: string[] = [];
  const assumptions_flagged: string[] = [];

  // Verify document has required disclaimers
  const disclaimerGuardrail: CP2000Guardrail = {
    id: "legal-disclaimer",
    type: "tax-law-compliance",
    description: "Document must include legal disclaimer",
    triggered: !documentHasDisclaimer(document),
    message: documentHasDisclaimer(document)
      ? "Document includes required legal disclaimer."
      : "WARNING: Document should include disclaimer that this is not legal advice.",
  };
  guardrails.push(disclaimerGuardrail);

  if (!documentHasDisclaimer(document)) {
    warnings.push("Document should include a legal disclaimer.");
  }

  // Verify required signature fields if needed
  const signatureGuardrail: CP2000Guardrail = {
    id: "signature-requirement",
    type: "professional-escalation",
    description: "Response letter must be signed by taxpayer",
    triggered: document.requires_signature,
    message: document.requires_signature
      ? "Document requires taxpayer signature before submission to IRS."
      : "This document does not require a signature.",
  };
  guardrails.push(signatureGuardrail);

  // Check for unsubstantiated claims in disagreement documents
  if (
    document.type === "disagreement-letter" ||
    document.type === "partial-agreement-letter"
  ) {
    const unsubstantiatedGuardrail: CP2000Guardrail = {
      id: "substantiation-check",
      type: "no-unsubstantiated-claims",
      description: "All claims must be substantiated",
      triggered: !documentHasSubstantiation(document),
      message: !documentHasSubstantiation(document)
        ? "Review document to ensure all claims are supported by evidence."
        : "Document appears to reference supporting evidence.",
    };
    guardrails.push(unsubstantiatedGuardrail);

    if (!documentHasSubstantiation(document)) {
      warnings.push(
        "Disagreement documents should reference specific evidence or documentation supporting your position."
      );
    }
  }

  // Verify statute citations if present
  const statuteGuardrail: CP2000Guardrail = {
    id: "statute-citation",
    type: "statute-verification",
    description: "Statute citations should be verified",
    triggered: documentHasStatuteCitations(document),
    message: documentHasStatuteCitations(document)
      ? "Verify all statute and regulation citations are current and correctly formatted."
      : "Consider adding applicable statute references to strengthen your position.",
  };
  guardrails.push(statuteGuardrail);

  // Final fraud risk assessment
  const fraudGuardrail: CP2000Guardrail = {
    id: "fraud-risk-final",
    type: "professional-escalation",
    description: "Final fraud risk assessment",
    triggered: extractFraudRiskLevel(extraction) > 0.5,
    message:
      extractFraudRiskLevel(extraction) > 0.5
        ? `Fraud risk level: ${(extractFraudRiskLevel(extraction) * 100).toFixed(0)}%. Strongly consider professional representation before submitting.`
        : "Fraud risk appears to be low.",
  };
  guardrails.push(fraudGuardrail);

  const fraudRiskLevel = extractFraudRiskLevel(extraction);

  return {
    passed: warnings.length === 0,
    guardrails,
    warnings,
    assumptions_flagged,
    fraud_risk_level: fraudRiskLevel,
  };
}

/**
 * Flag an assumption with urgency level
 */
export function flagAssumption(
  field: string,
  value: unknown,
  confidence: number,
  urgency: "info" | "warning" | "critical" = "warning"
): string {
  const confidencePercent = (confidence * 100).toFixed(0);
  const urgencyPrefix = urgency === "critical" ? "🚨 CRITICAL" : urgency === "warning" ? "⚠️ WARNING" : "ℹ️ INFO";

  return `${urgencyPrefix}: [ASSUMPTION] Field '${field}' has ${confidencePercent}% confidence. Extracted value: ${JSON.stringify(value)}. Verify accuracy before using.`;
}

/**
 * Verify statute citations are valid
 */
export function verifyStatutes(
  document: GeneratedDocument
): Array<{ statute: string; valid: boolean; notes: string }> {
  const commonStatutes = [
    { pattern: /IRC §? ?\d+[a-zA-Z]?/g, category: "IRC" },
    { pattern: /Treas\.? ?Reg\.? ?§? ?1\.\d+/g, category: "Treasury Regulation" },
    { pattern: /U\.S\.C\.? ?\d+/g, category: "US Code" },
  ];

  const citations: Array<{ statute: string; valid: boolean; notes: string }> = [];

  for (const statute of commonStatutes) {
    const matches = document.content.match(statute.pattern) || [];
    for (const match of matches) {
      citations.push({
        statute: match,
        valid: true, // In production, would verify against actual tax code
        notes: `${statute.category} citation found`,
      });
    }
  }

  return citations;
}

/**
 * Check if document includes required disclaimers
 */
function documentHasDisclaimer(document: GeneratedDocument): boolean {
  const disclaimerKeywords = [
    "not legal advice",
    "not a substitute for",
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
    "proof",
    "documents",
    "files",
    "receipts",
  ];

  const content = `${document.content} ${document.markdown_content}`.toLowerCase();

  return substantiationKeywords.some((keyword) => content.includes(keyword));
}

/**
 * Check if document includes statute citations
 */
function documentHasStatuteCitations(document: GeneratedDocument): boolean {
  const content = `${document.content} ${document.markdown_content}`;
  return /IRC §|Treas\.? ?Reg\.|Treasury Regulation/.test(content);
}

/**
 * Extract fraud risk level from extraction confidence and indicators
 */
export function extractFraudRiskLevel(extraction: CP2000NoticeExtraction): number {
  let riskLevel = 0;

  // Base risk on fraud indicators
  if (extraction.fraud_indicators.length > 0) {
    riskLevel += 0.3; // +30% for each fraud indicator type
  }

  // Increase risk if notice complexity is high
  if (extraction.notice_complexity === "complex") {
    riskLevel += 0.1; // +10%
  }

  // Increase risk if adjustment is substantial
  if ((extraction.total_additional_tax || 0) > 50000) {
    riskLevel += 0.1; // +10%
  }

  // Cap at 1.0
  return Math.min(riskLevel, 1.0);
}

/**
 * Detailed compliance report for user review
 */
export function generateComplianceReport(
  extraction: CP2000NoticeExtraction,
  classification_path: string,
  document?: GeneratedDocument
): string {
  const preclassificationCheck = checkComplianceAfterClassification(extraction, classification_path);
  const presubmissionCheck = document
    ? checkComplianceBeforeSending(document, extraction)
    : null;

  let report = `# CP2000 Compliance Review

**Generated:** ${new Date().toISOString()}

## Extraction Assessment

**Notice Number:** ${extraction.notice_number}
**Tax Year:** ${extraction.tax_year}
**Taxpayer:** ${extraction.taxpayer_name}

### Confidence Levels
- Deadline: ${(extraction.deadline_confidence * 100).toFixed(0)}%
- Tax Year: ${(extraction.tax_year_confidence * 100).toFixed(0)}%
- Adjustments: ${(extraction.adjustments_confidence * 100).toFixed(0)}%

### Flags
${preclassificationCheck.assumptions_flagged.map((f) => `- ${f}`).join("\n")}

## Compliance Findings

### Guardrails Status
${preclassificationCheck.guardrails
  .map(
    (g) => `- **${g.id}**: ${g.triggered ? "⚠️ TRIGGERED" : "✓ OK"}\n  ${g.message}`
  )
  .join("\n")}

### Warnings
${preclassificationCheck.warnings.length > 0 ? preclassificationCheck.warnings.map((w) => `- ${w}`).join("\n") : "No warnings"}

### Fraud Risk Level
${(preclassificationCheck.fraud_risk_level * 100).toFixed(0)}% ${
    preclassificationCheck.fraud_risk_level > 0.5
      ? "🚨 HIGH RISK - Professional representation recommended"
      : preclassificationCheck.fraud_risk_level > 0.3
        ? "⚠️ MEDIUM RISK - Consider professional guidance"
        : "✓ LOW RISK"
  }

${
  presubmissionCheck
    ? `## Pre-Submission Compliance

### Document Verification
${presubmissionCheck.guardrails
  .map(
    (g) => `- **${g.id}**: ${g.triggered ? "⚠️ NEEDS REVIEW" : "✓ OK"}\n  ${g.message}`
  )
  .join("\n")}

### Final Warnings
${presubmissionCheck.warnings.length > 0 ? presubmissionCheck.warnings.map((w) => `- ${w}`).join("\n") : "Ready for submission"}
`
    : ""
}

## Recommendation

${
  preclassificationCheck.fraud_risk_level > 0.5
    ? "🚨 **STRONGLY RECOMMEND PROFESSIONAL REPRESENTATION** - Do not submit without consulting a tax attorney."
    : "✓ Proceeding with response is reasonable, but consider professional review for significant amounts."
}
`;

  return report;
}
