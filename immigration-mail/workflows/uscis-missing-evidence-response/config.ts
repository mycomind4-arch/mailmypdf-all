import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "uscis-missing-evidence-response",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/uscis-missing-evidence-response",
  startPath: "/immigration-mail/workflows/uscis-missing-evidence-response/start",
  title: "USCIS Missing Evidence Response",
  seoTitle: "USCIS Missing Evidence Response | Immigration Mail | MailMyPDF",
  seoDescription: "Use the USCIS Missing Evidence Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "USCIS Missing Evidence Response",
  heroDescription: "Use a guided uscis missing evidence response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
