import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "irs-audit-letter-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/irs-audit-letter-response",
  startPath: "/notice-respond/workflows/irs-audit-letter-response/start",
  title: "IRS Audit Letter Response",
  seoTitle: "IRS Audit Letter Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to IRS audit notice with documentation, exact submission review, scheduling confirmation, and retention of audit correspondence.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to an IRS Audit Notice",
  heroDescription: "Start with the IRS audit notice, confirm the examination scope and deadline, gather required documentation, schedule the audit, prepare your submission, and retain all correspondence.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual IRS audit notice you received, not a generic document.",
    "Confirm the tax year(s) being examined, the examination scope, and response deadline.",
    "Gather all requested documents and records before the audit date or submission deadline.",
    "Organize your records for easy reference during the audit and retain copies of all communications.",
  ],
  whatYouNeed: [
    "The complete IRS audit notice with tax year(s), scope, and deadline.",
    "All documents and records the IRS is requesting for the examination.",
    "Your tax return(s) for the year(s) being audited.",
    "Any prior correspondence with the IRS about this examination.",
  ],
  outputs: [
    "Organization of all requested documents by category and date.",
    "Confirmation of audit meeting date and location.",
    "A summary document listing all items provided to the IRS.",
    "A complete audit file retained for your records.",
  ],
  faqs: [
    [
      "What is an IRS audit?",
      "An IRS audit is an examination of your tax return to verify that income, deductions, and other items reported are accurate and supported by documentation.",
    ],
    [
      "How do I respond to an audit notice?",
      "Contact the IRS as directed in the notice to schedule an examination meeting or mail requested documents by the deadline specified.",
    ],
    [
      "What documents should I gather?",
      "Gather everything the IRS lists in the notice. For common audits, this includes receipts, invoices, bank statements, cancelled checks, and records supporting claimed deductions.",
    ],
    [
      "Can I request an extension?",
      "Yes. If you cannot meet the deadline, contact the IRS office listed in the notice to request an extension before the deadline expires.",
    ],
  ],
  workspaceHighlights: [
    ["Audit scope analysis", "Extract examination scope and documentation requirements."],
    ["Document organization", "Gather and organize all requested records by category."],
    ["Audit preparation", "Confirm meeting details and prepare a complete audit file."],
  ],
  workflowSteps: [
    ["Upload the audit notice", "Add the IRS letter starting the examination."],
    ["Review scope and deadline", "Analyze the tax year(s), scope, and response deadline."],
    ["Gather documents", "Add all requested records and supporting documentation."],
    ["Organize for audit", "Arrange documents by category and prepare a summary listing."],
    ["Retain complete file", "Maintain a copy of all audit correspondence and documents."],
  ],
  readyItems: [
    ["Audit notice", "The complete IRS notice with scope, deadline, and requirements."],
    ["Requested documents", "All records, receipts, and documentation the IRS requested."],
    ["Tax returns", "Copies of the tax return(s) for the year(s) being audited."],
    ["Prior correspondence", "Any previous IRS letters about this examination."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
