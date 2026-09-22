import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "document-request-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/document-request-response",
  startPath: "/notice-respond/workflows/document-request-response/start",
  title: "Document Request Response",
  seoTitle: "Document Request Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to a document request with guided analysis, document gathering, privilege review, submission preparation, exact review, and mailing or filing proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to a Document Request",
  heroDescription: "Start with the actual document request you received, identify each requested item, gather the documents you have, review for privilege or confidentiality, prepare your submission, review the exact packet, and retain proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual document request you received, not a generic response template.",
    "Identify each requested document or category and gather what you have in your files.",
    "Review documents for any privilege, confidentiality, or legal reasons not to produce.",
    "Organize the documents you will produce, prepare a cover letter, and review the exact packet before mailing.",
  ],
  whatYouNeed: [
    "The complete document request with all specific items or categories requested.",
    "The deadline for production and the delivery method or address.",
    "Reasonable access to your files and records where the requested documents are stored.",
    "Any legal guidance about privilege or confidentiality claims, if applicable.",
  ],
  outputs: [
    "A list identifying each requested item and whether you are producing, withholding, or unable to locate it.",
    "A reviewed, exact PDF packet with all documents you have chosen to produce.",
    "A professional cover letter summarizing the documents produced.",
    "A confirmed production deadline and delivery method before anything is submitted.",
  ],
  faqs: [
    [
      "What is a document request?",
      "A document request is a formal request for specific documents or categories of documents, typically in litigation or administrative proceedings. You are required to search your files and produce responsive documents.",
    ],
    [
      "What does responsive mean?",
      "A document is responsive if it falls within the scope of what was requested. You must produce all responsive documents unless they are privileged or confidential.",
    ],
    [
      "Can I withhold any documents?",
      "Yes. You can withhold documents if they are protected by attorney-client privilege, work product protection, or other legal privileges, but you may need to provide a privilege log listing what you withheld and why.",
    ],
    [
      "What if I don't have a requested document?",
      "State clearly that you don't have the document or cannot locate it. Describe your efforts to search for it if appropriate.",
    ],
  ],
  workspaceHighlights: [
    ["Request analysis", "Extract each requested item or category from the document request."],
    ["Document gathering", "Search your files for responsive documents."],
    ["Privilege review", "Identify any documents protected by privilege before production."],
  ],
  workflowSteps: [
    ["Upload the request", "Add the document request you received."],
    ["Analyze requested items", "Review the specific items and categories being requested."],
    ["Gather documents", "Search your files and add responsive documents to your response."],
    ["Review and organize", "Check for privilege and organize documents in the requested format."],
    ["Submit and retain proof", "Approve and submit before the deadline, retain delivery confirmation."],
  ],
  readyItems: [
    ["Document request", "The complete request with all specific items and categories."],
    ["Production deadline", "The date by which documents must be produced."],
    ["Delivery method", "How documents should be delivered (mail, email, in-person)."],
    ["File access", "Reasonable ability to search your files for responsive documents."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
