import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "building-permit-denial-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/building-permit-denial-response",
  startPath: "/permit-reply/workflows/building-permit-denial-response/start",
  title: "Building Permit Denial Response",
  seoTitle: "Building Permit Denial Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Building Permit Denial Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Building Permit Denial Response",
  heroDescription: "Use a guided building permit denial response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
