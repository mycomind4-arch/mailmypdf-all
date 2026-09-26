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
  seoTitle: "Appeal an SSDI Denial Letter | MailMyPDF",
  seoDescription: "Denied SSDI benefits? Read the actual reason on your notice, track the 60-day deadline, and prepare a reconsideration or hearing packet backed by the right evidence.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal a Social Security Disability Insurance denial",
  heroDescription: "Start with the SSA denial notice, identify the stated reason and appeal level, organize the medical or work-history evidence that reason calls for, and review the exact reconsideration or hearing packet before mailing.",
  heroImage,
  heroImageAlt: "Social Security Administration Request for Reconsideration, Form SSA-561",
  indexable: true,
  contentStatus: "reviewed",
  whatYouDo: [
    "Work from the complete SSA denial or reconsideration notice and confirm the decision date, stated reason, appeal level, and response instructions it contains.",
    "Organize the medical, work-history, and other records you provide around the specific issues identified in the notice.",
    "Prepare the applicable reconsideration or hearing packet, then review every form, statement, attachment, and address before mailing.",
    "Keep the approved packet and available mailing proof together with the appeal record.",
  ],
  whatYouNeed: [
    "The complete SSDI denial, reduction, termination, or reconsideration notice, including its appeal-rights pages.",
    "Medical records, provider information, treatment history, and functional evidence you want considered.",
    "Work-history, earnings, insured-status, or work-credit records when the notice raises a non-medical issue.",
    "Your current contact information and any prior SSA correspondence relevant to the decision.",
  ],
  outputs: [
    "A notice-grounded appeal record with the stated decision, reasons, dates, and unresolved questions clearly separated.",
    "A reviewable reconsideration or hearing packet built only from the notice and information you confirm.",
    "An evidence checklist tied to the issues raised by the notice.",
    "A retained copy of the approved packet with available mailing and delivery proof.",
  ],
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
