import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "food-stamp-appeal",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/food-stamp-appeal",
  startPath: "/benefits-appeal/workflows/food-stamp-appeal/start",
  title: "Food Stamp Appeal",
  seoTitle: "Food Stamp Appeal | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the Food Stamp Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "Food Stamp Appeal",
  heroDescription: "Use a guided food stamp appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
