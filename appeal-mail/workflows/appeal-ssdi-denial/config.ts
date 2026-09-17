import type { WorkflowLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/workflow-hero.png"

export const workflowConfig = {
  id: "appeal-ssdi-denial",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-ssdi-denial",
  startPath: "/appeal-mail/workflows/appeal-ssdi-denial/start",
  title: "Appeal SSDI Denial",
  seoTitle: "Appeal SSDI Denial | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal SSDI Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal SSDI Denial",
  heroDescription: "Build, review, and mail your Social Security Disability Insurance appeal with guided steps, document analysis, and official forms.",
  heroImage,
  heroImageAlt: "Social Security Administration Request for Reconsideration, Form SSA-561",
  indexable: false,
  contentStatus: "scaffold",
  workspaceHighlights: [
    ["Official SSA forms", "Prepare the official forms used by this appeal workflow."],
    ["Document analysis", "Extract key details from the denial notice and supporting documents."],
    ["Complete filing support", "Review, assemble, mail, track, and retain proof for the appeal packet."],
  ],
  workflowSteps: [
    ["Upload documents", "Add your denial notice and any supporting documents."],
    ["We analyze", "Extract key information and check what the workflow still needs."],
    ["Review your packet", "See the completed forms and correspondence before anything is sent."],
    ["Pay and mail", "Complete payment and submit the approved packet for mailing."],
    ["Track and retain proof", "Keep tracking and mailing proof with the matter."],
  ],
  readyItems: [
    ["Denial notice", "Your Social Security denial letter or decision notice."],
    ["Medical records", "Recent records you want considered with the appeal."],
    ["Additional evidence", "Other supporting documents you want connected to the matter."],
    ["Personal information", "The identifying and case details needed to complete the official forms."],
  ],
  faqs: [
    ["What documents do I need?", "Start with the denial notice. The workflow also lets you add medical records and other supporting evidence."],
    ["What forms will be completed?", "The workflow uses the official SSA forms included with this SSDI reconsideration workflow."],
    ["Do I review the packet before it is mailed?", "Yes. The workflow keeps consequential mailing actions behind an explicit review and approval step."],
    ["What happens after mailing?", "Tracking and mailing proof are retained with the matter as fulfillment completes."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
