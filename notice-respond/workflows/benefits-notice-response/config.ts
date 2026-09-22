import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "benefits-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/benefits-notice-response",
  startPath: "/notice-respond/workflows/benefits-notice-response/start",
  title: "Benefits Denial Notice Response",
  seoTitle: "Benefits Denial Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to a government benefits denial notice with guided fact confirmation, supporting evidence, appeal letter preparation, packet review, and mailing proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to a Benefits Denial Notice",
  heroDescription: "Start with the actual benefits denial notice, confirm the decision and denial reason, gather supporting evidence, prepare your appeal, review the exact packet, and retain mailing proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual benefits denial notice you received, not a generic template.",
    "Confirm the benefit type, denial reason, and appeal deadline stated in the notice.",
    "Gather supporting evidence that addresses the specific denial reason.",
    "Prepare factual, source-grounded appeal correspondence and review the exact packet before it is mailed.",
  ],
  whatYouNeed: [
    "The complete benefits denial notice with the appeal deadline and instructions.",
    "Supporting documents relevant to the denial reason (medical records, income verification, employment letters, etc.).",
    "Any prior correspondence about your benefits claim.",
    "The mailing address for submitting your appeal.",
  ],
  outputs: [
    "An appeal letter addressing the specific denial reason with your supporting facts.",
    "A reviewed, exact PDF packet with all supporting documents you chose to include.",
    "Confirmation of the appeal deadline and submission method before anything is sent.",
    "Mailing tracking and proof retained with your appeal record.",
  ],
  faqs: [
    [
      "What benefits can I appeal?",
      "Most government benefits including Social Security, Disability, Unemployment, SNAP, Housing Assistance, and other programs allow appeals of denial notices. Check your notice for the appeal deadline and process.",
    ],
    [
      "What is the appeal deadline?",
      "The deadline is stated in your denial notice. Appeal deadlines vary by program (often 30-60 days) and missing the deadline can prevent you from appealing. This workflow ensures you track and meet the deadline.",
    ],
    [
      "What evidence should I include?",
      "Include only evidence directly addressing the reason your benefits were denied. For example, if denied for income, include pay stubs or tax returns. If denied for disability, include medical evidence.",
    ],
  ],
  workspaceHighlights: [
    ["Notice-first analysis", "Extract the denial reason, benefit type, and appeal deadline from the source notice."],
    ["Evidence organization", "Organize supporting documents that address the specific denial reason."],
    ["Complete appeal record", "Draft, review, mail, track, and retain proof for your exact appeal package."],
  ],
  workflowSteps: [
    ["Upload the notice", "Add the benefits denial notice you received."],
    ["Analyze and confirm", "Review the extracted denial reason, benefit type, and appeal deadline."],
    ["Organize evidence", "Add supporting documents relevant to why your benefits should be approved."],
    ["Build and review", "Prepare your appeal and supporting package, then review the exact documents."],
    ["Submit and retain proof", "Mail your appeal before the deadline and keep the mailing proof."],
  ],
  readyItems: [
    ["Denial notice", "The complete benefits denial notice with appeal deadline and instructions."],
    ["Supporting evidence", "Documents addressing the specific reason benefits were denied."],
    ["Prior records", "Any relevant prior correspondence about your benefits claim."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
