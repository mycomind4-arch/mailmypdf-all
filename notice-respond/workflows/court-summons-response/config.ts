import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "court-summons-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/court-summons-response",
  startPath: "/notice-respond/workflows/court-summons-response/start",
  title: "Court Summons Response",
  seoTitle: "Court Summons Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the Court Summons Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Court Summons Response",
  heroDescription: "Use a guided court summons response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
