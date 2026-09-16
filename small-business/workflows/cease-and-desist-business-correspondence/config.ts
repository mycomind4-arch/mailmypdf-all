import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "cease-and-desist-business-correspondence",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/cease-and-desist-business-correspondence",
  startPath: "/small-business/workflows/cease-and-desist-business-correspondence/start",
  title: "Cease And Desist Business Correspondence",
  seoTitle: "Cease And Desist Business Correspondence | Small Business | MailMyPDF",
  seoDescription: "Use the Cease And Desist Business Correspondence workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Cease And Desist Business Correspondence",
  heroDescription: "Use a guided cease and desist business correspondence workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
