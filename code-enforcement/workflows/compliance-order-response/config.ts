import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "compliance-order-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/compliance-order-response",
  startPath: "/code-enforcement/workflows/compliance-order-response/start",
  title: "Compliance Order Response",
  seoTitle: "Compliance Order Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Compliance Order Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Compliance Order Response",
  heroDescription: "Use a guided compliance order response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
