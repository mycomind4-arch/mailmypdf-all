import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "administrative-hearing-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/administrative-hearing-notice-response",
  startPath: "/notice-respond/workflows/administrative-hearing-notice-response/start",
  title: "Administrative Hearing Notice Response",
  seoTitle: "Administrative Hearing Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to an administrative hearing notice with guided analysis, fact confirmation, supporting documents, response drafting, packet review, and mailing proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to an Administrative Hearing Notice",
  heroDescription: "Start with the actual administrative hearing notice, confirm the hearing details and deadlines, gather supporting evidence, prepare your response, review the exact packet, and retain mailing proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual administrative hearing notice you received, not a generic template.",
    "Confirm the hearing date, time, location, and any deadlines for submitting evidence or responses.",
    "Gather relevant supporting documents, facts, and evidence pertinent to the hearing.",
    "Prepare factual, source-grounded correspondence and review the exact packet before it is mailed.",
  ],
  whatYouNeed: [
    "The complete administrative hearing notice with all hearing details and deadlines.",
    "Relevant documents, evidence, or records that support your position in the hearing.",
    "Any prior correspondence related to the administrative matter.",
    "The mailing address to use as the return address on your response.",
  ],
  outputs: [
    "A factual response drafted only from the notice and your confirmed facts.",
    "A reviewed, exact PDF packet with any supporting documents you chose to include.",
    "A confirmed submission deadline and mailing method before anything is sent.",
    "Mailing tracking and proof retained with the matter after it ships.",
  ],
  faqs: [
    [
      "What is an administrative hearing notice?",
      "An administrative hearing notice is a formal notification that you have the right to a hearing before an administrative agency or tribunal to dispute a decision or allegation. It specifies the hearing date, location, deadline to submit evidence, and your rights in the process.",
    ],
    [
      "What should I include in my response?",
      "Your response should clearly address the issues raised in the notice, reference your supporting evidence, and comply with all procedural requirements specified in the notice. Include only relevant documents that directly support your position.",
    ],
    [
      "Can I submit evidence after the deadline?",
      "Most administrative proceedings have strict deadlines for submitting evidence. It is critical to submit everything before the deadline. This workflow ensures you track the deadline and prepare all materials in advance.",
    ],
    [
      "Can I review my response before it's submitted?",
      "Yes. Drafting, review, approval, and submission are separate steps, and the exact packet you approve is the exact packet that gets submitted or mailed.",
    ],
  ],
  workspaceHighlights: [
    ["Notice-first analysis", "Extract the hearing details, deadlines, and required information from the source notice."],
    ["Evidence organization", "Organize supporting documents and facts relevant to the hearing."],
    ["Complete submission record", "Review, approve, submit, and retain proof for your exact response package."],
  ],
  workflowSteps: [
    ["Upload the notice", "Add the administrative hearing notice you received."],
    ["Analyze and confirm", "Review the extracted hearing details, dates, and deadline requirements."],
    ["Organize your evidence", "Add supporting documents and evidence relevant to the hearing."],
    ["Build and review", "Prepare your response and supporting package, then review the exact documents."],
    ["Submit and retain proof", "Approve the exact package, submit it before the deadline, and retain proof."],
  ],
  readyItems: [
    ["Hearing notice", "The complete notice with all hearing details, location, date, time, and deadlines."],
    ["Supporting evidence", "Documents, records, or evidence that directly support your position in the hearing."],
    ["Prior correspondence", "Any relevant prior letters, notices, or communications about this matter."],
    ["Submission address", "The mailing or submission address and any special formatting requirements."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
