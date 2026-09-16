import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "request-to-correct-inspection-record",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/request-to-correct-inspection-record",
  startPath: "/code-enforcement/workflows/request-to-correct-inspection-record/start",
  title: "Request To Correct Inspection Record",
  seoTitle: "Request To Correct Inspection Record | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Request To Correct Inspection Record workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Request To Correct Inspection Record",
  heroDescription: "Use a guided request to correct inspection record workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
