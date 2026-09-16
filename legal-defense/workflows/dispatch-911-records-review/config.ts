import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "dispatch-911-records-review",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/dispatch-911-records-review",
  startPath: "/legal-defense/workflows/dispatch-911-records-review/start",
  title: "Dispatch 911 Records Review",
  seoTitle: "Dispatch 911 Records Review | Legal Defense | MailMyPDF",
  seoDescription: "Use the Dispatch 911 Records Review workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Dispatch 911 Records Review",
  heroDescription: "Use a guided dispatch 911 records review workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
