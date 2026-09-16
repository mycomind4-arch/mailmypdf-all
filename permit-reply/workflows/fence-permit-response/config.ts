import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "fence-permit-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/fence-permit-response",
  startPath: "/permit-reply/workflows/fence-permit-response/start",
  title: "Fence Permit Response",
  seoTitle: "Fence Permit Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Fence Permit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Fence Permit Response",
  heroDescription: "Use a guided fence permit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
