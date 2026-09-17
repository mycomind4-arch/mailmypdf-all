import type { WorkflowLandingConfig } from "@mailmypdf/design-system"
import { requireBenefitsWorkflowLaunchPath } from "../registry"

export const workflowConfig = {
  id: "ssdi-reconsideration",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/ssdi-reconsideration",
  startPath: requireBenefitsWorkflowLaunchPath("ssdi-reconsideration"),
  title: "SSDI Reconsideration",
  seoTitle: "SSDI Reconsideration | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the SSDI Reconsideration workflow to organize the source decision, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "SSDI Reconsideration",
  heroDescription: "Use the canonical SSDI reconsideration workflow built around the actual decision, facts, dates, evidence, required forms, review, approval, and mailing record.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
