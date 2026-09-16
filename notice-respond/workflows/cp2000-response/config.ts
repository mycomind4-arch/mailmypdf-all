import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "cp2000-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/cp2000-response",
  startPath: "/notice-respond/workflows/cp2000-response/start",
  title: "CP2000 Response",
  seoTitle: "CP2000 Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the CP2000 Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "CP2000 Response",
  heroDescription: "Use a guided cp2000 response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
