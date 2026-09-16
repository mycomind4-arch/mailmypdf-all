import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "biometrics-appointment-correspondence",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/biometrics-appointment-correspondence",
  startPath: "/immigration-mail/workflows/biometrics-appointment-correspondence/start",
  title: "Biometrics Appointment Correspondence",
  seoTitle: "Biometrics Appointment Correspondence | Immigration Mail | MailMyPDF",
  seoDescription: "Use the Biometrics Appointment Correspondence workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "Biometrics Appointment Correspondence",
  heroDescription: "Use a guided biometrics appointment correspondence workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
