import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "irs-identity-information-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/irs-identity-information-notice-response",
  startPath: "/notice-respond/workflows/irs-identity-information-notice-response/start",
  title: "IRS Identity Information Notice Response",
  seoTitle: "IRS Identity Information Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to IRS identity information request with verification documents, exact review, and secure submission proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to IRS Identity Information Request",
  heroDescription: "Start with the IRS notice requesting identity information, gather required documentation, prepare your response, review the exact packet, and retain secure submission proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual IRS notice requesting identity information, not a generic template.",
    "Identify the specific identity information the IRS is requesting.",
    "Gather supporting documentation verifying your identity and legitimacy of the claim.",
    "Prepare a factual response with only necessary identifying information and review the exact packet before sending.",
  ],
  whatYouNeed: [
    "The complete IRS notice requesting identity or authority information.",
    "Identification documents or verification as requested by the IRS.",
    "Any documentation supporting the claimed tax item or status.",
    "Prior correspondence related to the identity or authority request.",
  ],
  outputs: [
    "A response providing only requested identity or verification information.",
    "A reviewed, exact PDF packet with supporting documentation.",
    "A confirmed submission method that protects your personal information.",
    "Secure delivery confirmation and proof retained with the matter.",
  ],
  faqs: [
    [
      "Why is the IRS requesting identity information?",
      "The IRS may request identity verification if there are questions about who claimed an item on a return, or to verify authority to represent a taxpayer.",
    ],
    [
      "What information should I provide?",
      "Provide only the identity or authority information specifically requested in the notice. Do not volunteer additional personal information.",
    ],
    [
      "How should I send identity information securely?",
      "This workflow helps you send identity information securely. Never email or send personal information unless the IRS specifically authorizes it.",
    ],
    [
      "What if I'm concerned about identity theft?",
      "If you believe the request may be fraudulent, contact the IRS directly at the number on your official tax return or IRS notice before responding.",
    ],
  ],
  workspaceHighlights: [
    ["Information analysis", "Identify exactly what identity information is being requested."],
    ["Verification gathering", "Organize supporting identification and verification documents."],
    ["Secure response preparation", "Prepare response with secure, limited information disclosure."],
  ],
  workflowSteps: [
    ["Upload the notice", "Add the IRS notice requesting identity information."],
    ["Analyze request", "Review the specific identity or authority information requested."],
    ["Gather verification", "Add supporting identification and verification documents."],
    ["Prepare response", "Draft your response providing only requested information."],
    ["Submit securely", "Approve and submit using secure method specified by IRS."],
  ],
  readyItems: [
    ["IRS notice", "The complete notice with specific information requested."],
    ["Identity verification", "Government-issued ID or documentation verifying identity."],
    ["Authority documentation", "If claiming business status or capacity."],
    ["Prior correspondence", "Any prior IRS letters about this identity issue."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
