import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "cp14-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/cp14-response",
  startPath: "/notice-respond/workflows/cp14-response/start",
  title: "IRS CP14 Response",
  seoTitle: "IRS CP14 Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to an IRS CP14 balance-due notice with guided notice analysis, fact confirmation, supporting documents, response drafting, packet review, and mailing proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to an IRS CP14 Notice",
  heroDescription: "Start with the actual CP14 notice, confirm the balance and tax-period details, choose the appropriate response path, prepare supporting correspondence, review the exact packet, and retain mailing proof.",
  indexable: true,
  contentStatus: "reviewed",
  whatYouDo: [
    "Start from the actual CP14 notice you received, not a generic tax-notice template.",
    "Confirm the notice series, tax period, printed due date, and balance the IRS reports.",
    "Choose the response path that matches your situation: agree, disagree, already paid, or another documented response.",
    "Prepare factual, source-grounded correspondence and review the exact packet before it is ever mailed.",
  ],
  whatYouNeed: [
    "The complete CP14 notice, including the page that shows the response address and any payment or contact instructions",
    "Payment confirmations, canceled checks, or IRS payment records if you already paid some or all of the balance",
    "Any tax return, transcript, or prior correspondence relevant to the balance",
    "The mailing address you want to use as the return address on the outgoing response",
  ],
  outputs: [
    "A factual CP14 response drafted only from the notice and your confirmed facts",
    "A reviewed, exact PDF packet with any supporting records you chose to include",
    "A confirmed mailing destination and mail class before anything is sent",
    "Mailing tracking and proof retained with the matter after it ships",
  ],
  faqs: [
    [
      "What is an IRS CP14 notice?",
      "A CP14 is the first notice the IRS sends when its records show you have an unpaid balance on your tax account. It states the tax period, the amount due, and a response or payment date.",
    ],
    [
      "Do I have to pay the full amount right away?",
      "Not necessarily. This workflow lets you record whether you agree with the balance, disagree with it, have already paid some or all of it, or need to send another documented response such as a payment-plan or hardship request — it does not assume you owe the full amount.",
    ],
    [
      "What if I already paid this balance?",
      "Select \"I already paid some or all of this amount\" as your response path and include payment confirmations, canceled checks, or IRS payment records as supporting documents so the response can reference them.",
    ],
    [
      "Will this calculate my deadline or the exact amount for me?",
      "No. The workflow extracts the due date and balance exactly as printed on your notice and never calculates a substitute deadline or amount — you review and confirm every extracted detail before anything is drafted.",
    ],
    [
      "Can I review the letter and packet before it's mailed?",
      "Yes. Drafting, review, approval, payment, and mailing are separate steps, and the exact packet you approve is the exact packet that gets mailed.",
    ],
  ],
  workspaceHighlights: [
    ["Notice-first analysis", "Extract the CP14 notice number, tax period, balance, dates, and response instructions from the source notice."],
    ["Response-path guidance", "Record whether you agree with the balance, dispute it, already paid, or need a different documented response."],
    ["Complete mailing record", "Review, approve, mail, track, and retain proof for the exact response packet."],
  ],
  workflowSteps: [
    ["Upload the CP14", "Add the IRS CP14 notice you actually received."],
    ["Analyze and confirm", "Review the extracted balance, tax period, dates, and response instructions."],
    ["Choose your response", "Confirm whether you agree, disagree, already paid, or need another documented response."],
    ["Build and review", "Prepare the response and supporting packet, then review the exact PDF."],
    ["Pay and mail", "Approve the exact packet, complete payment, mail it, and retain tracking and proof."],
  ],
  readyItems: [
    ["CP14 notice", "The complete IRS CP14 notice, including the response address and any payment or contact instructions."],
    ["Payment records", "If relevant, proof of payment, canceled checks, bank records, or IRS payment confirmations."],
    ["Tax records", "Any return, transcript, account record, or correspondence relevant to the balance you are addressing."],
    ["Your mailing address", "The return address to use for the outgoing response."],
  ],
  primaryCtaLabel: "Start CP14 Response",
  secondaryCtaLabel: "See how it works",
  overview: "An IRS CP14 is a balance-due notice. The IRS says to read the notice carefully, verify the amount and due date, pay by the date shown if you agree, consider a payment plan if you cannot pay in full, and contact the IRS if you disagree. This workflow starts from your actual CP14 so the response stays tied to the tax period, balance, dates, and instructions printed on your notice.",
  responseOptions: [
    ["Address the balance", "Use the notice details to organize the payment or other documented response path you intend to take."],
    ["Disagree with the balance", "Record why the amount or account status appears wrong and connect the records that support your position."],
    ["Already paid or corrected it", "Document the payment or corrective action and include the records you want referenced in the response."],
    ["Payment arrangement or hardship", "Organize the facts for a payment-arrangement or hardship-related communication without inventing amounts or claims."],
  ],
  commonMistakes: [
    "Using a generic IRS address instead of the contact or mailing instructions printed on the actual notice.",
    "Replacing the printed due date with a calculated or assumed deadline.",
    "Disputing the balance without attaching or identifying the payment, return, transcript, or other record that supports the disagreement.",
    "Mailing correspondence before reviewing the exact letter, attachments, destination, and tax-period details.",
  ],
  sources: [
    { title: "Understanding your CP14 notice", publisher: "Internal Revenue Service", href: "https://www.irs.gov/individuals/understanding-your-cp14-notice" },
    { title: "Responding to a notice", publisher: "Internal Revenue Service", href: "https://www.irs.gov/individuals/responding-to-a-notice" },
  ],
  disclaimer: "MailMyPDF helps organize your notice, facts, supporting records, correspondence, and mailing proof. It does not provide tax or legal advice or guarantee an IRS outcome. Follow the instructions and dates on your own notice.",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
