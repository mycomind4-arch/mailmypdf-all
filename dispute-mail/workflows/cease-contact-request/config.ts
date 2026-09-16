import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "cease-contact-request",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/cease-contact-request",
  startPath: "/dispute-mail/workflows/cease-contact-request/start",
  title: "Cease Contact Request",
  seoTitle: "Cease Contact Request | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Cease Contact Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Cease Contact Request",
  heroDescription: "Use a guided cease contact request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
