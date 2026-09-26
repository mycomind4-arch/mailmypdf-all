import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "immigration-filing-cover-letter",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/immigration-filing-cover-letter",
  startPath: "/immigration-mail/workflows/immigration-filing-cover-letter/start",
  title: "Immigration Filing Cover Letter",
  seoTitle: "Immigration Filing Cover Letter | Immigration Mail | MailMyPDF",
  seoDescription: "Prepare an immigration filing cover letter, organize the documents that accompany it, review the exact packet, and retain mailing proof.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "Immigration Filing Cover Letter",
  heroDescription: "Prepare a clear filing cover letter around the application, petition, forms, and supporting documents you are sending, then review the exact packet before mailing.",
  indexable: false,
  contentStatus: "reviewed",
  workspaceHighlights: [
    ["Document-first intake", "Start from the actual filing document or USCIS record that the cover letter will accompany."],
    ["Packet organization", "Categorize and explicitly select the supporting documents that belong in the outgoing packet."],
    ["Review before mailing", "Approve the exact packet hash, destination, and price before payment or mailing."],
  ],
  workflowSteps: [
    ["Upload the filing document", "Add the application, petition, form, or USCIS document this cover letter accompanies."],
    ["Confirm filing details", "Review extracted details and confirm the filing type, form numbers, names, and identifiers."],
    ["Organize packet documents", "Upload and select supporting documents for the outgoing packet."],
    ["Review the cover letter and packet", "Edit the cover letter and review the exact packet before approval."],
    ["Pay, mail, and retain proof", "Submit only the approved packet and retain tracking and proof with the matter."],
  ],
  readyItems: [
    ["Primary filing document", "The form, petition, application, or USCIS document the cover letter will accompany."],
    ["Supporting documents", "Evidence, identity documents, receipt notices, or other documents that belong in the packet."],
    ["Filing details", "Applicant or beneficiary name, form numbers, purpose of filing, and any receipt or A-Number you want referenced."],
    ["Mailing destination", "The current destination for the filing, confirmed against current filing instructions."],
  ],
  faqs: [
    ["Does this workflow decide which immigration form I should file?", "No. It helps prepare and organize a cover letter and mailing packet around the filing details and documents you provide."],
    ["Can I review every included document?", "Yes. Only clean documents you explicitly include are assembled into the outgoing packet."],
    ["Do I review the packet before mailing?", "Yes. The exact packet and destination must be reviewed and approved before payment or mailing."],
    ["Is mailing proof retained?", "Yes. Tracking and proof are intended to remain connected to the matter after fulfillment."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
