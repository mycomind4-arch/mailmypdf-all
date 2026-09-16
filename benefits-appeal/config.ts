import type { SectionLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/hero.jpg"

export const benefitsAppealConfig = {
  "id": "benefits-appeal",
  "name": "Benefits Appeal",
  "path": "/benefits-appeal",
  "tone": "dark",
  "seoTitle": "SSDI, SSI, Unemployment & Benefits Appeals | MailMyPDF",
  "seoDescription": "Prepare SSDI, SSI, Social Security, unemployment, Medicaid, VA, disability, and other benefits appeals with evidence organization, review, mailing, and proof.",
  "eyebrow": "SSDI · SSI · unemployment · Medicaid · benefits appeals",
  "heroTitle": "Appeal a benefits decision from the actual determination.",
  "heroDescription": "Start with the denial or adverse benefits decision. Organize the stated reason, dates, evidence, and requested review, then prepare a clear appeal and keep the mailing record with the matter.",
  "heroImage": heroImage,
  "introTitle": "Start with the program and decision you received.",
  "introText": "SSDI, SSI, unemployment, Medicaid, VA, disability, and other benefits programs use different procedures and records. The workflow keeps the source decision and supporting evidence visible throughout the appeal.",
  "trustLead": "Benefits-specific decision workflows",
  "topics": [
    {
      "title": "Social Security appeals",
      "text": "SSI, SSDI, reconsideration, Appeals Council, overpayment, and other Social Security decision workflows."
    },
    {
      "title": "Unemployment appeals",
      "text": "Unemployment denials, disqualifications, overpayments, and EDD-related appeal correspondence."
    },
    {
      "title": "Health & assistance programs",
      "text": "Medicaid, SNAP, food assistance, disability benefits, and related decision appeals."
    },
    {
      "title": "Other public benefits",
      "text": "VA claims, workers compensation, evidence packages, hearing preparation, and supporting-document submissions."
    }
  ],
  "featured": [
    {
      "slug": "ssdi-denial-appeal",
      "title": "SSDI Denial Appeal",
      "description": "Organize the Social Security disability decision, dates, evidence, and appeal record."
    },
    {
      "slug": "ssi-denial-appeal",
      "title": "SSI Denial Appeal",
      "description": "Prepare an SSI denial appeal from the determination and supporting information you provide."
    },
    {
      "slug": "social-security-overpayment-appeal",
      "title": "Social Security Overpayment Appeal",
      "description": "Build a documented response around an overpayment notice, amounts, dates, and supporting records."
    },
    {
      "slug": "unemployment-denial-appeal",
      "title": "Unemployment Denial Appeal",
      "description": "Organize the determination, work facts, evidence, and requested review."
    },
    {
      "slug": "medicaid-denial-appeal",
      "title": "Medicaid Denial Appeal",
      "description": "Prepare an appeal around the Medicaid decision, reason, records, and supporting evidence."
    },
    {
      "slug": "benefits-hearing-preparation",
      "title": "Benefits Hearing Preparation",
      "description": "Organize the decision, issues, chronology, evidence, and questions before a benefits hearing."
    }
  ],
  "outcomes": [
    "A decision-specific appeal",
    "An organized evidence and deadline record",
    "A reviewable mailing packet"
  ],
  "safetyTitle": "Benefits procedures vary by program and decision.",
  "safetyBody": "MailMyPDF helps organize the decision and prepare correspondence. It does not guarantee eligibility, continued benefits, payment, waiver, reversal, or a hearing outcome.",
  "faqs": [
    [
      "Can I appeal an SSDI or SSI denial?",
      "Yes. Social Security workflows can organize the decision, appeal stage, dates, supporting records, and correspondence."
    ],
    [
      "Can I appeal an unemployment denial?",
      "Yes. Unemployment workflows organize the determination, employment facts, dates, evidence, and requested review."
    ],
    [
      "Can I upload the denial letter?",
      "The intended workflow starts from the actual decision or notice so extracted details can be reviewed against the source document."
    ],
    [
      "Is Benefits Appeal legal advice?",
      "No. It is a document-preparation and evidence-organization tool and does not provide legal representation or guarantee a benefits outcome."
    ]
  ],
  "related": [
    {
      "name": "Appeal Mail",
      "path": "/appeal-mail",
      "description": "Broader appeal workflows for insurance, education, licensing, and government decisions."
    },
    {
      "name": "Claim Proof",
      "path": "/claim-proof",
      "description": "Build supporting evidence and proof packages around benefits and claim decisions."
    },
    {
      "name": "Notice Respond",
      "path": "/notice-respond",
      "description": "Respond to benefits notices and official agency correspondence."
    }
  ]
} as const satisfies SectionLandingConfig

export default benefitsAppealConfig
