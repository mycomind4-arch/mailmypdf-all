/**
 * Notice of Deficiency Classification Engine
 * Routes taxpayer through appropriate response path
 */

import type {
  DeficiencyIntakeConfirmation,
  DeficiencyClassificationRequest,
  DeficiencyClassificationResult,
  DeficiencyResponsePath,
  NoticeOfDeficiencyExtraction,
} from "./types";

/**
 * Hard-stop conditions for deficiency notices
 */
interface HardStopCondition {
  triggered: boolean;
  reason: string;
}

/**
 * Classify deficiency response and determine path
 */
export async function classifyDeficiencyResponse(
  request: DeficiencyClassificationRequest
): Promise<DeficiencyClassificationResult> {
  const {
    intake,
    taxpayer_agrees,
    has_evidence,
    deficiency_amount,
    can_pay_full,
    wants_tax_court,
    is_joint_return,
    hardship_situation,
    has_fraud_allegations,
  } = request;

  const extraction = intake.extraction;
  const now = new Date();
  const deadlineDate = new Date(extraction.statutory_notice_deadline);
  const daysUntilDeadline = Math.floor(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check hard-stop conditions
  const hardStops = checkHardStopConditions(extraction, daysUntilDeadline);

  if (hardStops.deadline_passed.triggered) {
    return {
      path: "escalate-attorney",
      confidence: 0.99,
      reasoning: hardStops.deadline_passed.reason,
      hard_stop: true,
      hard_stop_reason: hardStops.deadline_passed.reason,
      recommended_strategy:
        "The 90/150-day deadline has passed. An attorney may be able to file a late response or petition with reasonable cause documentation.",
      next_steps: [
        "Contact a tax attorney immediately",
        "Prepare reasonable cause documentation for late filing",
        "Determine if informal appeal rights still available",
        "Do not attempt to respond without professional help",
      ],
      risk_level: "critical",
      tax_court_deadline: extraction.statutory_notice_deadline,
      tax_court_filing_deadline_days: daysUntilDeadline,
      estimated_irs_response_time: "If late response accepted: 60-120 days",
      critical_warnings: ["DEADLINE PASSED - LEGAL CONSEQUENCES LIKELY"],
    };
  }

  if (hardStops.fraud_allegations.triggered) {
    return {
      path: "escalate-attorney",
      confidence: 0.99,
      reasoning: hardStops.fraud_allegations.reason,
      hard_stop: true,
      hard_stop_reason: hardStops.fraud_allegations.reason,
      recommended_strategy:
        "Fraud allegations warrant immediate professional representation. Do not respond without a tax attorney.",
      next_steps: [
        "Contact a tax attorney with fraud defense experience immediately",
        "DO NOT respond to the notice without counsel",
        "Prepare to discuss your involvement and position",
        "Understand that fraud carries criminal penalties",
      ],
      risk_level: "critical",
      tax_court_deadline: extraction.statutory_notice_deadline,
      tax_court_filing_deadline_days: daysUntilDeadline,
      estimated_irs_response_time: "Fraud cases: 12-36+ months",
      critical_warnings: ["FRAUD ALLEGATIONS - ATTORNEY REQUIRED IMMEDIATELY"],
    };
  }

  if (hardStops.critical_amount.triggered) {
    return {
      path: "escalate-attorney",
      confidence: 0.95,
      reasoning: hardStops.critical_amount.reason,
      hard_stop: true,
      hard_stop_reason: hardStops.critical_amount.reason,
      recommended_strategy:
        "The substantial deficiency amount warrants professional tax representation to evaluate all available options.",
      next_steps: [
        "Consult a CPA or tax attorney",
        "Evaluate Tax Court vs. Appeals vs. settlement options",
        "Prepare detailed position analysis",
        "Consider collection alternatives if unable to pay",
      ],
      risk_level: "high",
      tax_court_deadline: extraction.statutory_notice_deadline,
      tax_court_filing_deadline_days: daysUntilDeadline,
      estimated_irs_response_time: "Complex cases: 90-180 days",
      critical_warnings: [`High deficiency amount: $${deficiency_amount.toLocaleString()}`],
    };
  }

  // Route based on taxpayer circumstances
  if (taxpayer_agrees) {
    return classifyAggreePath(extraction, daysUntilDeadline, can_pay_full);
  }

  if (wants_tax_court && daysUntilDeadline > 15) {
    return classifyTaxCourtPath(extraction, daysUntilDeadline, deficiency_amount);
  }

  if (has_evidence && !taxpayer_agrees) {
    return classifyDisagreeAndPetitionPath(
      extraction,
      daysUntilDeadline,
      deficiency_amount,
      has_evidence
    );
  }

  if (hardship_situation && !can_pay_full) {
    return classifyCollectionAlternativePath(extraction, daysUntilDeadline, deficiency_amount);
  }

  if (is_joint_return && !taxpayer_agrees) {
    return classifyInnocentSpousePath(extraction, daysUntilDeadline);
  }

  // Default: disagreement without tax court
  return classifyDisagreeAndPetitionPath(
    extraction,
    daysUntilDeadline,
    deficiency_amount,
    has_evidence
  );
}

/**
 * Check for hard-stop conditions
 */
function checkHardStopConditions(
  extraction: NoticeOfDeficiencyExtraction,
  daysUntilDeadline: number
): Record<string, HardStopCondition> {
  return {
    deadline_passed: {
      triggered: daysUntilDeadline <= 0,
      reason: "The 90/150-day period to respond has expired.",
    },
    fraud_allegations: {
      triggered: extraction.fraud_indicators.length > 0,
      reason: `Notice contains fraud allegations: ${extraction.fraud_indicators.join(", ")}`,
    },
    critical_amount: {
      triggered: extraction.deficiency_amount > 100000,
      reason: `Deficiency amount of $${extraction.deficiency_amount.toLocaleString()} is substantial`,
    },
  };
}

/**
 * Classify agreement path
 */
function classifyAggreePath(
  extraction: NoticeOfDeficiencyExtraction,
  daysUntilDeadline: number,
  canPayFull: boolean
): DeficiencyClassificationResult {
  const totalDue = extraction.total_amount_due || extraction.deficiency_amount;

  return {
    path: "agree",
    confidence: 0.95,
    reasoning: "Taxpayer agrees with deficiency and will respond affirmatively.",
    hard_stop: false,
    recommended_strategy: canPayFull
      ? `You agree with the deficiency. Payment of $${totalDue.toLocaleString()} can be arranged.`
      : `You agree with the deficiency. A payment plan can be requested for $${totalDue.toLocaleString()}.`,
    next_steps: [
      "Prepare agreement response",
      canPayFull ? "Arrange full payment" : "Request installment agreement",
      "File Form 870 (Agreement) if IRS provides it",
      "Keep copies of all correspondence",
    ],
    risk_level: "low",
    tax_court_deadline: extraction.statutory_notice_deadline,
    tax_court_filing_deadline_days: daysUntilDeadline,
    estimated_irs_response_time: "Payment processing: 15-30 days",
    critical_warnings: [],
  };
}

/**
 * Classify disagreement with option to petition
 */
function classifyDisagreeAndPetitionPath(
  extraction: NoticeOfDeficiencyExtraction,
  daysUntilDeadline: number,
  deficiencyAmount: number,
  hasEvidence: boolean
): DeficiencyClassificationResult {
  const confidence = hasEvidence ? 0.85 : 0.72;

  return {
    path: "disagree-and-petition",
    confidence,
    reasoning: `Taxpayer disputes the deficiency of $${deficiencyAmount.toLocaleString()}${hasEvidence ? " with supporting evidence" : ""}`,
    hard_stop: false,
    recommended_strategy: hasEvidence
      ? "You have evidence to dispute the deficiency. Prepare a detailed response with legal and factual arguments."
      : "You dispute the deficiency. Gather supporting documentation and explain your position clearly.",
    next_steps: [
      "Prepare detailed written response",
      "Reference applicable tax law (IRC sections, regulations)",
      hasEvidence ? "Attach supporting documentation" : "Gather available records",
      "Consider requesting Appeals consideration",
      "File before Tax Court deadline if additional protection desired",
    ],
    risk_level: hasEvidence ? "low" : "medium",
    tax_court_deadline: extraction.statutory_notice_deadline,
    tax_court_filing_deadline_days: daysUntilDeadline,
    estimated_irs_response_time: "Appeals review: 60-120 days",
    critical_warnings:
      daysUntilDeadline < 30
        ? ["APPROACHING DEADLINE - Expedite response preparation"]
        : [],
  };
}

/**
 * Classify Tax Court petition path
 */
function classifyTaxCourtPath(
  extraction: NoticeOfDeficiencyExtraction,
  daysUntilDeadline: number,
  deficiencyAmount: number
): DeficiencyClassificationResult {
  return {
    path: "tax-court-petition",
    confidence: 0.88,
    reasoning: `Taxpayer elects Tax Court for independent judicial review of $${deficiencyAmount.toLocaleString()} deficiency`,
    hard_stop: false,
    recommended_strategy:
      "Tax Court provides independent review. A petition must be filed before the deadline. Consider professional representation.",
    next_steps: [
      "File Tax Court petition (Form 2) before deadline",
      "Include detailed statement of facts and legal position",
      "Strongly consider hiring a tax attorney",
      "Prepare evidence and documentation",
      "Understand Tax Court litigation process (6-36+ months)",
    ],
    risk_level: "medium",
    tax_court_deadline: extraction.statutory_notice_deadline,
    tax_court_filing_deadline_days: daysUntilDeadline,
    estimated_irs_response_time: "Tax Court litigation: 6-36+ months",
    critical_warnings: [
      `Tax Court petition deadline: ${extraction.statutory_notice_deadline}`,
      "Professional representation strongly recommended for Tax Court",
    ],
  };
}

/**
 * Classify payment plan path
 */
function classifyPaymentPlanPath(
  extraction: NoticeOfDeficiencyExtraction,
  daysUntilDeadline: number,
  deficiencyAmount: number
): DeficiencyClassificationResult {
  return {
    path: "payment-plan",
    confidence: 0.9,
    reasoning: `Taxpayer seeks payment plan for $${deficiencyAmount.toLocaleString()} deficiency`,
    hard_stop: false,
    recommended_strategy:
      "A payment plan (installment agreement) allows paying the deficiency over time. Interest and penalties continue to accrue.",
    next_steps: [
      "Request installment agreement",
      "Propose monthly payment amount and duration",
      "Prepare financial documentation",
      "Understand that interest and penalties continue accruing",
      "Respond to notice with agreement to payment plan",
    ],
    risk_level: "medium",
    tax_court_deadline: extraction.statutory_notice_deadline,
    tax_court_filing_deadline_days: daysUntilDeadline,
    estimated_irs_response_time: "Payment plan setup: 20-30 days",
    critical_warnings: [
      "Interest and penalties continue to accrue during payment plan",
      "Payment plan terms typically 3-6 years",
    ],
  };
}

/**
 * Classify collection alternative path
 */
function classifyCollectionAlternativePath(
  extraction: NoticeOfDeficiencyExtraction,
  daysUntilDeadline: number,
  deficiencyAmount: number
): DeficiencyClassificationResult {
  return {
    path: "collection-alternative",
    confidence: 0.85,
    reasoning: `Taxpayer faces hardship with $${deficiencyAmount.toLocaleString()} deficiency and needs collection alternatives`,
    hard_stop: false,
    recommended_strategy:
      "If payment creates financial hardship, explore options like Currently Not Collectible status, Offer in Compromise, or collection alternatives.",
    next_steps: [
      "Document financial hardship",
      "Request Currently Not Collectible (CNC) status if appropriate",
      "Evaluate Offer in Compromise (OIC) feasibility",
      "Prepare financial statement",
      "Discuss collection alternatives with IRS",
    ],
    risk_level: "high",
    tax_court_deadline: extraction.statutory_notice_deadline,
    tax_court_filing_deadline_days: daysUntilDeadline,
    estimated_irs_response_time: "Hardship review: 30-60 days",
    critical_warnings: [
      "Levy and lien actions possible if collection alternative denied",
      "CNC status still accrues interest and penalties",
    ],
  };
}

/**
 * Classify innocent spouse path
 */
function classifyInnocentSpousePath(
  extraction: NoticeOfDeficiencyExtraction,
  daysUntilDeadline: number
): DeficiencyClassificationResult {
  return {
    path: "innocent-spouse",
    confidence: 0.82,
    reasoning:
      "Joint return taxpayer may qualify for innocent spouse relief if not responsible for the deficiency",
    hard_stop: false,
    recommended_strategy:
      "If you filed jointly but were not responsible for the deficiency, you may qualify for innocent spouse relief under IRC § 6015.",
    next_steps: [
      "Determine if innocent spouse relief available",
      "File Form 8857 with IRS",
      "Explain why you should not be liable",
      "Gather documentation of relationship and finances",
      "Understand innocent spouse relief procedures",
    ],
    risk_level: "medium",
    tax_court_deadline: extraction.statutory_notice_deadline,
    tax_court_filing_deadline_days: daysUntilDeadline,
    estimated_irs_response_time: "Innocent spouse determination: 90-180 days",
    critical_warnings: [
      "Innocent spouse claims have specific eligibility requirements",
      "Consider professional representation for claims",
    ],
  };
}
