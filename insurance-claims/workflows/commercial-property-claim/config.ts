import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "commercial-property-claim",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/commercial-property-claim",
  startPath: "/insurance-claims/workflows/commercial-property-claim/start",
  title: "Commercial Property Claim",
  seoTitle: "Commercial Property Claim | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Commercial Property Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Commercial Property Claim",
  heroDescription: "Use a guided commercial property claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
