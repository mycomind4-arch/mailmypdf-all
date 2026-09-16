import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "cease-and-desist-response",
  sectionId: "code-enforcement",
  sectionName: "Code Enforcement",
  sectionPath: "/code-enforcement",
  path: "/code-enforcement/workflows/cease-and-desist-response",
  startPath: "/code-enforcement/workflows/cease-and-desist-response/start",
  title: "Cease And Desist Response",
  seoTitle: "Cease And Desist Response | Code Enforcement | MailMyPDF",
  seoDescription: "Use the Cease And Desist Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Code Enforcement workflow",
  heroTitle: "Cease And Desist Response",
  heroDescription: "Use a guided cease and desist response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
