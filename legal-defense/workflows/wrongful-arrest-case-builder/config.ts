import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "wrongful-arrest-case-builder",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/wrongful-arrest-case-builder",
  startPath: "/legal-defense/workflows/wrongful-arrest-case-builder/start",
  title: "Wrongful Arrest Case Builder",
  seoTitle: "Wrongful Arrest Case Builder | Legal Defense | MailMyPDF",
  seoDescription: "Use the Wrongful Arrest Case Builder workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Wrongful Arrest Case Builder",
  heroDescription: "Use a guided wrongful arrest case builder workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
