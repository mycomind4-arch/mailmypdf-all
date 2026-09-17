import type { SectionLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/hero.jpg"

export const noticeRespondConfig = {
  "id": "notice-respond",
  "name": "Notice Respond",
  "path": "/notice-respond",
  "tone": "dark",
  "seoTitle": "Respond to IRS & Government Notices | MailMyPDF",
  "seoDescription": "Respond to IRS, tax, benefits, licensing, court, compliance, and other official notices with guided workflows that organize deadlines, evidence, drafting, and mailing.",
  "eyebrow": "IRS · tax · agency · court · compliance notices",
  "heroTitle": "Respond to the notice in front of you.",
  "heroDescription": "Start from the official notice you actually received. Identify the agency, notice type, dates, requested action, and supporting records, then prepare a reviewable response and keep mailing proof connected.",
  "heroImage": heroImage,
  "introTitle": "The notice should drive the workflow.",
  "introText": "An IRS notice, benefits notice, licensing letter, court notice, and regulatory deficiency should not be treated as the same problem. The workflow starts with the source document and routes the matter from there.",
  "trustLead": "Notice-first intake and deadlines",
  "topics": [
    {
      "title": "IRS & tax notices",
      "text": "CP14 balance-due notices, CP2000 notices, collection notices, penalty notices, underreporter correspondence, audit letters, and state tax notices."
    },
    {
      "title": "Benefits & agency notices",
      "text": "Social Security, unemployment, benefits, licensing, and other government-agency correspondence."
    },
    {
      "title": "Court & compliance notices",
      "text": "Civil summonses, administrative hearing notices, compliance notices, and regulatory deficiencies."
    },
    {
      "title": "Follow-up responses",
      "text": "Evidence submissions, deadline-extension requests, notice disagreements, appeals, and post-submission follow-up."
    }
  ],
  "featured": [
    {
      "slug": "cp14-response",
      "title": "IRS CP14 Response",
      "description": "Organize an IRS CP14 balance-due notice, confirm the tax period, amount and response path, prepare supported correspondence when appropriate, and retain mailing proof."
    },
    {
      "slug": "cp2000-response",
      "title": "CP2000 Response",
      "description": "Organize an IRS CP2000 notice, proposed changes, supporting records, and your reviewed response."
    },
    {
      "slug": "cp504-response",
      "title": "CP504 Response",
      "description": "Prepare a response record around an IRS CP504 collection notice and the facts you provide."
    },
    {
      "slug": "irs-audit-letter-response",
      "title": "IRS Audit Letter Response",
      "description": "Structure the notice, tax period, requested material, supporting documents, and response."
    },
    {
      "slug": "state-tax-notice-response",
      "title": "State Tax Notice Response",
      "description": "Prepare a documented response to a state tax or revenue-department notice."
    },
    {
      "slug": "administrative-hearing-notice-response",
      "title": "Administrative Hearing Notice Response",
      "description": "Organize a hearing notice, dates, issues, evidence, and next correspondence."
    },
    {
      "slug": "deadline-extension-request",
      "title": "Deadline Extension Request",
      "description": "Prepare a documented request for additional time when the workflow and recipient allow it."
    }
  ],
  "outcomes": [
    "A notice-specific response",
    "A deadline and evidence record",
    "A reviewable outgoing packet"
  ],
  "safetyTitle": "Source document first. Generated text second.",
  "safetyBody": "The notice remains the source record. Extracted details and generated suggestions should stay distinguishable from verified facts, and consequential responses require user review.",
  "faqs": [
    [
      "What notices can I respond to?",
      "The section is designed for IRS, state tax, benefits, licensing, court, compliance, regulatory, and other official notices represented in the workflow directory."
    ],
    [
      "Can the workflow read my notice?",
      "Document-assisted workflows can extract candidate details such as notice numbers, dates, amounts, and deadlines for your review rather than silently treating them as verified facts."
    ],
    [
      "Does MailMyPDF give legal or tax advice?",
      "No. It helps organize source documents and prepare correspondence. Legal, tax, and procedural questions may require a qualified professional."
    ],
    [
      "Can I review the response before it is mailed?",
      "Yes. The intended flow separates drafting, review, approval, payment, and physical mailing."
    ]
  ],
  "related": [
    {
      "name": "Appeal Mail",
      "path": "/appeal-mail",
      "description": "Prepare appeals and reconsideration requests after adverse decisions."
    },
    {
      "name": "Benefits Appeal",
      "path": "/benefits-appeal",
      "description": "Appeal SSDI, SSI, unemployment, Medicaid, and other benefits decisions."
    },
    {
      "name": "Code Enforcement",
      "path": "/code-enforcement",
      "description": "Respond to property compliance, inspection, and violation notices."
    }
  ]
} as const satisfies SectionLandingConfig

export default noticeRespondConfig
