import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "reroof-permit-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/reroof-permit-response",
  startPath: "/permit-reply/workflows/reroof-permit-response/start",
  title: "Reroof Permit Response",
  seoTitle: "Reroof Permit Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Reroof Permit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Reroof Permit Response",
  heroDescription: "Use a guided reroof permit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
