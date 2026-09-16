import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "deck-permit-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/deck-permit-response",
  startPath: "/permit-reply/workflows/deck-permit-response/start",
  title: "Deck Permit Response",
  seoTitle: "Deck Permit Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Deck Permit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Deck Permit Response",
  heroDescription: "Use a guided deck permit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
