import type { WorkflowLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/sap-appeal-hero.jpg"

export const workflowConfig = {
  id: "sap-appeal",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/sap-appeal",
  startPath: "/appeal-mail/workflows/sap-appeal/start",
  title: "SAP Appeal",
  seoTitle: "SAP Appeal | Appeal Mail | MailMyPDF",
  seoDescription: "Use the SAP Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "SAP Appeal",
  heroDescription: "Use a guided sap appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  heroImage,
  heroImageAlt: "Financial aid appeal for satisfactory academic progress",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
