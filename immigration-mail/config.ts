import type { SectionLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/hero.jpg"

export const immigrationMailConfig = {
  "id": "immigration-mail",
  "name": "Immigration Mail",
  "path": "/immigration-mail",
  "tone": "dark",
  "seoTitle": "USCIS RFE & Immigration Response Workflows | MailMyPDF",
  "seoDescription": "Prepare USCIS RFE, NOID, NOIR, evidence submissions, immigration cover letters, deadline responses, and mailing packets with guided review and proof.",
  "eyebrow": "USCIS · RFE · NOID · evidence · immigration correspondence",
  "heroTitle": "Prepare USCIS responses and immigration correspondence with confidence.",
  "heroDescription": "Start from the notice, request for evidence, case correspondence, or filing objective. Organize the requested information and supporting documents, review the packet, and keep mailing and proof connected.",
  "heroImage": heroImage,
  "introTitle": "Build the packet around the USCIS document or filing objective.",
  "introText": "A request for evidence, notice of intent, supplemental submission, cover letter, or case follow-up needs different inputs. The workflow keeps the source notice, evidence, draft, attachments, and mailing record together.",
  "trustLead": "USCIS notice and evidence structure",
  "topics": [
    {
      "title": "RFE responses",
      "text": "General USCIS RFEs plus I-485, I-140, H-1B, L-1, N-400, EB-1, NIW, and medical evidence requests."
    },
    {
      "title": "NOID & NOIR responses",
      "text": "Notice of Intent to Deny, Notice of Intent to Revoke, and other immigration notice-response workflows."
    },
    {
      "title": "Evidence submissions",
      "text": "Supplemental evidence, supporting documents, affidavits, certified translations, and explanation letters."
    },
    {
      "title": "Case correspondence",
      "text": "Filing cover letters, deadline responses, biometrics correspondence, follow-up submissions, and mailing proof packages."
    }
  ],
  "featured": [
    {
      "slug": "uscis-rfe-response",
      "title": "USCIS RFE Response",
      "description": "Organize the RFE, requested evidence, response deadline, supporting documents, and packet."
    },
    {
      "slug": "i-485-rfe-response",
      "title": "I-485 RFE Response",
      "description": "Prepare an I-485 request-for-evidence response around the issues and documents requested."
    },
    {
      "slug": "h-1b-rfe-response",
      "title": "H-1B RFE Response",
      "description": "Structure an H-1B RFE response packet using the notice and supporting material you provide."
    },
    {
      "slug": "notice-of-intent-to-deny-response",
      "title": "NOID Response",
      "description": "Organize a Notice of Intent to Deny, stated concerns, evidence, and reviewed response."
    },
    {
      "slug": "supplemental-evidence-submission",
      "title": "Supplemental Evidence Submission",
      "description": "Prepare a clearly indexed supplemental evidence package for an existing matter."
    },
    {
      "slug": "immigration-filing-cover-letter",
      "title": "Immigration Filing Cover Letter",
      "description": "Build a filing cover letter and attachment index around the packet you intend to submit."
    }
  ],
  "outcomes": [
    "A notice-specific response or filing letter",
    "An organized evidence and attachment index",
    "A reviewable mailing packet"
  ],
  "safetyTitle": "Immigration filings are consequence-sensitive.",
  "safetyBody": "MailMyPDF organizes documents and correspondence. It does not provide legal representation or guarantee eligibility, approval, status, or a USCIS outcome.",
  "faqs": [
    [
      "Can I use this for a USCIS RFE?",
      "Yes. RFE workflows start from the notice and help organize requested evidence, response issues, attachments, and the outgoing packet."
    ],
    [
      "Can I use it for a NOID or NOIR?",
      "The directory includes notice-of-intent response workflows designed to organize the notice, concerns, evidence, and reviewed correspondence."
    ],
    [
      "Does Immigration Mail file forms with USCIS electronically?",
      "The product is centered on document preparation and mailing workflows. Any specific electronic filing capability should only be used where explicitly supported."
    ],
    [
      "Is this immigration legal advice?",
      "No. Immigration Mail is a document-preparation and correspondence tool, not a law firm or legal representative."
    ]
  ],
  "related": [
    {
      "name": "Notice Respond",
      "path": "/notice-respond",
      "description": "Respond to official government and agency notices."
    },
    {
      "name": "Records Requests",
      "path": "/records-request",
      "description": "Request government-held records and case-related documents."
    },
    {
      "name": "Appeal Mail",
      "path": "/appeal-mail",
      "description": "Prepare reconsideration requests and appeals after adverse decisions."
    }
  ]
} as const satisfies SectionLandingConfig

export default immigrationMailConfig
