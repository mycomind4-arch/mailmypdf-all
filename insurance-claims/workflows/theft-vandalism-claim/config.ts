import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "theft-vandalism-claim",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/theft-vandalism-claim",
  startPath: "/insurance-claims/workflows/theft-vandalism-claim/start",
  title: "Theft Vandalism Claim",
  seoTitle: "Theft Vandalism Claim | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Theft Vandalism Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Theft Vandalism Claim",
  heroDescription: "Use a guided theft vandalism claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
