import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "irs-balance-due-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/irs-balance-due-notice-response",
  startPath: "/notice-respond/workflows/irs-balance-due-notice-response/start",
  title: "IRS Balance Due Notice Response",
  seoTitle: "IRS Balance Due Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to IRS balance due notice with payment plan proposal, hardship claim, or dispute, guided preparation, exact review, and proof retention.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to an IRS Balance Due Notice",
  heroDescription: "Start with the IRS balance due notice, confirm the tax liability amount, explore payment or dispute options, prepare your response, review the exact packet, and retain all proof.",
  indexable: true,
  contentStatus: "published",
  discovery: {
    primaryQuestion: "How do I respond to an IRS balance due notice?",
    alternateQuestions: [
      "What should I do if I cannot pay an IRS balance due notice in full?",
      "How do I dispute an IRS balance due notice I believe is incorrect?",
      "What documents should I gather before responding to an IRS balance due notice?",
    ],
    agency: "Internal Revenue Service",
    jurisdiction: "United States",
    documentType: "IRS balance due notice",
  },
  whatYouDo: [
    "Start from the actual IRS balance due notice you received, not a generic template.",
    "Confirm the tax year, amount due, penalties and interest, and payment deadline.",
    "Review your options: pay in full, propose a payment plan, claim hardship, or dispute the liability.",
    "Prepare your response with supporting documentation and review the exact packet before mailing.",
  ],
  whatYouNeed: [
    "The complete IRS balance due notice with tax year and amount due.",
    "Information about the tax liability and how it was assessed.",
    "If proposing a payment plan: income and expense information.",
    "If claiming hardship: documentation of financial hardship.",
    "If disputing: evidence that the liability is incorrect.",
  ],
  outputs: [
    "Payment confirmation, payment plan proposal, hardship claim, or dispute letter.",
    "A reviewed, exact PDF packet with supporting documentation.",
    "A confirmed payment deadline or response method before anything is mailed.",
    "Payment confirmation or mailing proof retained with the matter.",
  ],
  faqs: [
    [
      "What is an IRS balance due notice?",
      "A balance due notice is an IRS letter stating you owe taxes for a specific tax year. It includes the amount due, interest, penalties, and a deadline to pay or respond.",
    ],
    [
      "What are my options if I can't pay the full amount?",
      "You can propose a payment plan (installment agreement) with the IRS, claim financial hardship if you have severe difficulty, or dispute the liability if you believe it is incorrect.",
    ],
    [
      "How do I propose a payment plan?",
      "You can set up a payment plan by mail, phone, or online through IRS.gov. This workflow helps you prepare a formal proposal letter with your financial information.",
    ],
    [
      "What if I ignore the notice?",
      "The IRS can take collection action, including wage garnishment, bank levy, or property liens. It is important to respond or make arrangements within the timeframe specified.",
    ],
  ],
  workspaceHighlights: [
    ["Balance analysis", "Extract the tax amount, penalties, and payment deadline."],
    ["Option evaluation", "Prepare payment, plan, hardship, or dispute response."],
    ["Response preparation", "Build and review your complete response with documentation."],
  ],
  workflowSteps: [
    ["Upload the notice", "Add the IRS balance due notice."],
    ["Analyze the debt", "Review the amount due, penalties, interest, and deadline."],
    ["Evaluate options", "Decide whether to pay, propose a plan, claim hardship, or dispute."],
    ["Prepare response", "Gather documentation and prepare your complete response."],
    ["Submit and retain proof", "Approve and mail before the deadline, retain all proof."],
  ],
  readyItems: [
    ["Balance due notice", "The complete notice with tax year and amount due."],
    ["Financial information", "Income and expenses if proposing a payment plan."],
    ["Supporting documentation", "Hardship evidence or dispute documentation if applicable."],
    ["Prior correspondence", "Any previous IRS letters about this tax liability."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
