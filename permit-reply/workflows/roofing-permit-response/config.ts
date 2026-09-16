import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "roofing-permit-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/roofing-permit-response",
  startPath: "/permit-reply/workflows/roofing-permit-response/start",
  title: "Roofing Permit Response",
  seoTitle: "Roofing Permit Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Roofing Permit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Roofing Permit Response",
  heroDescription: "Use a guided roofing permit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
