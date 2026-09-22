import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "evidence-request-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/evidence-request-response",
  startPath: "/notice-respond/workflows/evidence-request-response/start",
  title: "Evidence Request Response",
  seoTitle: "Evidence Request Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to an evidence request with guided document organization, evidence verification, formal response preparation, review, and submission proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to an Evidence Request",
  heroDescription: "Start with the evidence request, identify what evidence is being requested, gather and organize the documents, prepare your submission, review the exact package, and track delivery.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start with the actual evidence request, identifying what specific evidence is needed.",
    "Locate and organize all requested documents from your records.",
    "Verify the evidence is relevant, complete, and properly formatted.",
    "Prepare a cover letter with your evidence submission and review before sending.",
  ],
  whatYouNeed: [
    "The evidence request letter specifying what documents are needed.",
    "Access to your files and records to locate requested evidence.",
    "Time to organize and prepare documents in the requested format.",
    "Submission instructions (mailing address, electronic method, etc.).",
  ],
  outputs: [
    "A complete evidence submission package with all requested documents.",
    "An index or cover letter identifying what evidence is included.",
    "A reviewed, exact submission ready for delivery.",
    "Proof of submission and any confirmation from the requesting party.",
  ],
  faqs: [
    [
      "What if I don't have all requested evidence?",
      "Respond explaining which documents you have and which you cannot locate. Provide what you have, explain the gap, and offer to provide documents if they become available.",
    ],
    [
      "Should I provide more than what's requested?",
      "Provide exactly what is requested unless relevant additional evidence significantly strengthens your position. Too much can appear evasive; stick to the request.",
    ],
    [
      "Do I need to explain the evidence?",
      "Include a brief cover letter identifying each document, its date, and why it's relevant to the evidence request. This helps the recipient understand what you're submitting.",
    ],
  ],
  workspaceHighlights: [
    ["Request analysis", "Identify specific evidence requested and deadlines."],
    ["Evidence organization", "Locate, organize, and verify all requested documents."],
    ["Formal submission", "Prepare and submit your evidence package."],
  ],
  workflowSteps: [
    ["Review request", "Read the evidence request and note deadlines."],
    ["Identify evidence", "List what evidence is requested and what you have."],
    ["Gather documents", "Locate and organize all requested evidence."],
    ["Prepare submission", "Create a cover letter and organize for delivery."],
    ["Submit and track", "Send evidence and confirm receipt."],
  ],
  readyItems: [
    ["Evidence request", "The letter or notice requesting specific evidence."],
    ["Access to records", "Ability to locate and access your files."],
    ["Submission method", "Instructions for how to submit evidence."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
