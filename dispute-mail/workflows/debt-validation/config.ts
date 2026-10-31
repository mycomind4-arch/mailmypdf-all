import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "debt-validation",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/debt-validation",
  startPath: "/dispute-mail/workflows/debt-validation/start",
  title: "Debt Validation",
  seoTitle: "Debt Validation Request Letter | Dispute Mail | MailMyPDF",
  seoDescription: "Prepare a factual written debt dispute and verification request using the collector’s notice, confirmed mailing address, and account details. Review before sending.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Request debt verification from a collector",
  heroDescription: "Identify the collection notice, describe what you dispute, and confirm the collector’s response address. A written dispute can have time-sensitive protections, but the deadline and recipient must come from your actual notice.",
  indexable: false,
  contentStatus: "scaffold",
  overview: "Debt collectors generally must give validation information about a claimed debt, including the collector, creditor, amount and a dispute-period end date. You can request verification in writing. This workflow is being connected to authenticated packet review and mailing; it is not yet a production mailing service.",
  whatYouDo: [
    "Identify the actual collector and its mailing address on the controlling validation notice.",
    "Describe the specific account, amount or ownership issue you dispute.",
    "Record the notice’s printed dispute deadline without assuming it is calculated from the first-contact date.",
    "Review the complete draft, recipient and supporting documents before approving any mailing.",
  ],
  whatYouNeed: [
    "The debt collector’s validation notice and the response mailing address shown on it",
    "Your name and return mailing address",
    "The collector’s account/reference number and your factual dispute explanation",
    "Copies of relevant statements, payment records or earlier correspondence if available",
  ],
  outputs: [
    "A factual written debt dispute and verification request for review",
    "A notice-specific recipient confirmation checklist",
    "A record of any printed notice deadline and unresolved timing questions",
  ],
  workflowSteps: [
    ["Identify the notice", "Record the controlling collector notice and its date, if printed."],
    ["Confirm the recipient", "Compare the response mailing address with the actual notice; do not guess."],
    ["Explain the dispute", "Describe the claimed debt or amount you question without admitting liability."],
    ["Review evidence", "Select only relevant supporting copies and keep originals."],
    ["Review the letter", "Verify every factual statement and the exact packet before approval."],
    ["Mail and retain proof", "This step requires future authenticated payment and mailing integration; no mailing is available from this scaffold."],
  ],
  commonMistakes: [
    "Assuming the collector’s address can be inferred from its company name.",
    "Automatically adding 30 days to a notice date rather than reading the stated dispute-period end date.",
    "Claiming collection must stop without confirming the applicable timing and notice facts.",
    "Sending original evidence documents or omitting a retained copy of the letter.",
  ],
  faqs: [
    ["Is there a 30-day dispute period?", "Federal debt collection rules generally provide a 30-day validation period after receipt or assumed receipt of validation information. Check the end date stated on your own notice; circumstances and applicable law matter."],
    ["Does any dispute stop collection?", "Not automatically. Under federal rules, certain timely written disputes require a debt collector to pause collection until it responds. This workflow does not certify timeliness or legal effects."],
    ["Can I ask for the original creditor?", "A timely written request may require the collector to provide the name and address of the original creditor, if different from the current creditor."],
    ["Does this page mail the letter now?", "No. The debt-validation execution path is still under development and is not certified for payment or mailing."],
  ],
  sources: [
    { title: "Regulation F § 1006.34: Notice for validation of debts", publisher: "Consumer Financial Protection Bureau", href: "https://www.consumerfinance.gov/rules-policy/regulations/1006/34/" },
    { title: "What information does a debt collector have to give me?", publisher: "Consumer Financial Protection Bureau", href: "https://www.consumerfinance.gov/ask-cfpb/what-information-does-a-debt-collector-have-to-give-me-about-the-debt-en-331/" },
  ],
  disclaimer: "MailMyPDF is a document-preparation service, not a law firm. This page is not legal advice, a certification that a dispute is timely, or a guarantee that collection activity will stop. The debt-validation mailing workflow is not yet production-executable.",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
