/**
 * Eviction Notice Classification Engine
 * Routes tenant through appropriate response path based on situation
 */

import type {
  EvictionIntakeConfirmation,
  EvictionClassificationRequest,
  EvictionClassificationResult,
  EvictionResponsePath,
} from "./types";

export async function classifyEvictionResponse(
  request: EvictionClassificationRequest
): Promise<EvictionClassificationResult> {
  // Check hard-stop conditions first
  const hardStopCheck = checkHardStopConditions(request);
  if (hardStopCheck) {
    return hardStopCheck;
  }

  // Special case: payment already made
  if (request.user_decisions?.["payment_already_made"]) {
    return {
      path: "payment-already-made",
      confidence: 0.95,
      reasoning: "Tenant indicates rent was already paid in full before deadline",
      hard_stop: true,
      hard_stop_reason:
        "If you paid the full amount before the deadline, the notice is cured. Document your payment and notify your landlord in writing.",
      recommended_strategy:
        "Send written confirmation of payment to landlord with date and amount. Keep proof of payment (bank records, cashier check, receipt).",
      next_steps: [
        "Document proof of payment (screenshot, bank statement, receipt)",
        "Send written notice to landlord confirming payment and amount",
        "Keep records for potential court filings",
      ],
    };
  }

  // Route based on tenant's ability and intent
  if (request.can_pay) {
    if (request.payment_amount && request.payment_amount >= request.intake.extraction.notice_amount_owed) {
      return {
        path: "pay-negotiate",
        confidence: 0.92,
        reasoning: "Tenant can pay full amount or has defenses but prefers to negotiate",
        hard_stop: false,
        recommended_strategy:
          "Prepare a formal payment proposal letter demonstrating good faith and commitment to resolution",
        next_steps: [
          "Draft payment proposal letter with specific payment date and terms",
          "Calculate deadline and ensure payment arrives on time",
          "Consider sending via certified mail with proof of receipt",
          "Keep copy of letter and proof of mailing",
        ],
      };
    } else if (request.payment_amount && request.payment_amount > 0) {
      return {
        path: "pay-negotiate",
        confidence: 0.88,
        reasoning: "Tenant can pay partially or over time",
        hard_stop: false,
        recommended_strategy:
          "Prepare a partial payment proposal with realistic timeline. Document willingness to resolve.",
        next_steps: [
          "Draft letter proposing partial payment + payment plan",
          "Specify monthly payment amounts and dates",
          "Show calculation of payment schedule",
          "Note that landlord may reject proposal, but written record is protective",
        ],
      };
    }
  }

  // Route based on defenses
  if (request.has_defenses && request.defense_types && request.defense_types.length > 0) {
    return {
      path: "contest-defend",
      confidence: 0.89,
      reasoning: `Tenant has identified legal defenses: ${request.defense_types.join(", ")}`,
      hard_stop: false,
      recommended_strategy:
        "Prepare detailed response letter documenting defenses and gathering supporting evidence",
      next_steps: [
        "Draft contest/defense response letter",
        "Gather supporting evidence (photos, receipts, communications)",
        "Consider preparing declaration under penalty of perjury",
        "Prepare for possible unlawful detainer lawsuit if landlord files",
      ],
    };
  }

  // Route based on tenant status
  if (request.tenant_status === "unauthorized") {
    return {
      path: "move-preparation",
      confidence: 0.85,
      reasoning: "Tenant may have limited legal standing to contest notice",
      hard_stop: false,
      recommended_strategy:
        "Understand rights, explore relocation assistance, consider attorney consultation for unique circumstances",
      next_steps: [
        "Research local tenant rights and moving assistance programs",
        "Get cost estimates for moving services",
        "Explore relocation assistance if available",
        "Consult attorney if there are complex circumstances",
      ],
    };
  }

  // Default: offer escalation or move preparation
  return {
    path: "escalate-attorney",
    confidence: 0.8,
    reasoning: "Situation is complex or tenant is uncertain; attorney guidance recommended",
    hard_stop: false,
    recommended_strategy:
      "Connect with legal aid or attorney for personalized guidance on this specific notice",
    next_steps: [
      "Contact local legal aid society",
      "Consult with tenant rights organization",
      "Speak with attorney for guidance on best response strategy",
      "Ask about payment plans or legal fee assistance",
    ],
  };
}

function checkHardStopConditions(
  request: EvictionClassificationRequest
): EvictionClassificationResult | null {
  const intake = request.intake;
  const today = new Date().toISOString().split("T")[0];

  // Hard Stop 1: Deadline has passed
  if (intake.extraction.deadline_date && intake.extraction.deadline_date <= today) {
    return {
      path: "deadline-passed",
      confidence: 0.99,
      reasoning: `Deadline has already passed (${intake.extraction.deadline_date} <= ${today})`,
      hard_stop: true,
      hard_stop_reason:
        "Your deadline to respond has passed. You may still have options through a court filing. Please consult an attorney immediately.",
      recommended_strategy:
        "Your situation requires immediate attorney consultation. You may be able to file an unlawful detainer answer even after the deadline in some cases.",
      next_steps: [
        "Contact attorney immediately",
        "Ask about right to file answer to unlawful detainer if lawsuit is filed",
        "Do not delay - attorney guidance is critical",
      ],
    };
  }

  // Hard Stop 2: Prior court involvement
  if (request.court_involvement) {
    return {
      path: "escalate-attorney",
      confidence: 0.98,
      reasoning: "Notice references prior lawsuit or court involvement",
      hard_stop: true,
      hard_stop_reason:
        "Your situation involves an existing or referenced court case. You must consult an attorney to file a formal court response.",
      recommended_strategy:
        "This requires legal representation. Do not attempt to proceed without attorney guidance.",
      next_steps: [
        "Locate and review any prior court documents",
        "Contact attorney immediately",
        "Ask about expedited response procedures",
      ],
    };
  }

  // Hard Stop 3: Language barriers
  if (request.language_barrier) {
    return {
      path: "escalate-attorney",
      confidence: 0.9,
      reasoning: "Tenant reports language barrier preventing comprehension of notice",
      hard_stop: true,
      hard_stop_reason:
        "We recommend speaking to an attorney or housing advocate who can review this notice with you in your preferred language.",
      recommended_strategy:
        "Connect with language-accessible legal services and tenant advocacy organizations in your community",
      next_steps: [
        "Find bilingual legal aid in your area",
        "Contact tenant rights organizations that provide interpretation",
        "Ask for translated copies of important documents",
      ],
    };
  }

  // Hard Stop 4: Prior eviction
  if (request.prior_eviction) {
    return {
      path: "escalate-attorney",
      confidence: 0.85,
      reasoning: "Tenant has prior eviction record",
      hard_stop: false, // Not a hard stop, but strong recommendation
      hard_stop_reason:
        "Your prior eviction history may complicate this case. Professional legal guidance is highly recommended.",
      recommended_strategy:
        "Attorney representation is strongly recommended given prior eviction history",
      next_steps: [
        "Consult with attorney about impact of prior eviction",
        "Discuss strategies specific to your history",
        "Explore affirmative defenses in detail",
      ],
    };
  }

  return null;
}

// Classification confidence explanations
export function explainClassificationConfidence(result: EvictionClassificationResult): string {
  if (result.confidence === 0.99) {
    return "This classification is certain based on the information provided";
  }
  if (result.confidence >= 0.9) {
    return "This classification is very likely based on the current information";
  }
  if (result.confidence >= 0.8) {
    return "This classification is likely, but your specific situation may warrant additional discussion";
  }
  if (result.confidence >= 0.7) {
    return "This classification is reasonable, but several factors could change the recommendation";
  }
  return "This classification is preliminary. We strongly recommend consulting with an attorney.";
}

// Response path descriptions for UI
export function getPathDescription(path: EvictionResponsePath): string {
  const descriptions: Record<EvictionResponsePath, string> = {
    "pay-negotiate": "Pay or Negotiate",
    "contest-defend": "Contest & Defend",
    "move-preparation": "Prepare to Move",
    "escalate-attorney": "Consult Attorney",
    "payment-already-made": "Payment Already Made",
    "deadline-passed": "Deadline Passed - Attorney Needed",
  };
  return descriptions[path];
}

export function getPathColor(path: EvictionResponsePath): "success" | "info" | "warning" | "error" {
  const colors: Record<EvictionResponsePath, "success" | "info" | "warning" | "error"> = {
    "pay-negotiate": "success",
    "contest-defend": "warning",
    "move-preparation": "info",
    "escalate-attorney": "warning",
    "payment-already-made": "success",
    "deadline-passed": "error",
  };
  return colors[path];
}
