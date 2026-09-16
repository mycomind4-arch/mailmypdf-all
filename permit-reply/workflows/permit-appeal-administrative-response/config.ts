import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "permit-appeal-administrative-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/permit-appeal-administrative-response",
  startPath: "/permit-reply/workflows/permit-appeal-administrative-response/start",
  title: "Permit Appeal Administrative Response",
  seoTitle: "Permit Appeal Administrative Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Permit Appeal Administrative Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Permit Appeal Administrative Response",
  heroDescription: "Use a guided permit appeal administrative response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
