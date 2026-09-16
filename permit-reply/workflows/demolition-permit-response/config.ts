import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "demolition-permit-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/demolition-permit-response",
  startPath: "/permit-reply/workflows/demolition-permit-response/start",
  title: "Demolition Permit Response",
  seoTitle: "Demolition Permit Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Demolition Permit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Demolition Permit Response",
  heroDescription: "Use a guided demolition permit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
