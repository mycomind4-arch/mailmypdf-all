import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "state-revenue-department-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/state-revenue-department-notice-response",
  startPath: "/notice-respond/workflows/state-revenue-department-notice-response/start",
  title: "State Revenue Department Notice Response",
  seoTitle: "State Revenue Department Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to state revenue department notice with documentation, corrected reporting, or protest, exact review, and proof retention.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to a State Revenue Department Notice",
  heroDescription: "Start with the state revenue notice, understand the issue and deadline, gather supporting documentation, prepare your response, review the exact packet, and retain proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual state revenue department notice you received, not a template.",
    "Confirm the tax or revenue issue, requested information, and response deadline.",
    "Gather supporting documentation from your records.",
    "Prepare a factual response addressing the issue and review the exact packet before mailing.",
  ],
  whatYouNeed: [
    "The complete state revenue notice with specific issue and deadline.",
    "Supporting documentation: tax records, payment records, or requested information.",
    "Any prior correspondence with the state revenue department.",
    "Business records or evidence relevant to the notice.",
  ],
  outputs: [
    "A response addressing the state revenue issue with supporting documentation.",
    "A reviewed, exact PDF packet with all supporting evidence.",
    "A confirmed response deadline and submission method.",
    "Mailing tracking and proof retained with the matter.",
  ],
  faqs: [
    [
      "What triggers a state revenue notice?",
      "State revenue notices are typically about: tax assessments, payment issues, mismatches with information documents (1099s, W-2s), or requests for documentation.",
    ],
    [
      "How should I respond?",
      "Address the specific issue raised. Provide documentation supporting your position or correcting any misunderstanding.",
    ],
    [
      "What if I disagree with the assessment?",
      "Respond with your position and supporting documentation. State revenue departments typically have appeal procedures if you disagree.",
    ],
    [
      "What happens if I don't respond?",
      "Non-response can result in adverse determinations, penalties, or collection action. Responding timely is important.",
    ],
  ],
  workspaceHighlights: [
    ["Notice analysis", "Understand the specific state revenue issue and deadline."],
    ["Documentation gathering", "Organize supporting records and evidence."],
    ["Response preparation", "Build response addressing the revenue issue."],
  ],
  workflowSteps: [
    ["Upload the notice", "Add the state revenue notice."],
    ["Analyze issue", "Identify the specific tax or revenue issue and deadline."],
    ["Gather documentation", "Add supporting records and evidence."],
    ["Prepare response", "Draft response addressing the issue."],
    ["Submit and retain proof", "Approve and mail before deadline, retain proof."],
  ],
  readyItems: [
    ["Revenue notice", "The complete state revenue department notice."],
    ["Supporting documentation", "Tax records, payment records, or requested information."],
    ["Prior correspondence", "Previous state revenue letters about this issue."],
    ["Business records", "Records supporting your position on the issue."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
