import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "government-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/government-notice-response",
  startPath: "/notice-respond/workflows/government-notice-response/start",
  title: "Government Notice Response",
  seoTitle: "Government Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to a government agency notice with guided analysis, fact confirmation, evidence gathering, response drafting, exact review, and mailing proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to a Government Agency Notice",
  heroDescription: "Start with the actual government notice you received, confirm the deadline and requirements, gather supporting evidence, prepare your response, review the exact packet, and retain mailing proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual government agency notice you received, not a generic template.",
    "Confirm the response deadline, required format, and submission method.",
    "Gather supporting documents, facts, and evidence addressing the agency's request or inquiry.",
    "Prepare a factual, professional response grounded in your evidence and review the exact packet before mailing.",
  ],
  whatYouNeed: [
    "The complete government notice with agency, department, and specific requirements.",
    "The response deadline and submission instructions or address.",
    "Supporting documents, evidence, records, or data relevant to the agency's request.",
    "Any prior correspondence with the agency about this matter.",
  ],
  outputs: [
    "A factual response drafted only from the notice and your confirmed facts.",
    "A reviewed, exact PDF packet with supporting documents you chose to include.",
    "A confirmed submission deadline and method before anything is mailed.",
    "Mailing tracking and proof retained with the matter after it ships.",
  ],
  faqs: [
    [
      "What should I include in my response to a government agency?",
      "Include only information that directly addresses the agency's request or inquiry. Provide supporting documents or evidence as requested, and comply with any formatting or submission requirements.",
    ],
    [
      "What if I don't have all the requested information?",
      "State clearly what you don't have and explain why. Provide what you do have with explanations. It is better to respond completely than to miss the deadline.",
    ],
    [
      "What happens if I miss the deadline?",
      "Many government agencies can proceed with default action if you miss the response deadline. This workflow helps you track and meet deadlines.",
    ],
    [
      "Can I request an extension?",
      "Many agencies allow deadline extensions if requested before the deadline. This workflow can help you prepare an extension request if needed.",
    ],
  ],
  workspaceHighlights: [
    ["Notice analysis", "Extract agency requirements and response deadline from the notice."],
    ["Evidence gathering", "Organize supporting documents and facts relevant to the request."],
    ["Response preparation", "Build and review your complete response before submission."],
  ],
  workflowSteps: [
    ["Upload the notice", "Add the government agency notice you received."],
    ["Analyze requirements", "Review the extracted deadline, format, and submission requirements."],
    ["Organize evidence", "Add supporting documents and facts relevant to the request."],
    ["Build and review", "Prepare your response and supporting packet, then review all documents."],
    ["Submit and retain proof", "Approve and submit before the deadline, retain mailing proof."],
  ],
  readyItems: [
    ["Government notice", "The complete notice with agency requirements and deadline."],
    ["Supporting evidence", "Documents or data requested or relevant to the agency's inquiry."],
    ["Submission method", "Clear instructions for how and where to submit the response."],
    ["Prior correspondence", "Any previous communication with the agency about this matter."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
