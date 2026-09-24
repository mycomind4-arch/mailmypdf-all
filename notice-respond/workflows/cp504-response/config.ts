import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "cp504-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/cp504-response",
  startPath: "/notice-respond/workflows/cp504-response/start",
  title: "IRS CP504 Response",
  seoTitle: "IRS CP504 Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to an IRS CP504 Notice of Intent to Levy with guided notice analysis, fact confirmation, supporting documents, response drafting, packet review, and mailing proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to an IRS CP504 Notice",
  heroDescription: "Start with the actual CP504 notice you received, confirm the tax period, amount due, and printed dates the IRS reports, choose the response path that matches your situation, prepare factual correspondence, review the exact packet, and retain mailing proof.",
  indexable: true,
  contentStatus: "reviewed",
  whatYouDo: [
    "Start from the actual CP504 notice you received, not a generic collection-notice template.",
    "Confirm the notice details the IRS reports: tax period, notice date, amount due, and any printed action or payment date.",
    "Choose the response path that matches your situation: disagree with the balance or account status, already paid or took corrective action, discuss payment arrangements, explain a financial hardship, or send other documented correspondence.",
    "Prepare factual, source-grounded correspondence and review the exact packet before it is ever mailed.",
  ],
  whatYouNeed: [
    "The complete CP504 notice, including any page describing payment, contact, or appeal instructions",
    "Payment confirmations, canceled checks, or IRS payment records if you already paid or took corrective action",
    "Any tax return, IRS transcript, account record, or prior correspondence relevant to the balance",
    "The mailing address you want to use as the return address on the outgoing response",
  ],
  outputs: [
    "A factual CP504 response drafted only from the notice and your confirmed facts",
    "A reviewed, exact PDF packet with any supporting records you chose to include",
    "A confirmed mailing destination and mail class before anything is sent",
    "Mailing tracking and proof retained with the matter after it ships",
  ],
  faqs: [
    [
      "What is an IRS CP504 notice?",
      "A CP504 is an IRS Notice of Intent to Levy issued under IRC section 6331(d). It states the tax period, the amount the IRS reports as due, and any action or payment date, identifiers, payment or contact instructions, and collection warnings printed on the notice.",
    ],
    [
      "Does mailing a response through this workflow stop a levy or protect my appeal rights?",
      "No. This workflow does not state or imply that the letter itself files a Collection Appeals Program (CAP) appeal, requests a Collection Due Process (CDP) hearing, suspends collection, stops a levy, or guarantees any outcome. If your CP504 describes CAP rights, or you separately receive a CDP notice, those are distinct, notice-controlled processes with their own forms and instructions that you must follow on their own terms.",
    ],
    [
      "Will this calculate my deadline or file Form 9423 or Form 12153 for me?",
      "No. The workflow extracts the dates and amount exactly as printed on your notice and never calculates a substitute deadline. It does not prepare or represent a generic response letter as Form 9423 (Collection Appeal Request) or Form 12153 (Request for a Collection Due Process Hearing) — those are separate, formal filings you would complete on their own terms if you choose to use them.",
    ],
    [
      "What if I already paid this balance or took corrective action?",
      "Select \"I already paid or took corrective action\" as your response path and include payment confirmations, canceled checks, IRS transcripts, or other records as supporting documents so the response can reference them.",
    ],
    [
      "What if I can't pay and need to discuss payment arrangements or hardship?",
      "Select \"I need to address payment arrangements\" or \"I need to explain a financial-hardship situation\" as your response path. The workflow records only the facts you confirm — it does not invent payment amounts, arrangements, or hardship claims on your behalf.",
    ],
    [
      "Can I review the letter and packet before it's mailed?",
      "Yes. Drafting, review, approval, payment, and mailing are separate steps, and the exact packet you approve is the exact packet that gets mailed.",
    ],
  ],
  workspaceHighlights: [
    ["Notice-first analysis", "Extract the CP504 tax period, notice date, amount due, printed action date, and collection warnings from the source notice — never a calculated deadline."],
    ["Response-path guidance", "Record whether you disagree with the balance or account status, already paid or took corrective action, need payment arrangements, have a hardship, or need other documented correspondence."],
    ["Complete mailing record", "Review, approve, mail, track, and retain proof for the exact response packet."],
  ],
  workflowSteps: [
    ["Upload the CP504", "Add the IRS CP504 Notice of Intent to Levy you actually received."],
    ["Analyze and confirm", "Review the extracted tax period, amount due, dates, and collection warnings."],
    ["Choose your response", "Confirm whether you disagree, already paid, need payment arrangements, have a hardship, or need another documented response."],
    ["Build and review", "Prepare the response and supporting packet, then review the exact PDF."],
    ["Pay and mail", "Approve the exact packet, complete payment, mail it, and retain tracking and proof."],
  ],
  readyItems: [
    ["CP504 notice", "The complete IRS CP504 Notice of Intent to Levy, including any payment, contact, or appeal instructions printed on it."],
    ["Payment records", "If relevant, proof of payment, canceled checks, bank records, or IRS payment confirmations."],
    ["Tax records", "Any return, IRS transcript, account record, or correspondence relevant to the balance you are addressing."],
    ["Your mailing address", "The return address to use for the outgoing response."],
  ],
  primaryCtaLabel: "Start CP504 Response",
  secondaryCtaLabel: "See how it works",
  overview: "The IRS describes CP504 as a Notice of Intent to Levy for an unpaid balance. The notice explains the amount due, payment options, collection warnings, and how to contact the IRS if you disagree. This workflow does not treat a generic response letter as an appeal or as a way to stop collection; it helps you organize the actual notice, your chosen response path, supporting records, and a reviewed mailing packet.",
  responseOptions: [
    ["Disagree with the balance or account status", "Document the specific issue and connect the records that support your position."],
    ["Already paid or took corrective action", "Organize payment confirmations, transcripts, or other records showing what has already happened."],
    ["Address payment arrangements", "Prepare factual correspondence about the payment-arrangement path you intend to pursue without inventing terms or amounts."],
    ["Explain a financial-hardship situation", "Organize the facts and records you choose to provide while keeping any formal IRS process separate from this correspondence workflow."],
  ],
  commonMistakes: [
    "Assuming that mailing a response letter automatically stops a levy or preserves a separate appeal right.",
    "Calculating a substitute deadline instead of following the dates and appeal instructions printed on the notice.",
    "Using a generic IRS address instead of the contact or mailing instructions on the actual CP504.",
    "Referring to a payment, hardship, or corrective action without including the records that support the statement.",
    "Mailing the packet before reviewing the exact response, attachments, destination, and tax-period details.",
  ],
  sources: [
    { title: "Understanding your CP504 notice", publisher: "Internal Revenue Service", href: "https://www.irs.gov/individuals/understanding-your-cp504-notice" },
    { title: "Responding to a notice", publisher: "Internal Revenue Service", href: "https://www.irs.gov/individuals/responding-to-a-notice" },
  ],
  disclaimer: "MailMyPDF helps organize your CP504, facts, supporting records, correspondence, and mailing proof. It does not file a CAP or CDP appeal, stop a levy, provide tax or legal advice, or guarantee an IRS outcome. Follow the instructions and dates on your own notice.",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
