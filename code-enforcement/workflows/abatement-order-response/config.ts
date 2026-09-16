import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "abatement-order-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/abatement-order-response",
  startPath: "/code-enforcement/workflows/abatement-order-response/start",
  title: "Abatement Order Response",
  seoTitle: "Abatement Order Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Abatement Order Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Abatement Order Response",
  heroDescription: "Use a guided abatement order response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
