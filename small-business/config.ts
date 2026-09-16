import type { SectionLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/hero.jpg"

export const smallBusinessConfig = {
  "id": "small-business",
  "name": "Small Business",
  "path": "/small-business",
  "tone": "light",
  "seoTitle": "Small Business Letters & Compliance Workflows | MailMyPDF",
  "seoDescription": "Prepare small-business payment demands, invoice notices, contract correspondence, vendor disputes, policy updates, compliance notices, records requests, and formal letters.",
  "eyebrow": "Payments · contracts · vendors · notices · business correspondence",
  "heroTitle": "Prepare important business correspondence from one connected record.",
  "heroDescription": "Use focused workflows for payment collection, invoice notices, contract changes, customer and vendor disputes, policy updates, compliance correspondence, records requests, and other formal business letters.",
  "heroImage": heroImage,
  "introTitle": "Recurring business correspondence should not start from a blank page.",
  "introText": "Payment notices, vendor disputes, contract renewals, policy changes, records requests, and other formal communications can share the same controlled workflow while keeping the business facts and recipient context reusable.",
  "trustLead": "Reusable business and recipient context",
  "topics": [
    {
      "title": "Payments & collections",
      "text": "Payment reminders, past-due invoices, final demands, account-balance notices, and collection correspondence."
    },
    {
      "title": "Contracts & customers",
      "text": "Contract renewals, nonrenewals, changes, customer complaints, refunds, cancellations, and service issues."
    },
    {
      "title": "Vendors & operations",
      "text": "Vendor disputes, payment disputes, documentation requests, insurance certificates, business records, and operating notices."
    },
    {
      "title": "Policies & compliance",
      "text": "Policy updates, price changes, compliance notices, address changes, service interruptions, and formal business correspondence."
    }
  ],
  "featured": [
    {
      "slug": "past-due-invoice-notice",
      "title": "Past-Due Invoice Notice",
      "description": "Prepare a professional notice with invoice, balance, due-date, and payment context."
    },
    {
      "slug": "final-demand-for-payment",
      "title": "Final Demand for Payment",
      "description": "Build a documented final payment demand from the account record and prior communications."
    },
    {
      "slug": "contract-renewal-notice",
      "title": "Contract Renewal Notice",
      "description": "Prepare renewal correspondence using the agreement, dates, parties, and updated terms you provide."
    },
    {
      "slug": "vendor-dispute-response",
      "title": "Vendor Dispute Response",
      "description": "Organize the transaction, agreement, invoices, performance issues, evidence, and response."
    },
    {
      "slug": "price-increase-notice",
      "title": "Price Increase Notice",
      "description": "Prepare clear customer or client notice of a price change and effective date."
    },
    {
      "slug": "business-records-request",
      "title": "Business Records Request",
      "description": "Prepare a formal request for records, documents, statements, or information needed by the business."
    }
  ],
  "outcomes": [
    "A professional business letter",
    "A reusable correspondence record",
    "A mailing and proof trail"
  ],
  "safetyTitle": "Automation should reduce repetition, not accountability.",
  "safetyBody": "MailMyPDF can standardize document preparation and mailing while keeping higher-risk correspondence behind review. Legal, tax, accounting, licensing, and regulatory requirements remain source- and jurisdiction-dependent.",
  "faqs": [
    [
      "Can I send payment-demand letters?",
      "Yes. Payment workflows can organize invoice numbers, balances, due dates, prior reminders, and the exact demand you review."
    ],
    [
      "Can I handle vendor disputes?",
      "Yes. Vendor workflows keep contracts, invoices, performance issues, communications, supporting records, and formal responses connected."
    ],
    [
      "Can business information be reused between workflows?",
      "That is the intended architecture: verified business and recipient context can carry forward so recurring correspondence does not restart from a blank record."
    ],
    [
      "Can MailMyPDF mail the finished letter?",
      "Where supported, the approved packet can move through MailMyPDF fulfillment while tracking and available proof remain associated with the business record."
    ]
  ],
  "related": [
    {
      "name": "Dispute Mail",
      "path": "/dispute-mail",
      "description": "Prepare billing, payment, account, and contract-related disputes."
    },
    {
      "name": "Permit Reply",
      "path": "/permit-reply",
      "description": "Respond to permits, inspections, zoning, and project correspondence."
    },
    {
      "name": "Records Requests",
      "path": "/records-request",
      "description": "Request agency, permit, court, property, and other government records."
    }
  ]
} as const satisfies SectionLandingConfig

export default smallBusinessConfig
