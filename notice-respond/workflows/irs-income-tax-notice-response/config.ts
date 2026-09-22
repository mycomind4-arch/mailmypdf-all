import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "irs-income-tax-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/irs-income-tax-notice-response",
  startPath: "/notice-respond/workflows/irs-income-tax-notice-response/start",
  title: "IRS Income Tax Notice Response",
  seoTitle: "IRS Income Tax Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to IRS income tax notice with supporting evidence, corrected information, or protest, exact review, and proof retention.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to an IRS Income Tax Notice",
  heroDescription: "Start with the IRS income tax notice, confirm the specific items in question, gather supporting evidence, prepare your response or protest, review the exact packet, and retain proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual IRS income tax notice you received, not a generic template.",
    "Confirm the specific income items, deductions, or credits the IRS is questioning.",
    "Gather supporting documentation from the tax year in question.",
    "Prepare a factual response addressing the questioned items and review the exact packet before mailing.",
  ],
  whatYouNeed: [
    "The complete IRS income tax notice with specific questioned items.",
    "Tax records and supporting documentation from the year in question.",
    "W-2 forms, 1099s, business income records, or other income documentation.",
    "Deduction records if deductions are being questioned.",
  ],
  outputs: [
    "A response addressing each questioned income item with supporting evidence.",
    "A reviewed, exact PDF packet with all supporting documentation.",
    "A confirmed submission deadline and method before anything is mailed.",
    "Mailing tracking and proof retained with the matter.",
  ],
  faqs: [
    [
      "Why did the IRS question my income?",
      "The IRS may question reported income due to mismatches with documents like W-2s or 1099s, or if reported income differs from IRS records.",
    ],
    [
      "What documentation should I provide?",
      "Provide the original documents supporting your reported income: W-2 forms, 1099s, invoices, contracts, or other contemporaneous business records.",
    ],
    [
      "Can I provide an explanation letter?",
      "Yes. A clear explanation of any discrepancies, combined with supporting documentation, strengthens your response.",
    ],
    [
      "What if I made an error on my return?",
      "You can correct the error in your response. A corrected return or explanation showing the correction may resolve the issue.",
    ],
  ],
  workspaceHighlights: [
    ["Income review", "Analyze specific income items the IRS is questioning."],
    ["Documentation gathering", "Organize income records and supporting documents."],
    ["Response preparation", "Build response addressing each questioned income item."],
  ],
  workflowSteps: [
    ["Upload the notice", "Add the IRS income tax notice."],
    ["Review questioned items", "Identify specific income items in question."],
    ["Gather documentation", "Add W-2s, 1099s, and income records from that tax year."],
    ["Prepare response", "Address each questioned item with evidence."],
    ["Submit and retain proof", "Approve and mail before deadline, retain proof."],
  ],
  readyItems: [
    ["IRS notice", "The complete income tax notice with questioned items."],
    ["Income documentation", "W-2 forms, 1099s, or business income records."],
    ["Tax return", "A copy of the tax return that reported the questioned income."],
    ["Corrected documents", "If corrections are needed, documentation of the corrections."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
