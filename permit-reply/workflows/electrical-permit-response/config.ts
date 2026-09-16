import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "electrical-permit-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/electrical-permit-response",
  startPath: "/permit-reply/workflows/electrical-permit-response/start",
  title: "Electrical Permit Response",
  seoTitle: "Electrical Permit Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Electrical Permit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Electrical Permit Response",
  heroDescription: "Use a guided electrical permit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
