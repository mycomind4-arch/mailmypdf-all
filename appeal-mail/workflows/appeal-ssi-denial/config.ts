import type { WorkflowLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/workflow-hero.png"

export const workflowConfig = {
  id: "appeal-ssi-denial",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-ssi-denial",
  startPath: "/appeal-mail/workflows/appeal-ssi-denial/start",
  title: "Appeal SSI Denial",
  seoTitle: "Appeal SSI Denial | Appeal Mail | MailMyPDF",
  seoDescription: "Organize an SSI reconsideration from the actual denial notice, review medical or non-medical issues, prepare the required SSA forms, and assemble a reviewable mailing packet.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal SSI Denial",
  heroDescription: "Build, review, and mail a Supplemental Security Income reconsideration with source-document analysis, issue-specific evidence, official SSA forms, and exact-packet approval.",
  heroImage,
  heroImageAlt: "Supplemental Security Income request for reconsideration appeal form",
  indexable: false,
  contentStatus: "reviewed",
  workspaceHighlights: [
    ["Medical or non-medical", "The workflow separates disability issues from income, resources, living-arrangement, and other eligibility issues stated in the notice."],
    ["Official SSA forms", "Use the required SSA reconsideration forms without forcing medical forms into a non-medical appeal."],
    ["Exact packet approval", "Review the final draft, included evidence, recipient, price, and immutable packet before payment or mailing."],
  ],
  workflowSteps: [
    ["Upload the denial", "Start from the actual SSI decision notice and wait for secure document scanning."],
    ["Confirm the issue", "Analyze the notice and confirm reconsideration plus the medical or non-medical decision basis."],
    ["Add facts and evidence", "Provide only claimant-confirmed facts and explicitly choose the supporting documents to include."],
    ["Review forms and packet", "Complete the required SSA forms, review the draft, and approve the exact mailing packet."],
    ["Pay, mail, and retain proof", "Submit the approved packet through fulfillment and keep tracking and proof with the matter."],
  ],
  readyItems: [
    ["SSI denial notice", "The Social Security decision notice that triggered the reconsideration."],
    ["Medical evidence", "For a medical denial, records about conditions, treatment, medication, functioning, or other relevant evidence."],
    ["Eligibility evidence", "For a non-medical denial, records relevant to the issue stated in the notice, such as income, resources, or living arrangement."],
    ["Claimant information", "Contact, representative, disagreement, and requested-outcome details needed to prepare the appeal."],
  ],
  faqs: [
    ["Does this workflow handle both medical and non-medical SSI denials?", "Yes. It analyzes the source notice and keeps the workflow blocked until the decision basis is confirmed as medical or non-medical."],
    ["Which SSA forms does it use?", "A medical reconsideration uses SSA-561, SSA-3441, and SSA-827 in this workflow. A non-medical reconsideration requires SSA-561 without automatically forcing the medical forms into the packet."],
    ["Can uploaded evidence be mailed automatically?", "No. Evidence must clear security scanning and be explicitly included before it can enter the packet."],
    ["Do I approve the final packet before payment and mailing?", "Yes. The exact packet, mailing destination, and server-authoritative price are reviewed before approval and checkout."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
