import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "zoning-permit-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/zoning-permit-response",
  startPath: "/permit-reply/workflows/zoning-permit-response/start",
  title: "Zoning Permit Response",
  seoTitle: "Zoning Permit Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Zoning Permit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Zoning Permit Response",
  heroDescription: "Use a guided zoning permit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
