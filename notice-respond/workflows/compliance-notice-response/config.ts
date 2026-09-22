import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "compliance-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/compliance-notice-response",
  startPath: "/notice-respond/workflows/compliance-notice-response/start",
  title: "Compliance Violation Notice Response",
  seoTitle: "Compliance Violation Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to a compliance violation notice with guided corrective action planning, evidence organization, response preparation, document review, and submission tracking.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to a Compliance Violation Notice",
  heroDescription: "Start with the compliance violation notice, confirm the violation details and deadline, plan your corrective actions, prepare your response, review the exact submission, and track delivery.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual compliance violation notice, identifying specific violations cited.",
    "Confirm the regulatory requirements, violation details, and response deadline.",
    "Plan corrective actions that directly address each violation cited.",
    "Prepare a clear compliance response and review the exact submission before filing.",
  ],
  whatYouNeed: [
    "The complete compliance violation notice with all cited violations and deadlines.",
    "Documentation of current compliance status or corrective actions taken.",
    "Supporting evidence that violations have been corrected or are being remedied.",
    "Contact information for the regulatory agency or compliance office.",
  ],
  outputs: [
    "A compliance response addressing each cited violation.",
    "A reviewed, exact submission package with supporting documentation.",
    "Confirmation of the filing deadline and submission method.",
    "Filing tracking and proof of submission retained.",
  ],
  faqs: [
    [
      "What is a compliance violation notice?",
      "A compliance violation notice is issued by a regulatory agency when it identifies that you or your business have violated regulations or requirements. It specifies the violations, required corrective actions, and deadline to respond.",
    ],
    [
      "Must I respond to compliance violations?",
      "Yes. Failure to respond can result in penalties, enforcement actions, or legal consequences. Meeting the response deadline is critical.",
    ],
    [
      "What should my response include?",
      "Your response should acknowledge each violation, explain what corrective action you have taken or will take, provide evidence of compliance, and commit to maintaining compliance going forward.",
    ],
  ],
  workspaceHighlights: [
    ["Notice-first analysis", "Identify each violation cited and the specific regulatory requirement."],
    ["Corrective action planning", "Document remediation steps for each violation."],
    ["Compliance submission", "Prepare, review, and submit your corrective action plan."],
  ],
  workflowSteps: [
    ["Upload the notice", "Add the compliance violation notice."],
    ["Analyze violations", "Review each cited violation and requirement."],
    ["Plan corrections", "Document corrective actions for each violation."],
    ["Build response", "Prepare your compliance response and supporting documents."],
    ["Submit to agency", "File your response before the deadline and retain proof."],
  ],
  readyItems: [
    ["Violation notice", "The complete compliance violation notice."],
    ["Current status", "Documentation of current compliance efforts."],
    ["Supporting evidence", "Proof of corrective actions taken."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
