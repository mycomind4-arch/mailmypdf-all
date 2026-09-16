import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "solid-waste-violation-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/solid-waste-violation-response",
  startPath: "/code-enforcement/workflows/solid-waste-violation-response/start",
  title: "Solid Waste Violation Response",
  seoTitle: "Solid Waste Violation Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Solid Waste Violation Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Solid Waste Violation Response",
  heroDescription: "Use a guided solid waste violation response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
