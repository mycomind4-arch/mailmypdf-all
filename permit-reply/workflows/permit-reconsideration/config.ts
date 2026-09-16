import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "permit-reconsideration",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/permit-reconsideration",
  startPath: "/permit-reply/workflows/permit-reconsideration/start",
  title: "Permit Reconsideration",
  seoTitle: "Permit Reconsideration | Permit Reply | MailMyPDF",
  seoDescription: "Use the Permit Reconsideration workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Permit Reconsideration",
  heroDescription: "Use a guided permit reconsideration workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
