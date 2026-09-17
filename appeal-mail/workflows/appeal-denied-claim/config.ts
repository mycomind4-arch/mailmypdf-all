import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-denied-claim",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-denied-claim",
  startPath: "/appeal-mail/workflows/appeal-denied-claim/start",
  title: "Appeal Denied Claim",
  seoTitle: "Appeal Denied Claim | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Denied Claim workflow to analyze a denial letter, organize supporting evidence, prepare a reviewable appeal, and build an exact mail-ready packet with tracking and proof.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Denied Claim",
  heroDescription: "Upload the denial letter, confirm the facts, organize supporting evidence, prepare the appeal, review the exact packet, and mail it with proof.",
  indexable: false,
  contentStatus: "reviewed",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
