import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "uscis-notice-of-intent-response",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/uscis-notice-of-intent-response",
  startPath: "/immigration-mail/workflows/uscis-notice-of-intent-response/start",
  title: "USCIS Notice Of Intent Response",
  seoTitle: "USCIS Notice Of Intent Response | Immigration Mail | MailMyPDF",
  seoDescription: "Use the USCIS Notice Of Intent Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "USCIS Notice Of Intent Response",
  heroDescription: "Use a guided uscis notice of intent response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
