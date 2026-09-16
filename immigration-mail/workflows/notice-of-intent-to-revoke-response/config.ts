import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "notice-of-intent-to-revoke-response",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/notice-of-intent-to-revoke-response",
  startPath: "/immigration-mail/workflows/notice-of-intent-to-revoke-response/start",
  title: "Notice Of Intent To Revoke Response",
  seoTitle: "Notice Of Intent To Revoke Response | Immigration Mail | MailMyPDF",
  seoDescription: "Use the Notice Of Intent To Revoke Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "Notice Of Intent To Revoke Response",
  heroDescription: "Use a guided notice of intent to revoke response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
