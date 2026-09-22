import type { WorkflowDetailGuide } from "@mailmypdf/workflow-ui"

/** Authenticated guide. Auto-claim rules and review options depend on state and policy. */
export const detail = {
  overview: "Organize a challenge to an auto insurer's claim decision using the actual decision, policy, accident record, repair or loss evidence, and the insurer's stated reason. This is for a disputed claim decision, not a substitute for reporting a new accident or obtaining urgent assistance.",
  appropriateFor: [
    "You have an auto claim decision or settlement you want the insurer to reconsider.",
    "Your concern is about coverage, fault, vehicle damage, repair costs, valuation, or another specific part of the claim decision.",
  ],
  beforeYouBegin: [
    "Find the decision or explanation and your policy's claim-review instructions. Confirm which insurer and claim number apply.",
    "Identify whether this is your own policy claim or another driver's liability claim; your rights and the applicable process may differ.",
  ],
  documentsAndFacts: [
    "Decision letter or claim explanation, claim number, policy/declarations and relevant coverage terms.",
    "Accident date and location, insurer/adjuster correspondence, photos, police report if available, repair estimates or invoices, and valuation records relevant to the dispute.",
    "The specific amount, coverage decision, or factual finding you dispute and why, with supporting evidence for each point.",
  ],
  timing: [
    "Use the date and response instructions in the insurer's letter and policy. State rules, policy terms, and any litigation deadlines can differ; do not assume a universal appeal window.",
    "If a deadline is close, contact the insurer or your state insurance department promptly rather than relying on mailing alone.",
  ],
  steps: [
    { title: "Read the decision", description: "Separate the insurer's stated reasons from facts you can independently document; note the claim number and any review instructions." },
    { title: "Build a point-by-point record", description: "Match each disputed finding to policy language, accident evidence, repair estimates, or other relevant records. Flag what you cannot yet verify." },
    { title: "Prepare a focused request", description: "State exactly what should be reconsidered, the supporting facts, and the outcome you seek. Attach only evidence that supports the request." },
    { title: "Review before delivery", description: "Confirm the addressee, deadline, attachment list, and final packet before using the insurer's specified submission method." },
  ],
  reviewChecklist: [
    "Names, policy and claim numbers, accident date, disputed amount and coverage terms match the source documents.",
    "Every factual claim has support; no estimate or fault determination is presented as settled if contested.",
    "Copies of all referenced estimates, photos, reports and correspondence are actually included.",
  ],
  deliveryAndProof: [
    "Use the appeal/reconsideration channel specified by the insurer; a mailed letter may not replace a required portal, form, or other procedure.",
    "Keep a copy of the final packet and the insurer's acknowledgment. If you mail it, retain the address used and any tracking or delivery record; tracking alone does not prove acceptance of an appeal.",
  ],
  afterSubmission: [
    "Record the insurer's response and any requests for more evidence. If unresolved, find your state insurance department's complaint process and consider qualified legal advice when needed.",
  ],
  costsAndLimits: [
    "Check the insurer for any claim-review cost and review the policy for deductibles or coverage limits. Mailing or other services may have separate charges.",
  ],
  helpAndAlternatives: [
    "Ask the adjuster how to request reconsideration. For an unresolved insurer issue, contact the state insurance department; seek legal advice for time-sensitive injury or liability disputes.",
  ],
  cautions: [
    "An insurance-department complaint is different from the insurer's internal claim review and does not necessarily stop other deadlines.",
    "California's accident guidance is an example, not a rule for other states. Check the regulator for the state governing your claim.",
  ],
  sources: [
    { label: "California Department of Insurance: After an automobile accident", url: "https://www.insurance.ca.gov/01-consumers/105-type/95-guides/01-auto/hadaccident.cfm" },
    { label: "NAIC: Find your state insurance department", url: "https://content.naic.org/state-insurance-departments" },
  ],
  reviewedOn: "September 22, 2026",
  scopeNote: "General preparation guidance, not legal advice or a determination of coverage. Your decision letter, policy, state rules, and any court deadlines control the next step.",
} satisfies WorkflowDetailGuide
