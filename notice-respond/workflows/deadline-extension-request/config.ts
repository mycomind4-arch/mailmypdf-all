import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "deadline-extension-request",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/deadline-extension-request",
  startPath: "/notice-respond/workflows/deadline-extension-request/start",
  title: "Deadline Extension Request",
  seoTitle: "Deadline Extension Request | Notice Respond | MailMyPDF",
  seoDescription: "Request a deadline extension with guided justification, supporting evidence, formal request preparation, document review, and submission proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Request a Deadline Extension",
  heroDescription: "Start with the original deadline, document why you need more time, gather supporting evidence, prepare your formal request, review the exact submission, and track delivery.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Identify the original deadline and the entity managing it.",
    "Document the specific reason you need additional time.",
    "Gather evidence supporting your need for extension.",
    "Prepare a persuasive extension request and review before submitting.",
  ],
  whatYouNeed: [
    "The original notice or deadline document showing the current deadline.",
    "Specific reasons why you cannot meet the original deadline.",
    "Supporting documentation (medical records, work orders, correspondence, etc.).",
    "Contact information for the office that set the deadline.",
  ],
  outputs: [
    "A formal deadline extension request with clear justification.",
    "A reviewed, exact submission with supporting evidence.",
    "Confirmation of the extension deadline and submission method.",
    "Proof of submission and any confirmation received.",
  ],
  faqs: [
    [
      "When should I request an extension?",
      "Request as soon as you realize you need more time. Most agencies require requests before the original deadline, though some allow requests after.",
    ],
    [
      "What reasons justify an extension?",
      "Valid reasons include illness, injury, family emergency, unavailable records, workload issues, or other circumstances beyond your control. The stronger your justification, the more likely approval.",
    ],
    [
      "How much more time can I request?",
      "Typical extensions range from 15-30 days depending on the agency and reason. Request what you actually need, but be reasonable.",
    ],
  ],
  workspaceHighlights: [
    ["Deadline analysis", "Confirm the current deadline and extension authority."],
    ["Justification planning", "Document compelling reasons for extension."],
    ["Formal request", "Prepare and submit your extension request."],
  ],
  workflowSteps: [
    ["Gather deadline info", "Identify the current deadline and responsible office."],
    ["Document reasons", "Specify why you need additional time."],
    ["Organize evidence", "Collect supporting documents for your request."],
    ["Draft request", "Prepare your extension request letter."],
    ["Submit for approval", "File your request and track the response."],
  ],
  readyItems: [
    ["Deadline notice", "The document showing the current deadline."],
    ["Justification", "Clear reasons why extension is needed."],
    ["Supporting evidence", "Documentation backing your extension request."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
