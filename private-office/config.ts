import type { SectionLandingConfig } from "@mailmypdf/design-system"

export const privateOfficeConfig = {
  "id": "private-office",
  "name": "Private Office",
  "path": "/private-office",
  "tone": "dark",
  "seoTitle": "Private Matter & Evidence Workflows | MailMyPDF",
  "seoDescription": "Organize consequential private matters involving contractors, property, insurance, banking, trusts, estates, evidence preservation, and formal correspondence.",
  "eyebrow": "Private matters · evidence · correspondence · proof",
  "heroTitle": "Handle consequential private matters with an evidence-first record.",
  "heroDescription": "Organize the facts, documents, chronology, evidence, analysis, drafting, approval, mailing, and proof for complex personal and professional matters in one controlled workspace.",
  "heroImage": "/heroes/private-office.jpg",
  "introTitle": "Complex matters need a durable record.",
  "introText": "Private Office is designed for high-stakes matters where documents, chronology, evidence, competing claims, formal correspondence, and proof of what happened need to stay connected.",
  "trustLead": "Matter-centric private record",
  "topics": [
    {
      "title": "Property & contractor matters",
      "text": "Contractor disputes, defects, repair disputes, construction payments, property damage, and insurance issues."
    },
    {
      "title": "Banking & transfer disputes",
      "text": "Wire transfers, unauthorized transactions, banking disputes, fraud records, and recovery correspondence."
    },
    {
      "title": "Trusts, estates & property history",
      "text": "Beneficiary notices, trust accounting, fiduciary concerns, probate records, title history, and estate reconstruction."
    },
    {
      "title": "Formal evidence & correspondence",
      "text": "Demand letters, evidence-preservation notices, litigation holds, supporting packets, and documented mailing proof."
    }
  ],
  "featured": [
    {
      "slug": "contractor-dispute",
      "title": "Contractor Dispute",
      "description": "Organize contracts, payments, scope, defects, communications, evidence, and formal correspondence."
    },
    {
      "slug": "property-insurance-claim",
      "title": "Property Insurance Claim",
      "description": "Build the property-loss record, evidence, claim communications, and reviewed correspondence."
    },
    {
      "slug": "bank-wire-transfer-dispute",
      "title": "Bank & Wire Transfer Dispute",
      "description": "Organize transaction records, bank communications, authorization facts, chronology, and dispute correspondence."
    },
    {
      "slug": "trust-beneficiary-notice",
      "title": "Trust Beneficiary Notice",
      "description": "Prepare beneficiary correspondence from the trust, parties, records, dates, and requested information you provide."
    },
    {
      "slug": "property-estate-reconstruction",
      "title": "Property & Estate Reconstruction",
      "description": "Build a chronology from property records, estate documents, ownership history, and related evidence."
    },
    {
      "slug": "evidence-preservation-notice",
      "title": "Evidence Preservation Notice",
      "description": "Prepare a formal notice identifying relevant evidence, parties, subject matter, and preservation request."
    }
  ],
  "outcomes": [
    "A durable matter record",
    "A source-linked chronology and evidence set",
    "A controlled correspondence and proof trail"
  ],
  "safetyTitle": "AI assistance remains advisory.",
  "safetyBody": "Private Office keeps consequential decisions behind human review. Generated analysis and drafting should remain distinguishable from source facts and do not replace licensed professional advice where required.",
  "faqs": [
    [
      "What is Private Office?",
      "It is a matter-centric environment for organizing documents, facts, evidence, chronology, correspondence, approval, fulfillment, and proof around consequential private matters."
    ],
    [
      "Does Private Office provide legal advice?",
      "No. It organizes information and prepares correspondence but does not provide legal representation or replace qualified legal, financial, tax, or other professional advice."
    ],
    [
      "Can I preserve evidence and correspondence history?",
      "The intended workflow keeps source documents, generated drafts, approved versions, attachments, mailing records, and available delivery proof connected to the matter."
    ],
    [
      "Can AI send documents without my approval?",
      "The architecture is designed to keep consequential approval, payment, and physical mailing behind explicit human gates."
    ]
  ],
  "related": [
    {
      "name": "Dispute Mail",
      "path": "/dispute-mail",
      "description": "Prepare consumer, banking, billing, debt, and account disputes."
    },
    {
      "name": "Insurance Claims",
      "path": "/insurance-claims",
      "description": "Build insurance claim records, denial responses, and evidence packages."
    },
    {
      "name": "Records Requests",
      "path": "/records-request",
      "description": "Request public records needed to reconstruct a matter or property history."
    }
  ]
} as const satisfies SectionLandingConfig

export default privateOfficeConfig
