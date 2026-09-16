import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "utility-permit-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/utility-permit-response",
  startPath: "/permit-reply/workflows/utility-permit-response/start",
  title: "Utility Permit Response",
  seoTitle: "Utility Permit Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Utility Permit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Utility Permit Response",
  heroDescription: "Use a guided utility permit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
