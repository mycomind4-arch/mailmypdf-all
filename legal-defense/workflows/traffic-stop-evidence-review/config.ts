import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "traffic-stop-evidence-review",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/traffic-stop-evidence-review",
  startPath: "/legal-defense/workflows/traffic-stop-evidence-review/start",
  title: "Traffic Stop Evidence Review",
  seoTitle: "Traffic Stop Evidence Review | Legal Defense | MailMyPDF",
  seoDescription: "Use the Traffic Stop Evidence Review workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Traffic Stop Evidence Review",
  heroDescription: "Use a guided traffic stop evidence review workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
