import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "junk-vehicle-violation-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/junk-vehicle-violation-response",
  startPath: "/code-enforcement/workflows/junk-vehicle-violation-response/start",
  title: "Junk Vehicle Violation Response",
  seoTitle: "Junk Vehicle Violation Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Junk Vehicle Violation Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Junk Vehicle Violation Response",
  heroDescription: "Use a guided junk vehicle violation response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
