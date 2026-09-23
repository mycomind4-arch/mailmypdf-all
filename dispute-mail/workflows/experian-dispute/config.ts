import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "experian-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/experian-dispute",
  startPath: "/dispute-mail/workflows/experian-dispute/start",
  title: "Experian Dispute",
  seoTitle: "Experian Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Dispute inaccurate information on your Experian credit report under the Fair Credit Reporting Act (FCRA Section 611) — organize disputed items, evidence, and a mailed dispute letter with proof of delivery.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Experian Dispute",
  heroDescription: "Identify each disputed item on your Experian credit report, match it to the right FCRA category, organize your evidence, and prepare a specific dispute letter mailed with proof of delivery.",
  indexable: true,
  contentStatus: "published",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
