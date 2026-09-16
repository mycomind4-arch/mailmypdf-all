import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "landlord-damage-claim-response",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/landlord-damage-claim-response",
  startPath: "/tenant-reply/workflows/landlord-damage-claim-response/start",
  title: "Landlord Damage Claim Response",
  seoTitle: "Landlord Damage Claim Response | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Landlord Damage Claim Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Landlord Damage Claim Response",
  heroDescription: "Use a guided landlord damage claim response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
