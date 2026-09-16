import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "dmv-suspension-revocation-appeal",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/dmv-suspension-revocation-appeal",
  startPath: "/appeal-mail/workflows/dmv-suspension-revocation-appeal/start",
  title: "DMV Suspension Revocation Appeal",
  seoTitle: "DMV Suspension Revocation Appeal | Appeal Mail | MailMyPDF",
  seoDescription: "Use the DMV Suspension Revocation Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "DMV Suspension Revocation Appeal",
  heroDescription: "Use a guided dmv suspension revocation appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
