import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "property-maintenance-violation-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/property-maintenance-violation-response",
  startPath: "/code-enforcement/workflows/property-maintenance-violation-response/start",
  title: "Property Maintenance Violation Response",
  seoTitle: "Property Maintenance Violation Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Property Maintenance Violation Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Property Maintenance Violation Response",
  heroDescription: "Use a guided property maintenance violation response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
