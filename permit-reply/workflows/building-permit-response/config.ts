import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "building-permit-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/building-permit-response",
  startPath: "/permit-reply/workflows/building-permit-response/start",
  title: "Building Permit Response",
  seoTitle: "Building Permit Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Building Permit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Building Permit Response",
  heroDescription: "Use a guided building permit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
