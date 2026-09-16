import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "permit-deficiency-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/permit-deficiency-response",
  startPath: "/permit-reply/workflows/permit-deficiency-response/start",
  title: "Permit Deficiency Response",
  seoTitle: "Permit Deficiency Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Permit Deficiency Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Permit Deficiency Response",
  heroDescription: "Use a guided permit deficiency response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
