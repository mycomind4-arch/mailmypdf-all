import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "equifax-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/equifax-dispute",
  startPath: "/dispute-mail/workflows/equifax-dispute/start",
  title: "Equifax Dispute",
  seoTitle: "Equifax Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Dispute inaccurate information on your Equifax credit report under the Fair Credit Reporting Act (FCRA Section 611) — organize disputed items, evidence, and a mailed dispute letter with proof of delivery.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Equifax Dispute",
  heroDescription: "Identify each disputed item on your Equifax credit report, match it to the right FCRA category, organize your evidence, and prepare a specific dispute letter mailed with proof of delivery.",
  indexable: true,
  contentStatus: "published",
  primaryCtaLabel: "Start Equifax Dispute",
  secondaryCtaLabel: "See how it works",
  overview: "If you find information on your Equifax credit report that you believe is inaccurate or incomplete, you can dispute it with the credit reporting company. The CFPB recommends identifying each error clearly, explaining why it is wrong, requesting the correction you want, and including copies of supporting documents. This workflow organizes those pieces into a reviewable mailed dispute packet.",
  whatYouDo: [
    "Work from the Equifax credit report that contains the information you want to dispute.",
    "List each disputed item separately, including the creditor or account, the type of error, what is wrong, and the correct information when you know it.",
    "Match supporting records to the disputed items they actually support instead of sending an undifferentiated document stack.",
    "Prepare and review a bureau-specific dispute letter and mailing packet before it is sent.",
  ],
  whatYouNeed: [
    "The Equifax credit report showing the item or items you want to dispute",
    "Your name and current mailing address plus the report or confirmation number when available",
    "Account numbers or partial account numbers and a clear explanation of what is inaccurate or incomplete",
    "Copies of statements, payment records, identity-theft records, creditor correspondence, identification, or other documents relevant to the specific dispute",
  ],
  outputs: [
    "A structured dispute letter identifying each disputed item and the correction or investigation you are requesting",
    "A reviewed packet containing the supporting records you choose to include",
    "A bureau-specific mailing destination and a final review before mailing",
    "Tracking and proof retained with the matter after the approved packet is mailed",
  ],
  workspaceHighlights: [
    ["Item-by-item dispute builder", "Organize each account or report item separately so the letter explains exactly what you believe is inaccurate or incomplete."],
    ["Evidence matching", "Connect statements, payment records, identity-theft documents, creditor letters, or other support to the dispute they belong to."],
    ["Reviewed mailing record", "Review the exact letter and attachments, then retain the mailing and delivery record with the matter."],
  ],
  responseOptions: [
    ["Not mine or mixed-file information", "Identify an account or personal-information item that belongs to someone else or appears to have been mixed into your file."],
    ["Incorrect balance, status, or account details", "Explain what the report shows, what you believe is correct, and attach the record that supports the correction."],
    ["Duplicate, outdated, or incorrect personal information", "Identify the duplicated or inaccurate entry and provide the dates or identity records that support your dispute."],
    ["Unauthorized inquiry or another inaccuracy", "Describe the specific item, why you believe it is wrong or incomplete, and the correction or investigation you are requesting."],
  ],
  workflowSteps: [
    ["Review the Equifax report", "Start from the report containing the disputed information and identify the specific items you want addressed."],
    ["Describe each error", "Choose the dispute category, explain what is wrong, and provide the correct information when you know it."],
    ["Add supporting documents", "Attach the records that support each disputed item and review any evidence gaps before drafting."],
    ["Build the dispute letter", "Generate a bureau-specific letter from the facts and disputed items you confirmed."],
    ["Review the packet", "Read the letter, verify the account details, and review every attachment before approval."],
    ["Mail and retain proof", "Approve the exact packet, send it to the bureau-specific dispute destination, and keep tracking and proof with the matter."],
  ],
  readyItems: [
    ["Equifax credit report", "Use the report that actually contains the information you are disputing."],
    ["Disputed-item details", "Have the creditor or company name, account number or partial account number, and a specific explanation for each disputed item."],
    ["Supporting records", "Gather copies of statements, payment records, creditor correspondence, identity-theft documentation, or other records relevant to the dispute."],
    ["Identity and address information", "Have the identification and current-address records you intend to include if the bureau requires them for a mailed dispute."],
  ],
  commonMistakes: [
    "Trying to remove accurate negative information simply because it is unfavorable rather than identifying an actual inaccuracy or incompleteness.",
    "Using a vague statement such as “this is wrong” without identifying the specific account, field, date, amount, or status being disputed.",
    "Sending original records instead of copies and failing to retain the evidence you relied on.",
    "Including many documents without explaining which disputed item each document supports.",
    "Mailing the packet without keeping a copy and delivery record.",
  ],
  faqs: [
    ["What can I dispute?", "You can dispute information you believe is inaccurate or incomplete. Common examples include accounts that are not yours, incorrect balances or payment status, duplicate accounts, mixed-file information, and incorrect personal information."],
    ["Should I explain each item separately?", "Yes. A specific item-by-item dispute is easier to review than a broad statement that the report is wrong. Identify what the report says, why you believe it is inaccurate or incomplete, and what correction you are requesting."],
    ["Should I include supporting documents?", "Supporting documents can help explain the dispute. Use copies rather than originals and include records that are directly relevant to the item you are disputing."],
    ["Does MailMyPDF decide whether the credit-report item is actually wrong?", "No. The workflow organizes the facts and records you provide and prepares a draft for your review. It does not determine the truth of the disputed information or guarantee a bureau result."],
    ["Can I review the letter and attachments before mailing?", "Yes. The dispute letter, account details, supporting documents, mailing destination, and final packet remain reviewable before the mailing step."],
  ],
  sources: [
    { title: "How do I dispute an error on my credit report?", publisher: "Consumer Financial Protection Bureau", href: "https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-an-error-on-my-credit-report-en-314/" },
    { title: "Equifax credit dispute information", publisher: "Equifax", href: "https://www.equifax.com/personal/credit-report-services/credit-dispute/" },
  ],
  relatedWorkflows: [
    { title: "Experian Dispute", path: "/dispute-mail/workflows/experian-dispute", description: "Use this workflow for inaccurate or incomplete information on an Experian credit report." },
    { title: "TransUnion Dispute", path: "/dispute-mail/workflows/transunion-dispute", description: "Use this workflow for inaccurate or incomplete information on a TransUnion credit report." },
  ],
  disclaimer: "MailMyPDF helps organize a credit-report dispute and mailing record. It does not provide legal advice, guarantee deletion or correction, or promise a credit-score change. Disputing inaccurate information with the credit reporting company is a consumer right that can be exercised directly without paying MailMyPDF.",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
