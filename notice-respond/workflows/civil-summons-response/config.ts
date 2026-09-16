import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "civil-summons-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/civil-summons-response",
  startPath: "/notice-respond/workflows/civil-summons-response/start",
  title: "Civil Summons Response",
  seoTitle: "Civil Summons Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the Civil Summons Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Civil Summons Response",
  heroDescription: "Use a guided civil summons response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
