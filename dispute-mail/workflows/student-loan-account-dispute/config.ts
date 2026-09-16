import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "student-loan-account-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/student-loan-account-dispute",
  startPath: "/dispute-mail/workflows/student-loan-account-dispute/start",
  title: "Student Loan Account Dispute",
  seoTitle: "Student Loan Account Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Student Loan Account Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Student Loan Account Dispute",
  heroDescription: "Use a guided student loan account dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
