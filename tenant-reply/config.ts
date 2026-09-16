import type { SectionLandingConfig } from "@mailmypdf/design-system"

export const tenantReplyConfig = {
  "id": "tenant-reply",
  "name": "Tenant Reply",
  "path": "/tenant-reply",
  "tone": "light",
  "seoTitle": "Tenant Notice, Repair & Deposit Letters | MailMyPDF",
  "seoDescription": "Prepare tenant responses, repair requests, habitability documentation, security-deposit disputes, rent and lease correspondence, access responses, and evidence packages.",
  "eyebrow": "Tenant notices · repairs · deposits · rent · lease correspondence",
  "heroTitle": "Turn housing correspondence into a record you can review.",
  "heroDescription": "Start with the landlord notice, lease, repair problem, deposit statement, rent issue, or access request. Organize the facts and evidence, prepare editable correspondence, and preserve mailing and delivery proof.",
  "heroImage": "/heroes/tenant-reply.jpg",
  "introTitle": "Start from the notice, condition, or charge that created the dispute.",
  "introText": "Repair issues, deposit deductions, rent notices, access requests, lease violations, and move-out charges require different facts. The workflow keeps property, tenancy, source documents, evidence, and correspondence connected.",
  "trustLead": "Property and tenancy context preserved",
  "topics": [
    {
      "title": "Landlord notice responses",
      "text": "Lease violations, termination notices, pay-or-quit, cure-or-quit, rent notices, and other landlord correspondence."
    },
    {
      "title": "Repairs & habitability",
      "text": "Repair requests, unresolved repairs, mold or water issues, maintenance records, photos, and condition documentation."
    },
    {
      "title": "Deposits & move-out charges",
      "text": "Security-deposit demands, deduction disputes, move-out charges, damage claims, receipts, and condition evidence."
    },
    {
      "title": "Entry, rent & lease issues",
      "text": "Notice-to-enter responses, unauthorized entry, rent increases, late fees, utilities, lease changes, and renewals."
    }
  ],
  "featured": [
    {
      "slug": "tenant-notice-response",
      "title": "Tenant Notice Response",
      "description": "Organize a landlord notice, tenancy facts, lease references, dates, and reviewed response."
    },
    {
      "slug": "repair-request",
      "title": "Tenant Repair Request",
      "description": "Document the condition, prior contacts, dates, photos, access history, and repair request."
    },
    {
      "slug": "security-deposit-dispute",
      "title": "Security Deposit Dispute",
      "description": "Organize deductions, itemization, photos, receipts, move-out records, and correspondence."
    },
    {
      "slug": "eviction-notice-response",
      "title": "Eviction Notice Response",
      "description": "Start from the actual notice and organize the facts, dates, documents, and response record."
    },
    {
      "slug": "notice-to-enter-response",
      "title": "Notice to Enter Response",
      "description": "Document the notice, requested access, date, purpose, prior communications, and response."
    },
    {
      "slug": "move-out-charges-dispute",
      "title": "Move-Out Charges Dispute",
      "description": "Prepare a documented dispute around move-out deductions or charges and supporting records."
    }
  ],
  "outcomes": [
    "A source-grounded tenant letter",
    "An organized evidence record",
    "A mailing and delivery record"
  ],
  "safetyTitle": "Housing rules depend heavily on jurisdiction and facts.",
  "safetyBody": "MailMyPDF prepares correspondence and organizes records. It does not provide legal representation, decide tenant rights, or guarantee a housing outcome.",
  "faqs": [
    [
      "Can I respond to a landlord notice?",
      "Yes. A notice-response workflow can organize the source notice, tenancy details, lease references, dates, evidence, and reviewed response."
    ],
    [
      "Can I document a repair problem?",
      "Yes. Repair workflows keep condition details, photos, dates, prior requests, access history, and correspondence together."
    ],
    [
      "Can I dispute security-deposit deductions?",
      "Yes. Deposit workflows organize the statement, deductions, move-out evidence, receipts, photos, dates, and outgoing correspondence."
    ],
    [
      "Does Tenant Reply tell me my legal rights?",
      "It is not a substitute for legal advice. Legal and procedural requirements can vary by jurisdiction and facts."
    ]
  ],
  "related": [
    {
      "name": "Dispute Mail",
      "path": "/dispute-mail",
      "description": "Prepare billing, payment, account, and consumer dispute correspondence."
    },
    {
      "name": "Records Requests",
      "path": "/records-request",
      "description": "Request housing, inspection, permit, agency, or court records when needed."
    },
    {
      "name": "Notice Respond",
      "path": "/notice-respond",
      "description": "Respond to official agency, court, and compliance notices."
    }
  ]
} as const satisfies SectionLandingConfig

export default tenantReplyConfig
