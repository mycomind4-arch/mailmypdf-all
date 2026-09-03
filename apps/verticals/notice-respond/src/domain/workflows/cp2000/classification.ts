/**
 * CP2000 Classification Engine
 * Routes taxpayer through appropriate response path based on situation
 */

import type {
  CP2000IntakeConfirmation,
  CP2000ClassificationRequest,
  CP2000ClassificationResult,
  CP2000ResponsePath,
} from "./types";

/**
 * Hard-stop conditions that mandate attorney escalation
 */
interface HardStopCondition {
  triggered: boolean;
  reason: string;
}

/**
 * Classify CP2000 response and determine recommended path
 */
export async function classifyCP2000Response(
  request: CP2000ClassificationRequest
): Promise<CP2000ClassificationResult> {
  const {
    intake,
    agree_with_all,
    has_supporting_evidence,
    adjustment_amount,
    has_penalties,
    wants_appeal,
    needs_extension,
    prior_audit,
    criminal_record,
  } = request;

  const extraction = intake.extraction;

  // Check hard-stop conditions first
  const hardStops = checkHardStopConditions(extraction, criminal_record);
  if (hardStops.deadline_passed.triggered) {
    return {
      path: "escalate-attorney",
      confidence: 0.99,
      reasoning: hardStops.deadline_passed.reason,
      hard_stop: true,
      hard_stop_reason: hardStops.deadline_passed.reason,
      recommended_strategy:
        "Contact a tax attorney immediately. The deadline to respond has passed. An attorney may be able to file a late response with reasonable cause.",
      next_steps: [
        "Contact a qualified tax attorney or CPA",
        "Prepare documentation of any reasonable cause for late response",
        "Gather copies of prior correspondence with IRS",
        "Do not attempt to respond without professional help",
      ],
      risk_level: "high",
      estimated_irs_response_time: "If late response accepted: 30-90 days",
    };
  }

  if (hardStops.criminal_references.triggered) {
    return {
      path: "escalate-attorney",
      confidence: 0.99,
      reasoning: hardStops.criminal_references.reason,
      hard_stop: true,
      hard_stop_reason: hardStops.criminal_references.reason,
      recommended_strategy:
        "This notice references criminal investigation or fraud allegations. You must consult a tax attorney immediately before responding.",
      next_steps: [
        "DO NOT respond to the notice without legal counsel",
        "Contact a tax attorney or CPA with criminal tax experience",
        "You may have the right to refuse to answer questions",
        "Prepare to discuss your involvement with law enforcement, if any",
      ],
      risk_level: "high",
      estimated_irs_response_time: "Criminal cases: 12-36+ months",
    };
  }

  if (hardStops.fraud_indicators.triggered) {
    return {
      path: "escalate-attorney",
      confidence: 0.95,
      reasoning: hardStops.fraud_indicators.reason,
      hard_stop: true,
      hard_stop_reason: hardStops.fraud_indicators.reason,
      recommended_strategy:
        "The IRS has indicated potential fraud concerns. This requires immediate professional representation.",
      next_steps: [
        "Consult a tax attorney immediately",
        "Gather evidence of legitimate business/deduction purposes",
        "Do not destroy any documents",
        "Be prepared to provide detailed explanations of deductions",
      ],
      risk_level: "high",
      estimated_irs_response_time: "Fraud investigations: 18-48+ months",
    };
  }

  if (hardStops.complex_situation.triggered) {
    return {
      path: "escalate-attorney",
      confidence: 0.9,
      reasoning: hardStops.complex_situation.reason,
      hard_stop: true,
      hard_stop_reason: hardStops.complex_situation.reason,
      recommended_strategy:
        "The complexity of your situation warrants professional tax representation to ensure optimal outcome.",
      next_steps: [
        "Schedule consultation with a tax attorney or CPA",
        "Gather all supporting documentation",
        "Prepare detailed explanation of positions",
        "Consider hiring professional representation immediately",
      ],
      risk_level: "high",
      estimated_irs_response_time: "Complex cases: 60-120 days",
    };
  }

  // Route based on taxpayer agreement and preferences
  if (agree_with_all) {
    return classifyAgreePath(extraction, prior_audit);
  }

  if (wants_appeal) {
    return classifyAppealPath(extraction, adjustment_amount, has_penalties);
  }

  if (needs_extension) {
    return classifyExtensionPath(extraction, adjustment_amount);
  }

  if (!has_supporting_evidence) {
    return classifyDisagreePath(extraction, adjustment_amount, false);
  }

  // Has evidence to dispute some items
  if (adjustment_amount > 10000) {
    return classifyPartialDisagreePath(extraction, adjustment_amount, has_supporting_evidence);
  }

  // Smaller amount, has evidence to contest
  return classifyDisagreePath(extraction, adjustment_amount, has_supporting_evidence);
}

/**
 * Check for hard-stop conditions that require attorney escalation
 */
function checkHardStopConditions(
  extraction: CP2000ClassificationRequest["intake"]["extraction"],
  criminal_record?: boolean
): Record<string, HardStopCondition> {
  const now = new Date();
  const deadline = new Date(extraction.deadline_date);

  return {
    deadline_passed: {
      triggered: now > deadline,
      reason: `Deadline to respond has passed (was ${extraction.deadline_date}). You may have limited options for filing a late response.`,
    },
    criminal_references: {
      triggered:
        extraction.fraud_indicators.some(
          (f) => f.toLowerCase().includes("criminal") || f.toLowerCase().includes("fraud")
        ) || criminal_record === true,
      reason: "Notice references criminal investigation or you have a criminal record. Attorney consultation required.",
    },
    fraud_indicators: {
      triggered: extraction.fraud_indicators.length > 0,
      reason: `Notice contains fraud indicators: ${extraction.fraud_indicators.join(", ")}. This requires legal representation.`,
    },
    complex_situation: {
      triggered: extraction.notice_complexity === "complex",
      reason: "IRS has determined this is a complex examination. Professional representation is strongly recommended.",
    },
  };
}

/**
 * Classify agreement path
 * Taxpayer agrees with all proposed adjustments
 */
function classifyAgreePath(
  extraction: CP2000ClassificationRequest["intake"]["extraction"],
  prior_audit?: boolean
): CP2000ClassificationResult {
  const totalTax = extraction.total_additional_tax || 0;
  const totalPenalty = extraction.proposed_penalty_amount || 0;
  const totalOwed = totalTax + totalPenalty;

  let strategy = "You agree with the IRS adjustment(s). ";

  if (totalOwed > 50000) {
    strategy +=
      "Given the substantial amount owed, consider consulting with a CPA about payment plans and estimated tax adjustments for future years.";
  } else if (totalOwed > 10000) {
    strategy +=
      "Before paying, verify your current tax filing status and consider whether to claim a loss carryback if applicable.";
  } else {
    strategy +=
      "Payment can typically be made online, by phone, or by mail. IRS will provide payment instructions in the notice.";
  }

  return {
    path: "agree",
    confidence: 0.95,
    reasoning: "Taxpayer agrees with all proposed adjustments and is ready to respond affirmatively.",
    hard_stop: false,
    recommended_strategy: strategy,
    next_steps: [
      "Prepare the agreement response letter",
      "Review payment options (installment agreement if needed)",
      "Mail or electronically file the response by deadline",
      "Keep copies of all correspondence",
      "If significant amount owed, consider consulting CPA about future estimated taxes",
    ],
    risk_level: prior_audit ? "medium" : "low",
    estimated_irs_response_time: "Payment processing: 10-30 days",
  };
}

/**
 * Classify disagreement path
 * Taxpayer disagrees with adjustments and has/lacks evidence
 */
function classifyDisagreePath(
  extraction: CP2000ClassificationRequest["intake"]["extraction"],
  adjustment_amount: number,
  has_evidence: boolean
): CP2000ClassificationResult {
  const confidence = has_evidence ? 0.85 : 0.7;
  const strategy = has_evidence
    ? "You have supporting evidence for your position. Document all facts and submit with your response."
    : "You will need to explain your position clearly. Consider gathering supporting documentation.";

  return {
    path: "disagree",
    confidence,
    reasoning: `Taxpayer disagrees with adjustments of $${adjustment_amount.toLocaleString()}${has_evidence ? " and has supporting evidence" : ""}`,
    hard_stop: false,
    recommended_strategy: strategy,
    next_steps: [
      "Prepare detailed explanation of your position",
      has_evidence ? "Gather all supporting documentation" : "Identify what records you can locate",
      "Reference applicable tax law or regulation",
      "Draft disagreement response letter",
      "Consider consulting a tax professional if amount is substantial",
      "Mail response by deadline with proof of delivery",
    ],
    risk_level: has_evidence ? "low" : "medium",
    estimated_irs_response_time: "Review and response: 30-60 days",
  };
}

/**
 * Classify partial disagreement path
 * Taxpayer agrees with some items, disagrees with others
 */
function classifyPartialDisagreePath(
  extraction: CP2000ClassificationRequest["intake"]["extraction"],
  disputed_amount: number,
  has_evidence: boolean
): CP2000ClassificationResult {
  return {
    path: "partial",
    confidence: 0.8,
    reasoning: `Taxpayer agrees with some adjustments but disputes ${disputed_amount} in proposed changes. Strategic response needed.`,
    hard_stop: false,
    recommended_strategy:
      "Conceding minor items may help strengthen your position on disputed items. Focus evidence and arguments on the largest disagreements.",
    next_steps: [
      "Separate agreed and disputed adjustments",
      "Prioritize evidence on largest disputed amounts",
      "Structure response to highlight agreements first",
      "Clearly identify each disputed item with supporting facts",
      "Consider consulting tax professional for strategy",
      "Mail response showing which items you accept and which you dispute",
    ],
    risk_level: "medium",
    estimated_irs_response_time: "Review and response: 45-90 days",
  };
}

/**
 * Classify appeal path
 * Taxpayer wants to request administrative appeal
 */
function classifyAppealPath(
  extraction: CP2000ClassificationRequest["intake"]["extraction"],
  adjustment_amount: number,
  has_penalties: boolean
): CP2000ClassificationResult {
  return {
    path: "appeal",
    confidence: 0.82,
    reasoning: `Taxpayer wishes to request Independent Office of Appeals review of adjustments totaling $${adjustment_amount.toLocaleString()}${has_penalties ? " plus penalties" : ""}`,
    hard_stop: false,
    recommended_strategy:
      "You have the right to appeal to the independent Office of Appeals. This is a formal administrative process that can take 6-18 months but provides independent review.",
    next_steps: [
      "Determine if you want to dispute before or after Appeals",
      "Request independent Office of Appeals consideration",
      "Prepare detailed Statement of Disagreement (SOD) with legal arguments",
      "Gather all supporting documentation",
      "Consider hiring tax attorney for complex cases",
      "Submit appeal request before deadline",
    ],
    risk_level: "medium",
    estimated_irs_response_time: "Appeals process: 6-18 months",
  };
}

/**
 * Classify extension path
 * Taxpayer needs more time to gather evidence/consult professional
 */
function classifyExtensionPath(
  extraction: CP2000ClassificationRequest["intake"]["extraction"],
  adjustment_amount: number
): CP2000ClassificationResult {
  return {
    path: "extension",
    confidence: 0.88,
    reasoning: `Taxpayer requests extension to prepare response to adjustments of $${adjustment_amount.toLocaleString()}`,
    hard_stop: false,
    recommended_strategy:
      "Requesting an extension is appropriate if you need time to gather records or consult a professional. The IRS typically grants extensions for reasonable cause.",
    next_steps: [
      "Determine how much additional time you need",
      "Prepare extension request letter explaining reason (business records, professional consultation, etc.)",
      "Mail extension request before original deadline",
      "IRS will respond with decision on extension",
      "Use extension period to gather evidence and prepare thorough response",
      "File final response before extended deadline",
    ],
    risk_level: "low",
    estimated_irs_response_time: "Extension decision: 10-20 days",
  };
}

/**
 * Generate explanation of classification confidence
 */
export function explainClassificationConfidence(
  path: CP2000ResponsePath,
  confidence: number
): string {
  if (confidence >= 0.9) {
    return "High confidence - situation is clear";
  }
  if (confidence >= 0.8) {
    return "Good confidence - recommendation is sound";
  }
  if (confidence >= 0.7) {
    return "Moderate confidence - professional review recommended";
  }
  return "Lower confidence - strongly consider professional consultation";
}

/**
 * Get human-readable description of response path
 */
export function getPathDescription(path: CP2000ResponsePath): string {
  const descriptions: Record<CP2000ResponsePath, string> = {
    agree: "Agree with all adjustments and pay any amounts owed",
    disagree: "Dispute the adjustments with supporting evidence or explanation",
    partial: "Agree with some adjustments, dispute others",
    appeal: "Request independent administrative appeal review",
    extension: "Request additional time to prepare response",
    "escalate-attorney": "Escalate to tax attorney for legal representation",
  };

  return descriptions[path];
}
