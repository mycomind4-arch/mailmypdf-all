import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "occupancy-permit-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/occupancy-permit-response",
  startPath: "/permit-reply/workflows/occupancy-permit-response/start",
  title: "Occupancy Permit Response",
  seoTitle: "Occupancy Permit Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Occupancy Permit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Occupancy Permit Response",
  heroDescription: "Use a guided occupancy permit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
