import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "licensing-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/licensing-notice-response",
  startPath: "/notice-respond/workflows/licensing-notice-response/start",
  title: "Licensing Notice Response",
  seoTitle: "Licensing Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to professional licensing agency notice with compliance documentation, corrective action plan, exact review, and proof retention.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to a Licensing Notice",
  heroDescription: "Start with the licensing agency notice, understand the violation or inquiry, gather supporting evidence, prepare your response, review the exact packet, and retain proof of submission.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual licensing agency notice you received, not a generic document.",
    "Understand the specific license violation, compliance issue, or inquiry.",
    "Gather supporting documentation and evidence relevant to the licensing matter.",
    "Prepare a factual response with corrective actions if needed and review the exact packet before submitting.",
  ],
  whatYouNeed: [
    "The complete licensing agency notice with specific violation or inquiry.",
    "Your professional license or registration documentation.",
    "Records showing compliance with licensing requirements.",
    "Documentation of corrective actions taken if violations occurred.",
  ],
  outputs: [
    "A response addressing the licensing agency's concerns or inquiry.",
    "A reviewed, exact PDF packet with supporting documentation.",
    "A confirmed response deadline and submission method.",
    "Submission confirmation and proof retained with the matter.",
  ],
  faqs: [
    [
      "What triggers a licensing agency notice?",
      "Licensing notices typically respond to: a complaint about your practice, failure to maintain compliance, failure to renew on time, or an inquiry about your qualifications or conduct.",
    ],
    [
      "How should I respond?",
      "Address the specific concern with clear facts and supporting documentation. If a violation occurred, explain corrective actions you have taken or will take.",
    ],
    [
      "Can the licensing agency revoke my license?",
      "It depends on the agency and violation. A prompt, complete response showing corrective action significantly improves your position.",
    ],
    [
      "Do I need an attorney?",
      "Not always. Many licensing matters can be resolved with a clear factual response. However, serious matters may warrant professional representation.",
    ],
  ],
  workspaceHighlights: [
    ["Notice analysis", "Understand the specific licensing concern or violation."],
    ["Compliance documentation", "Organize records showing current compliance."],
    ["Response preparation", "Build professional response with corrective actions."],
  ],
  workflowSteps: [
    ["Upload the notice", "Add the licensing agency notice."],
    ["Analyze violation", "Identify the specific compliance or conduct concern."],
    ["Gather documentation", "Add license, compliance records, and evidence."],
    ["Prepare response", "Draft response addressing concern with corrective actions."],
    ["Submit and retain proof", "Approve and submit before deadline, retain proof."],
  ],
  readyItems: [
    ["Licensing notice", "The complete notice with specific violation or inquiry."],
    ["Professional license", "Copy of current or expired professional license or registration."],
    ["Compliance records", "Documentation of compliance with licensing requirements."],
    ["Corrective actions", "Evidence of actions taken to address any violations."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
