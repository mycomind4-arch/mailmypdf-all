import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "state-tax-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/state-tax-notice-response",
  startPath: "/notice-respond/workflows/state-tax-notice-response/start",
  title: "State Tax Notice Response",
  seoTitle: "State Tax Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to state tax notice with supporting documentation, corrected reporting, or payment plan, exact review, and proof retention.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to a State Tax Notice",
  heroDescription: "Start with the state tax notice, understand the tax issue and deadline, gather supporting documentation, prepare your response, review the exact packet, and retain proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual state tax notice you received, not a generic response.",
    "Confirm the tax issue, amount due or adjustment, and response deadline.",
    "Gather supporting documentation: state tax returns, payment records, or evidence.",
    "Prepare a factual response and review the exact packet before mailing.",
  ],
  whatYouNeed: [
    "The complete state tax notice with issue and deadline.",
    "State tax return(s) for the relevant tax year.",
    "Supporting documentation: receipts, records, or evidence.",
    "Prior correspondence with the state tax authority.",
  ],
  outputs: [
    "A response to the state tax issue with supporting documentation.",
    "A reviewed, exact PDF packet with all supporting evidence.",
    "A confirmed response deadline and submission method.",
    "Mailing tracking and proof retained with the matter.",
  ],
  faqs: [
    [
      "What causes a state tax notice?",
      "State tax notices typically address: tax assessments, payment issues, mismatches with reported income, or requests for documentation.",
    ],
    [
      "How is a state tax notice different from a federal IRS notice?",
      "State tax authorities operate independently from the IRS. A state notice must be addressed separately from any federal notice for the same tax year.",
    ],
    [
      "Can I respond to both federal and state notices with the same documentation?",
      "You can use similar documentation, but each authority requires a separate response following their procedures and address.",
    ],
    [
      "What if the state and IRS assessed different amounts?",
      "This is common. Address each separately. If your federal adjustment affects your state return, inform the state authority.",
    ],
  ],
  workspaceHighlights: [
    ["Notice analysis", "Identify the specific state tax issue and deadline."],
    ["Documentation gathering", "Organize state tax records and supporting evidence."],
    ["Response preparation", "Build response addressing the state tax issue."],
  ],
  workflowSteps: [
    ["Upload notice", "Add the state tax notice."],
    ["Analyze issue", "Identify tax issue and deadline."],
    ["Gather documentation", "Add state return and supporting evidence."],
    ["Prepare response", "Draft response addressing the state tax issue."],
    ["Submit and retain proof", "Approve and mail before deadline, retain proof."],
  ],
  readyItems: [
    ["State tax notice", "The complete state tax authority notice."],
    ["State tax return", "State return(s) for the relevant tax year."],
    ["Supporting documentation", "Records or evidence supporting your position."],
    ["Prior correspondence", "Previous state tax authority letters about this issue."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
