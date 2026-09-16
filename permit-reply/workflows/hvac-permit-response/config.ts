import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "hvac-permit-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/hvac-permit-response",
  startPath: "/permit-reply/workflows/hvac-permit-response/start",
  title: "Hvac Permit Response",
  seoTitle: "Hvac Permit Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Hvac Permit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Hvac Permit Response",
  heroDescription: "Use a guided hvac permit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
