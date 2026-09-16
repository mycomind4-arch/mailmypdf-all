import type { SectionLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/hero.jpg"

export const recordsRequestConfig = {
  "id": "records-request",
  "name": "Records Requests",
  "path": "/records-request",
  "tone": "dark",
  "seoTitle": "Public Records Requests & FOIA Workflows | MailMyPDF",
  "seoDescription": "Prepare public records, FOIA, police, court, property, permit, vital-records, follow-up, and denial-appeal requests with a guided MailMyPDF workflow.",
  "eyebrow": "Public records · FOIA · police · court · property",
  "heroTitle": "Request public records with a clear, documented process.",
  "heroDescription": "Choose the records request that matches what you need, identify the agency and scope, prepare a focused request, and keep the request, response, follow-up, mailing, and proof record connected.",
  "heroImage": heroImage,
  "introTitle": "Start with the records you actually need.",
  "introText": "Public-records requests work better when the agency, record family, date range, subject, and requested material are clearly defined. Use a focused workflow instead of starting from a generic blank letter.",
  "trustLead": "Agency-aware request structure",
  "topics": [
    {
      "title": "Police & public-safety records",
      "text": "Police reports, body-camera records, arrest records, incident material, dispatch records, and related requests."
    },
    {
      "title": "Court & government records",
      "text": "Court records, agency files, government documents, communications, and other public-information requests."
    },
    {
      "title": "Property & permit records",
      "text": "Property, planning, permit, code-enforcement, inspection, and development-related records."
    },
    {
      "title": "Follow-up & appeals",
      "text": "Document follow-up, narrow or clarify a request, and prepare a response when access is delayed or denied."
    }
  ],
  "featured": [
    {
      "slug": "public-records-request",
      "title": "Public Records Request",
      "description": "Prepare a focused request to a public agency for identifiable government records."
    },
    {
      "slug": "foia-request",
      "title": "FOIA Request",
      "description": "Build a federal Freedom of Information Act request around the records and agency you identify."
    },
    {
      "slug": "police-records-request",
      "title": "Police Records Request",
      "description": "Request police or law-enforcement records with incident, date, subject, and agency context."
    },
    {
      "slug": "court-records-request",
      "title": "Court Records Request",
      "description": "Organize the court, case, parties, date range, and records you want to request."
    },
    {
      "slug": "property-records-request",
      "title": "Property Records Request",
      "description": "Request government-held property, permit, inspection, planning, or related records."
    },
    {
      "slug": "records-denial-appeal-request",
      "title": "Records Denial Appeal",
      "description": "Prepare a documented follow-up or appeal after a public-records request is denied."
    }
  ],
  "outcomes": [
    "A focused records request",
    "An organized scope and agency record",
    "A mailing and follow-up record"
  ],
  "safetyTitle": "Specific requests beat generic requests.",
  "safetyBody": "MailMyPDF helps organize the request and supporting record. Availability, exemptions, response times, fees, and appeal procedures vary by agency and jurisdiction.",
  "faqs": [
    [
      "What is a public records request?",
      "It is a request to a government agency for records it holds. The exact law, process, timing, exemptions, and fees depend on the agency and jurisdiction."
    ],
    [
      "Can I use this for police records?",
      "Yes. Police and public-safety workflows can organize the incident, agency, date range, people, case or report number, and records you want."
    ],
    [
      "Can MailMyPDF send the request for me?",
      "Where mailing is supported, you can review the exact packet before authorizing MailMyPDF fulfillment and keep the resulting mailing record with the matter."
    ],
    [
      "What if my request was denied?",
      "Use a denial or follow-up workflow to organize the original request, agency response, dates, stated reason, and the next correspondence you want to prepare."
    ]
  ],
  "related": [
    {
      "name": "Code Enforcement",
      "path": "/code-enforcement",
      "description": "Notices, inspections, violations, compliance responses, and case records."
    },
    {
      "name": "Legal Defense",
      "path": "/legal-defense",
      "description": "Organize police, court, discovery, and defense-related evidence."
    },
    {
      "name": "Notice Respond",
      "path": "/notice-respond",
      "description": "Respond to official notices and government correspondence."
    }
  ]
} as const satisfies SectionLandingConfig

export default recordsRequestConfig
