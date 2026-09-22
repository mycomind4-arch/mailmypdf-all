import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "cp3219a-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/cp3219a-response",
  startPath: "/notice-respond/workflows/cp3219a-response/start",
  title: "Cp3219a Response",
  seoTitle: "Cp3219a Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the Cp3219a Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Cp3219a Response",
  heroDescription: "Use a guided cp3219a response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
