import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "commercial-building-permit",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/commercial-building-permit",
  startPath: "/permit-reply/workflows/commercial-building-permit/start",
  title: "Commercial Building Permit",
  seoTitle: "Commercial Building Permit | Permit Reply | MailMyPDF",
  seoDescription: "Use the Commercial Building Permit workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Commercial Building Permit",
  heroDescription: "Use a guided commercial building permit workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
