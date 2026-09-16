import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "construction-permit-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/construction-permit-response",
  startPath: "/permit-reply/workflows/construction-permit-response/start",
  title: "Construction Permit Response",
  seoTitle: "Construction Permit Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Construction Permit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Construction Permit Response",
  heroDescription: "Use a guided construction permit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
