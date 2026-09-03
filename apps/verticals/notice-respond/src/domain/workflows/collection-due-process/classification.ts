/**
 * Collection Due Process (CDP) Classification Engine
 * Routes taxpayer through appropriate levy prevention strategy
 */

import type {
  CDPIntakeConfirmation,
  CDPClassificationRequest,
  CDPClassificationResult,
  CDPResponsePath,
  CDPNoticeExtraction,
} from "./types";
import { assessLevyRisk, estimateLevyTimeline } from "./extraction";

/**
 * Hard-stop conditions for CDP notices
 */
interface HardStopCondition {
  triggered: boolean;
  reason: string;
}

/**
 * Classify CDP response and determine levy prevention path
 */
export async function classifyCDPResponse(
  request: CDPClassificationRequest
): Promise<CDPClassificationResult> {
  const {
    intake,
    can_pay_full,
    can_pay_partial,
    payment_capability,
    financial_hardship,
    disputes_liability,
    has_prior_cdp,
    in_bankruptcy,
    bankruptcy_chapter,
    has_valid_defense,
    employer_status,
  } = request;

  const extraction = intake.extraction;
  const now = new Date();
  const deadline = new Date(extraction.response_deadline);
  const daysUntilDeadline = Math.floor(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check hard-stop conditions
  const hardStops = checkHardStopConditions(
    extraction,
    daysUntilDeadline,
    in_bankruptcy
  );

  if (hardStops.deadline_passed.triggered) {
    return {
      path: "escalate-attorney",
      confidence: 0.99,
      reasoning: hardStops.deadline_passed.reason,
      hard_stop: true,
      hard_stop_reason: hardStops.deadline_passed.reason,
      recommended_strategy:
        "The 30-day CDP response deadline has passed. Immediate attorney consultation required to prevent levy.",
      next_steps: [
        "Contact a tax attorney or CPA immediately",
        "Request emergency stay of collection actions",
        "Prepare reasonable cause documentation",
        "Understand levy prevention options",
      ],
      risk_level: "critical",
      levy_threat_level: "imminent",
      estimated_levy_timeline: "Days to weeks",
      estimated_irs_response_time: "Immediate (if responds)",
      critical_warnings: ["DEADLINE PASSED - LEVY MAY OCCUR IMMEDIATELY"],
      levy_prevention_strategies: [
        "Emergency attorney response",
        "Bankruptcy filing consideration",
        "Asset protection measures",
      ],
    };
  }

  if (hardStops.bankruptcy_automatic_stay.triggered) {
    return {
      path: "bankruptcy-protection",
      confidence: 0.95,
      reasoning: hardStops.bankruptcy_automatic_stay.reason,
      hard_stop: true,
      hard_stop_reason: hardStops.bankruptcy_automatic_stay.reason,
      recommended_strategy:
        "Filing for bankruptcy triggers an automatic stay that halts collection and levy actions.",
      next_steps: [
        "Consult with bankruptcy attorney immediately",
        "File petition to trigger automatic stay",
        "Stop all collection contact from IRS",
        "Understand bankruptcy chapter implications",
      ],
      risk_level: "critical",
      levy_threat_level: "imminent",
      estimated_levy_timeline: "File bankruptcy to stop levy within hours",
      estimated_irs_response_time: "Bankruptcy court determines timeline",
      critical_warnings: ["IMMINENT LEVY - BANKRUPTCY STAY MAY BE NECESSARY"],
      levy_prevention_strategies: [
        "Chapter 7 bankruptcy (liquidation)",
        "Chapter 13 bankruptcy (payment plan)",
        "Automatic stay protects assets during filing",
      ],
    };
  }

  // Route based on taxpayer circumstances
  if (in_bankruptcy) {
    return classifyBankruptcyPath(extraction, daysUntilDeadline, bankruptcy_chapter);
  }

  if (can_pay_full) {
    return classifyPaymentPlanPath(extraction, daysUntilDeadline, payment_capability, false);
  }

  if (can_pay_partial) {
    return classifyPaymentPlanPath(extraction, daysUntilDeadline, payment_capability, true);
  }

  if (financial_hardship && !can_pay_partial) {
    return classifyCNCPath(extraction, daysUntilDeadline);
  }

  if (disputes_liability && has_valid_defense) {
    return classifyLiabilityDisputePath(extraction, daysUntilDeadline);
  }

  if (extraction.notice_type === "NFTL" && !has_prior_cdp) {
    return classifyLienWithdrawalPath(extraction, daysUntilDeadline);
  }

  if (
    extraction.total_tax_debt > 50000 &&
    !can_pay_full &&
    !financial_hardship
  ) {
    return classifyOfferInCompromisePath(extraction, daysUntilDeadline);
  }

  // Default: attorney escalation for complex situations
  return {
    path: "escalate-attorney",
    confidence: 0.8,
    reasoning:
      "Situation requires professional analysis of levy prevention options and financial circumstances.",
    hard_stop: false,
    recommended_strategy:
      "Consult with a tax professional or attorney to evaluate all available levy prevention strategies.",
    next_steps: [
      "Contact a tax attorney or CPA immediately",
      "Gather financial documentation",
      "Prepare detailed analysis of situation",
      "Understand deadline implications",
    ],
    risk_level: "high",
    levy_threat_level: assessLevyRisk(extraction),
    estimated_levy_timeline: estimateLevyTimeline(extraction),
    estimated_irs_response_time: "30-60 days with professional representation",
    critical_warnings: [
      `Response deadline: ${extraction.response_deadline} (${daysUntilDeadline} days remaining)`,
    ],
    levy_prevention_strategies: [
      "Professional assessment of financial situation",
      "Review of all levy prevention options",
      "Strategic negotiation with IRS",
    ],
  };
}

/**
 * Check hard-stop conditions
 */
function checkHardStopConditions(
  extraction: CDPNoticeExtraction,
  daysUntilDeadline: number,
  inBankruptcy: boolean
): Record<string, HardStopCondition> {
  return {
    deadline_passed: {
      triggered: daysUntilDeadline <= 0,
      reason:
        "The 30-day response deadline has passed. Levy action is imminent or may have occurred.",
    },
    bankruptcy_automatic_stay: {
      triggered: inBankruptcy,
      reason:
        "Bankruptcy filing triggers automatic stay that halts all IRS collection and levy actions.",
    },
  };
}

/**
 * Classify payment plan path
 */
function classifyPaymentPlanPath(
  extraction: CDPNoticeExtraction,
  daysUntilDeadline: number,
  paymentCapability: number,
  isPartial: boolean
): CDPClassificationResult {
  return {
    path: "setup-payment-plan",
    confidence: 0.92,
    reasoning: `Taxpayer can make ${isPartial ? "partial" : "full"} monthly payments of $${paymentCapability.toLocaleString()}`,
    hard_stop: false,
    recommended_strategy: `Request an installment agreement with monthly payments. This stops levy action and provides payment relief.`,
    next_steps: [
      "Propose monthly payment amount",
      `Monthly payment: $${paymentCapability.toLocaleString()}`,
      "Calculate payment duration",
      "File request before CDP deadline",
      "Understand that penalties/interest continue accruing",
    ],
    risk_level: "medium",
    levy_threat_level: "likely",
    estimated_levy_timeline: estimateLevyTimeline(extraction),
    estimated_irs_response_time: "10-20 days for approval",
    critical_warnings: [
      `Must respond by ${extraction.response_deadline} to halt levy`,
    ],
    levy_prevention_strategies: [
      "Installment agreement stops levy action",
      "Monthly payment preserves assets",
      "Can modify terms if circumstances change",
    ],
  };
}

/**
 * Classify Currently Not Collectible (CNC) path
 */
function classifyCNCPath(
  extraction: CDPNoticeExtraction,
  daysUntilDeadline: number
): CDPClassificationResult {
  return {
    path: "request-currently-not-collectible",
    confidence: 0.88,
    reasoning:
      "Taxpayer has significant financial hardship and cannot currently pay. CNC status temporarily suspends collection.",
    hard_stop: false,
    recommended_strategy:
      "Request Currently Not Collectible (CNC) status. IRS suspends collection actions for 12-24 months while debt remains.",
    next_steps: [
      "Document financial hardship in detail",
      "Provide financial statements (income/expenses)",
      "Explain why full/partial payment is impossible",
      "Submit CNC request with CDP response",
      "Understand IRS will review status periodically",
    ],
    risk_level: "high",
    levy_threat_level: "likely",
    estimated_levy_timeline: "Suspended during CNC status",
    estimated_irs_response_time: "30-60 days",
    critical_warnings: [
      "Interest and penalties continue accruing during CNC",
      "Must respond by deadline to prevent immediate levy",
    ],
    levy_prevention_strategies: [
      "CNC suspends active collection for 12-24 months",
      "Preserves assets during financial hardship",
      "Status subject to periodic review",
    ],
  };
}

/**
 * Classify liability dispute path
 */
function classifyLiabilityDisputePath(
  extraction: CDPNoticeExtraction,
  daysUntilDeadline: number
): CDPClassificationResult {
  return {
    path: "dispute-liability",
    confidence: 0.85,
    reasoning: "Taxpayer disputes the underlying tax liability or validity of assessment.",
    hard_stop: false,
    recommended_strategy:
      "Assert defenses to liability in CDP response. This halts collection while dispute is reviewed.",
    next_steps: [
      "Detail specific liability disputes",
      "Reference tax law and regulations",
      "Provide evidence supporting position",
      "Request Appeals consideration",
      "File before CDP deadline",
    ],
    risk_level: "medium",
    levy_threat_level: "likely",
    estimated_levy_timeline: estimateLevyTimeline(extraction),
    estimated_irs_response_time: "45-90 days for Appeals review",
    critical_warnings: ["Must timely respond to preserve dispute rights"],
    levy_prevention_strategies: [
      "Disputing liability halts collection during review",
      "Appeals considers underlying tax positions",
      "Professional representation recommended",
    ],
  };
}

/**
 * Classify lien withdrawal path
 */
function classifyLienWithdrawalPath(
  extraction: CDPNoticeExtraction,
  daysUntilDeadline: number
): CDPClassificationResult {
  return {
    path: "request-lien-withdrawal",
    confidence: 0.82,
    reasoning:
      "NFTL (lien notice) can be withdrawn if taxpayer commits to payment arrangements.",
    hard_stop: false,
    recommended_strategy:
      "Request NFTL withdrawal and establish payment plan. This removes tax lien from credit report and property.",
    next_steps: [
      "Propose reasonable payment plan",
      "Demonstrate ability to make payments",
      "Request lien withdrawal as condition",
      "Submit with CDP response",
      "Understand liens remain during payment",
    ],
    risk_level: "high",
    levy_threat_level: "likely",
    estimated_levy_timeline: estimateLevyTimeline(extraction),
    estimated_irs_response_time: "60-90 days",
    critical_warnings: [
      "Lien damages credit for years",
      "Must propose reasonable payment to qualify",
    ],
    levy_prevention_strategies: [
      "Lien withdrawal improves credit",
      "Requires commitment to payment plan",
      "Strategic negotiation tool",
    ],
  };
}

/**
 * Classify Offer in Compromise path
 */
function classifyOfferInCompromisePath(
  extraction: CDPNoticeExtraction,
  daysUntilDeadline: number
): CDPClassificationResult {
  return {
    path: "request-offer-in-compromise",
    confidence: 0.78,
    reasoning: `High debt ($${extraction.total_tax_debt.toLocaleString()}) with limited payment ability warrants OIC evaluation.`,
    hard_stop: false,
    recommended_strategy:
      "File Offer in Compromise to settle debt for reduced amount. This provides alternative to levy.",
    next_steps: [
      "Calculate reasonable collection potential",
      "Determine appropriate offer amount",
      "Prepare financial documentation",
      "File Form 656 (OIC application)",
      "Pay filing fee (typically $225)",
    ],
    risk_level: "high",
    levy_threat_level: "likely",
    estimated_levy_timeline: "Suspended during OIC evaluation",
    estimated_irs_response_time: "120-180 days for review",
    critical_warnings: [
      "OIC requires substantial documentation",
      "Levy may proceed if OIC denied",
    ],
    levy_prevention_strategies: [
      "OIC suspends collection while evaluated",
      "Can settle for less than owed",
      "Requires professional preparation",
    ],
  };
}

/**
 * Classify bankruptcy path
 */
function classifyBankruptcyPath(
  extraction: CDPNoticeExtraction,
  daysUntilDeadline: number,
  bankruptcyChapter?: "7" | "11" | "13"
): CDPClassificationResult {
  const chapter = bankruptcyChapter || "7";
  const timeline =
    chapter === "7" ? "3-6 months" : chapter === "13" ? "3-5 years" : "Varies";

  return {
    path: "bankruptcy-protection",
    confidence: 0.9,
    reasoning: `Bankruptcy filing triggers automatic stay that immediately halts levy action. Chapter ${chapter} timeline: ${timeline}`,
    hard_stop: false,
    recommended_strategy:
      "File for bankruptcy protection. Automatic stay halts all collection and levy actions immediately.",
    next_steps: [
      "Consult bankruptcy attorney immediately",
      "File petition to trigger automatic stay",
      "Understand Chapter implications",
      `Timeline: ${timeline}`,
      "Prepare for bankruptcy proceedings",
    ],
    risk_level: "critical",
    levy_threat_level: "imminent",
    estimated_levy_timeline: `Halted within hours of bankruptcy filing`,
    estimated_irs_response_time: "Bankruptcy court determines timeline",
    critical_warnings: [
      "Bankruptcy is major decision with long-term implications",
      "Protects assets from levy during bankruptcy",
    ],
    levy_prevention_strategies: [
      `Chapter ${chapter} bankruptcy timeline: ${timeline}`,
      "Automatic stay provided by bankruptcy code",
      "May discharge tax debt depending on chapter",
    ],
  };
}
