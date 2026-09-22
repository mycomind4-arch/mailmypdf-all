import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "cp90-collection-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/cp90-collection-notice-response",
  startPath: "/notice-respond/workflows/cp90-collection-notice-response/start",
  title: "CP90 Final Notice of Intent to Levy",
  seoTitle: "CP90 Final Notice of Intent to Levy | Notice Respond | MailMyPDF",
  seoDescription: "Respond to IRS CP90 (Final Notice of Intent to Levy) with guided analysis, hardship documentation, payment plan options, response preparation, exact review, and mailing proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to CP90 Final Notice of Intent to Levy",
  heroDescription: "Start with the CP90 notice from the IRS, understand the collection deadline and your appeal rights, gather any hardship or payment plan documentation, prepare your response, review the exact packet, and retain mailing proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual CP90 notice you received from the IRS, not a generic template.",
    "Confirm the tax debt amount, collection deadline, and your right to request an appeal or hearing.",
    "Gather any documentation of financial hardship, payment capacity, or proposed payment arrangements.",
    "Prepare a detailed response explaining your situation and propose a solution, then review the exact packet before mailing.",
  ],
  whatYouNeed: [
    "The complete CP90 Final Notice with the tax amount, deadline, and appeal rights.",
    "Documentation of your financial situation: income, expenses, assets, and liabilities.",
    "Any prior IRS notices or correspondence about this tax debt.",
    "Information about any proposed payment arrangement or financial hardship claim.",
  ],
  outputs: [
    "A detailed response explaining your financial situation and proposing a solution.",
    "A reviewed, exact PDF packet with supporting financial documentation.",
    "A confirmed response deadline and submission method before anything is mailed.",
    "Mailing tracking and proof retained with the matter after submission.",
  ],
  faqs: [
    [
      "What is a CP90 notice?",
      "The CP90 is the IRS's Final Notice of Intent to Levy. It means the IRS intends to seize your assets if you don't pay, and you have limited time to respond or request a hearing.",
    ],
    [
      "Can I stop a levy?",
      "Yes. You can request a Collection Due Process (CDP) hearing or Equivalent Hearing within 30 days of the CP90, which temporarily halts collection action while your appeal is considered.",
    ],
    [
      "What are my options to respond?",
      "You can request a hearing, propose a payment plan, claim financial hardship, or dispute the tax liability if you have valid grounds.",
    ],
    [
      "What happens if I don't respond?",
      "If you don't respond or request a hearing within 30 days, the IRS can immediately seize wages, bank accounts, or property to satisfy the tax debt.",
    ],
  ],
  workspaceHighlights: [
    ["Levy analysis", "Extract the debt amount, deadline, and appeal rights from the CP90."],
    ["Financial documentation", "Gather supporting financial hardship or payment capacity documents."],
    ["Response preparation", "Build and review your complete response before submission."],
  ],
  workflowSteps: [
    ["Upload the CP90 notice", "Add the IRS Final Notice of Intent to Levy."],
    ["Analyze levy information", "Review the extracted tax amount, deadline, and appeal rights."],
    ["Gather financial info", "Add documentation of hardship or payment capacity."],
    ["Build and review", "Prepare your response and supporting packet, then review all documents."],
    ["Submit and retain proof", "Approve and mail before the deadline, retain mailing proof."],
  ],
  readyItems: [
    ["CP90 notice", "The Final Notice with the tax amount, deadline, and appeal rights."],
    ["Financial documentation", "Income, expenses, bank statements, or hardship letters."],
    ["Payment plan info", "If proposing a plan, details about your proposed payment arrangement."],
    ["Prior correspondence", "Any previous IRS letters about this tax debt."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
