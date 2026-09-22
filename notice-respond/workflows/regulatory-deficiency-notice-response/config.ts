import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "regulatory-deficiency-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/regulatory-deficiency-notice-response",
  startPath: "/notice-respond/workflows/regulatory-deficiency-notice-response/start",
  title: "Regulatory Deficiency Notice Response",
  seoTitle: "Regulatory Deficiency Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to regulatory deficiency notice with corrective action plan, documentation, exact review, and proof retention.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to a Regulatory Deficiency Notice",
  heroDescription: "Start with the regulatory deficiency notice, understand each deficiency cited, gather documentation showing correction, prepare your response, review the exact packet, and retain proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual regulatory deficiency notice you received, not a template.",
    "Understand each deficiency cited and the regulatory requirement it violates.",
    "Gather documentation showing you have corrected or will correct each deficiency.",
    "Prepare a detailed response with corrective action plan and evidence.",
  ],
  whatYouNeed: [
    "The complete regulatory deficiency notice listing each deficiency.",
    "Relevant regulations or requirements referenced in the notice.",
    "Documentation showing how each deficiency was or will be corrected.",
    "Timeline for completion of corrections if not yet finished.",
  ],
  outputs: [
    "Response letter addressing each deficiency and corrective actions.",
    "A reviewed, exact PDF packet with supporting documentation and evidence.",
    "A confirmed response deadline and submission method.",
    "Submission proof retained with the regulatory file.",
  ],
  faqs: [
    [
      "What is a regulatory deficiency?",
      "A regulatory deficiency is a failure to comply with applicable regulations. A deficiency notice identifies the non-compliance and typically requires corrective action.",
    ],
    [
      "How should I respond to each deficiency?",
      "Address each deficiency separately. Explain what the deficiency was, what you did or will do to correct it, and provide evidence of correction or timeline for completion.",
    ],
    [
      "What if I can't correct the deficiency by the deadline?",
      "Explain why and propose a realistic timeline. Request any necessary extension before the deadline expires.",
    ],
    [
      "Can the regulator inspect to verify corrections?",
      "Yes. Most regulators reserve the right to conduct follow-up inspections to verify that deficiencies have been corrected.",
    ],
  ],
  workspaceHighlights: [
    ["Deficiency analysis", "Understand each deficiency cited and regulatory requirement."],
    ["Documentation gathering", "Organize evidence of corrections for each deficiency."],
    ["Corrective action plan", "Build detailed response with corrective actions."],
  ],
  workflowSteps: [
    ["Upload notice", "Add the regulatory deficiency notice."],
    ["Analyze deficiencies", "Identify each deficiency and regulatory requirement."],
    ["Gather corrections", "Add documentation showing corrections made or planned."],
    ["Prepare response", "Draft response detailing corrective actions for each deficiency."],
    ["Submit and retain proof", "Approve and submit before deadline, retain proof."],
  ],
  readyItems: [
    ["Deficiency notice", "The complete notice with each deficiency listed."],
    ["Regulations", "Applicable regulations or requirements for each deficiency."],
    ["Corrective evidence", "Documentation showing corrections made or timeline."],
    ["Prior inspection", "Any prior inspection reports or correspondence."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
