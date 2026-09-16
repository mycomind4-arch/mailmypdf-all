import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "mechanical-permit-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/mechanical-permit-response",
  startPath: "/permit-reply/workflows/mechanical-permit-response/start",
  title: "Mechanical Permit Response",
  seoTitle: "Mechanical Permit Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Mechanical Permit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Mechanical Permit Response",
  heroDescription: "Use a guided mechanical permit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
