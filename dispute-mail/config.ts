import type { SectionLandingConfig } from "@mailmypdf/design-system"

export const disputeMailConfig = {
  "id": "dispute-mail",
  "name": "Dispute Mail",
  "path": "/dispute-mail",
  "tone": "dark",
  "seoTitle": "Credit, Debt & Billing Dispute Letters | MailMyPDF",
  "seoDescription": "Prepare credit-report, debt-validation, collection, billing-error, unauthorized-charge, medical-debt, and creditor dispute letters with evidence, review, and mailing proof.",
  "eyebrow": "Credit · debt · billing · collections · unauthorized charges",
  "heroTitle": "Prepare a dispute from the records you have.",
  "heroDescription": "Choose the dispute that matches the problem, organize the account information and evidence, prepare a focused letter, review the exact claims, and keep mailing and follow-up proof with the matter.",
  "heroImage": "/heroes/dispute-mail.jpg",
  "introTitle": "Match the dispute letter to the actual problem.",
  "introText": "A credit-report error, debt-validation request, billing error, unauthorized charge, medical debt, and collection dispute require different facts and supporting records. Use a workflow built for that issue.",
  "trustLead": "Problem-specific dispute intake",
  "topics": [
    {
      "title": "Credit-report disputes",
      "text": "Credit-report errors, collection accounts, hard inquiries, charge-offs, and bureau dispute packages."
    },
    {
      "title": "Debt & collections",
      "text": "Debt validation, collection-agency disputes, debt-buyer disputes, cease-contact requests, and FDCPA-related correspondence."
    },
    {
      "title": "Billing & charges",
      "text": "Credit-card billing errors, unauthorized charges, subscriptions, service contracts, utilities, and medical billing disputes."
    },
    {
      "title": "Escalation & follow-up",
      "text": "Unanswered disputes, unresolved disputes, supporting evidence packages, and documented follow-up correspondence."
    }
  ],
  "featured": [
    {
      "slug": "credit-report-error-dispute",
      "title": "Credit Report Error Dispute",
      "description": "Prepare a focused dispute around inaccurate information appearing on a credit report."
    },
    {
      "slug": "debt-validation",
      "title": "Debt Validation Request",
      "description": "Request validation and organize collector, account, amount, and communication details."
    },
    {
      "slug": "medical-debt-dispute",
      "title": "Medical Debt Dispute",
      "description": "Organize the account, provider, insurer, bills, explanation of benefits, and disputed amount."
    },
    {
      "slug": "unauthorized-charge-dispute",
      "title": "Unauthorized Charge Dispute",
      "description": "Document an unauthorized transaction and prepare a reviewable dispute letter."
    },
    {
      "slug": "billing-error-dispute",
      "title": "Billing Error Dispute",
      "description": "Prepare a dispute around a billing error using statements, dates, amounts, and supporting records."
    },
    {
      "slug": "follow-up-on-unanswered-dispute",
      "title": "Unanswered Dispute Follow-up",
      "description": "Prepare follow-up correspondence when a prior dispute has not received an adequate response."
    }
  ],
  "outcomes": [
    "A focused dispute letter",
    "An account and evidence record",
    "A mailing and follow-up trail"
  ],
  "safetyTitle": "Keep factual disputes factual.",
  "safetyBody": "MailMyPDF helps organize the information and correspondence you provide. It does not guarantee removal of information, cancellation of debt, reimbursement, or a particular creditor or bureau outcome.",
  "faqs": [
    [
      "Can I dispute a credit-report error?",
      "Yes. Credit-report workflows organize the disputed item, bureau, account information, supporting records, and the letter you want to send."
    ],
    [
      "Can I request debt validation?",
      "Yes. A debt-validation workflow can structure the collector information, account details, communications, and written request."
    ],
    [
      "Can I dispute an unauthorized charge?",
      "Yes. The workflow can organize the transaction, dates, account information, prior contacts, and supporting evidence."
    ],
    [
      "Will a dispute automatically remove a debt or credit item?",
      "No. MailMyPDF prepares correspondence and records; it cannot guarantee how a creditor, collector, bank, or bureau will respond."
    ]
  ],
  "related": [
    {
      "name": "Insurance Claims",
      "path": "/insurance-claims",
      "description": "Prepare insurance claims, denial responses, and claim evidence."
    },
    {
      "name": "Tenant Reply",
      "path": "/tenant-reply",
      "description": "Prepare tenant correspondence, deposit disputes, and housing records."
    },
    {
      "name": "Small Business",
      "path": "/small-business",
      "description": "Prepare business payment demands, vendor disputes, and formal correspondence."
    }
  ]
} as const satisfies SectionLandingConfig

export default disputeMailConfig
