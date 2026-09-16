import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "dash-camera-evidence-review",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/dash-camera-evidence-review",
  startPath: "/legal-defense/workflows/dash-camera-evidence-review/start",
  title: "Dash Camera Evidence Review",
  seoTitle: "Dash Camera Evidence Review | Legal Defense | MailMyPDF",
  seoDescription: "Use the Dash Camera Evidence Review workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Dash Camera Evidence Review",
  heroDescription: "Use a guided dash camera evidence review workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
