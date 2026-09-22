import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-after-notice",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/appeal-after-notice",
  startPath: "/notice-respond/workflows/appeal-after-notice/start",
  title: "Appeal After Notice",
  seoTitle: "Appeal After Notice | Notice Respond | MailMyPDF",
  seoDescription: "Appeal an initial decision with guided analysis, evidence organization, appeal brief preparation, exact review, and mailing proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Appeal an Initial Decision",
  heroDescription: "Start with the notice of decision you received, confirm the appeal deadline and procedures, gather supporting evidence, prepare your appeal, review the exact packet, and retain mailing proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual notice of decision or denial you received, not a generic template.",
    "Confirm the appeal deadline, appeal authority, and any specific procedural requirements.",
    "Gather relevant supporting documents, facts, and evidence that address the original decision.",
    "Prepare a factual appeal brief grounded in your evidence and review the exact packet before it is mailed.",
  ],
  whatYouNeed: [
    "The complete notice of decision or denial with all information about the appeal process.",
    "The appeal deadline and the authority or office where the appeal must be submitted.",
    "Relevant documents, evidence, records, or precedent that supports your appeal.",
    "Any prior correspondence related to the initial decision or matter.",
  ],
  outputs: [
    "A factual appeal brief drafted only from the notice and your confirmed facts.",
    "A reviewed, exact PDF packet with supporting documents you chose to include.",
    "A confirmed submission deadline and method before anything is sent.",
    "Mailing tracking and proof retained with the matter after it ships.",
  ],
  faqs: [
    [
      "What is an appeal after a notice of decision?",
      "An appeal is a formal request to a higher authority to review and reconsider an initial decision. The notice of decision will specify the appeal deadline, where to submit your appeal, and any required procedures.",
    ],
    [
      "How long do I have to appeal?",
      "Appeal deadlines are typically 10-30 days from the notice date and are strictly enforced. This workflow ensures you identify and track the deadline from the start.",
    ],
    [
      "What should my appeal include?",
      "Your appeal should directly address why the initial decision was wrong, reference your supporting evidence, and comply with all procedural requirements. Include only documents that support your position.",
    ],
    [
      "Can I submit an appeal without an attorney?",
      "Yes. This workflow helps you prepare a professional, well-organized appeal without requiring legal representation.",
    ],
  ],
  workspaceHighlights: [
    ["Decision analysis", "Extract the appeal deadline and requirements from the source notice."],
    ["Evidence organization", "Organize facts and supporting documents that address the original decision."],
    ["Appeal preparation", "Build and review your complete appeal package before submission."],
  ],
  workflowSteps: [
    ["Upload the decision notice", "Add the notice of decision or denial you received."],
    ["Analyze appeal requirements", "Review the extracted appeal deadline, procedures, and authority."],
    ["Organize your evidence", "Add supporting documents, facts, and precedent relevant to your appeal."],
    ["Build and review", "Prepare your appeal brief and supporting package, then review all documents."],
    ["Submit and retain proof", "Approve and submit before the deadline, retain mailing proof."],
  ],
  readyItems: [
    ["Notice of decision", "The complete notice with the decision, reasons, and appeal deadline."],
    ["Supporting evidence", "Documents, facts, or precedent that support your appeal."],
    ["Appeal procedures", "Information about where and how to submit the appeal."],
    ["Prior correspondence", "Any relevant prior communications about this matter."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
