import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "certificate-of-occupancy-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/certificate-of-occupancy-response",
  startPath: "/permit-reply/workflows/certificate-of-occupancy-response/start",
  title: "Certificate Of Occupancy Response",
  seoTitle: "Certificate Of Occupancy Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Certificate Of Occupancy Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Certificate Of Occupancy Response",
  heroDescription: "Use a guided certificate of occupancy response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
