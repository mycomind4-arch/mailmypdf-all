import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "cp3219a-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/cp3219a-response",
  startPath: "/notice-respond/workflows/cp3219a-response/start",
  title: "CP3219-A Response",
  seoTitle: "CP3219-A Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to IRS CP3219-A notice (verification of tax return information) with guided analysis, documentation, response preparation, exact review, and mailing proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to CP3219-A Notice",
  heroDescription: "Start with the actual CP3219-A notice from the IRS, confirm the items being questioned, gather supporting documentation, prepare your response, review the exact packet, and retain mailing proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual CP3219-A notice you received from the IRS, not a generic template.",
    "Confirm the tax year, items being verified, and the response deadline.",
    "Gather all supporting documentation: receipts, invoices, records, or explanations for the questioned items.",
    "Prepare a detailed response grounded in your documentation and review the exact packet before mailing.",
  ],
  whatYouNeed: [
    "The complete CP3219-A notice with the specific tax year and items being questioned.",
    "Supporting documentation: receipts, invoices, statements, or records for the questioned items.",
    "Your tax return for the year in question.",
    "Any prior correspondence with the IRS about this verification.",
  ],
  outputs: [
    "A detailed response to the IRS verification request grounded in your documentation.",
    "A reviewed, exact PDF packet with all supporting documentation you are submitting.",
    "A confirmed response deadline and submission method before anything is mailed.",
    "Mailing tracking and proof retained with the matter after submission.",
  ],
  faqs: [
    [
      "What is a CP3219-A notice?",
      "The CP3219-A is an IRS notice requesting verification of information reported on your tax return. The IRS wants you to provide documentation supporting specific items such as income, deductions, or credits.",
    ],
    [
      "What should I include in my response?",
      "Include only the supporting documentation that directly addresses the items the IRS is questioning. Organize your documents clearly and include a brief explanation if needed.",
    ],
    [
      "What happens if I don't respond?",
      "If you don't respond by the deadline, the IRS may adjust your return based on the information they have, which could result in a tax deficiency and interest or penalties.",
    ],
    [
      "Do I need to send originals?",
      "No. The IRS typically accepts copies of supporting documentation. Keep your original documents for your records.",
    ],
  ],
  workspaceHighlights: [
    ["Verification analysis", "Extract the tax year and items being questioned from the CP3219-A."],
    ["Documentation organization", "Gather and organize supporting documents for each questioned item."],
    ["Response preparation", "Build and review your complete response packet before submission."],
  ],
  workflowSteps: [
    ["Upload the CP3219-A notice", "Add the IRS notice you received."],
    ["Analyze verification items", "Review the extracted tax year, items questioned, and deadline."],
    ["Organize documentation", "Add all supporting documents for the questioned items."],
    ["Build and review", "Prepare your response and supporting packet, then review all documents."],
    ["Submit and retain proof", "Approve and mail before the deadline, retain mailing proof."],
  ],
  readyItems: [
    ["CP3219-A notice", "The complete notice with the tax year and items being questioned."],
    ["Supporting documentation", "Receipts, invoices, statements, or records for each questioned item."],
    ["Tax return", "Your tax return for the year in question."],
    ["Prior correspondence", "Any previous IRS letters or correspondence about this verification."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
