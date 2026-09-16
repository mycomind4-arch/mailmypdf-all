import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "suppression-issue-builder",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/suppression-issue-builder",
  startPath: "/legal-defense/workflows/suppression-issue-builder/start",
  title: "Suppression Issue Builder",
  seoTitle: "Suppression Issue Builder | Legal Defense | MailMyPDF",
  seoDescription: "Use the Suppression Issue Builder workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Suppression Issue Builder",
  heroDescription: "Use a guided suppression issue builder workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
