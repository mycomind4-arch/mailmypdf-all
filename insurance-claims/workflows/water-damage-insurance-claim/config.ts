import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "water-damage-insurance-claim",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/water-damage-insurance-claim",
  startPath: "/insurance-claims/workflows/water-damage-insurance-claim/start",
  title: "Water Damage Insurance Claim",
  seoTitle: "Water Damage Insurance Claim | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Water Damage Insurance Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Water Damage Insurance Claim",
  heroDescription: "Use a guided water damage insurance claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
