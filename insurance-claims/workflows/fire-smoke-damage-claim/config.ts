import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "fire-smoke-damage-claim",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/fire-smoke-damage-claim",
  startPath: "/insurance-claims/workflows/fire-smoke-damage-claim/start",
  title: "Fire Smoke Damage Claim",
  seoTitle: "Fire Smoke Damage Claim | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Fire Smoke Damage Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Fire Smoke Damage Claim",
  heroDescription: "Use a guided fire smoke damage claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
