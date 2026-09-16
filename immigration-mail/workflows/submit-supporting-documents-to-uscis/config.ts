import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "submit-supporting-documents-to-uscis",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/submit-supporting-documents-to-uscis",
  startPath: "/immigration-mail/workflows/submit-supporting-documents-to-uscis/start",
  title: "Submit Supporting Documents To USCIS",
  seoTitle: "Submit Supporting Documents To USCIS | Immigration Mail | MailMyPDF",
  seoDescription: "Use the Submit Supporting Documents To USCIS workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "Submit Supporting Documents To USCIS",
  heroDescription: "Use a guided submit supporting documents to uscis workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
