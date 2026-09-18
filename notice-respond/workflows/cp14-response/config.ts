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
  indexable: false,
  contentStatus: "reviewed",
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
} as const satisfies WorkflowLandingConfig

export default workflowConfig
