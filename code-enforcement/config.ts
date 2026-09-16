import type { SectionLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/hero.jpg"

export const codeEnforcementConfig = {
  "id": "code-enforcement",
  "name": "Code Enforcement",
  "path": "/code-enforcement",
  "tone": "dark",
  "seoTitle": "Code Enforcement Notice & Violation Responses | MailMyPDF",
  "seoDescription": "Respond to code enforcement notices, property inspections, violations, nuisance allegations, abatement orders, correction notices, hearing requests, and compliance evidence.",
  "eyebrow": "Code violations · inspections · nuisance · compliance · appeals",
  "heroTitle": "Turn a code enforcement notice into documented action.",
  "heroDescription": "Start from the notice, inspection request, violation, citation, or abatement action. Organize the property facts and evidence, prepare a reviewable response, and keep the case and mailing record together.",
  "heroImage": heroImage,
  "introTitle": "Start with the action the agency actually took.",
  "introText": "An inspection request, notice of violation, nuisance allegation, abatement order, correction notice, and hearing request each create a different workflow. Keep the notice and property record at the center.",
  "trustLead": "Notice and property record first",
  "topics": [
    {
      "title": "Violation notices",
      "text": "Code violations, nuisance allegations, property-maintenance issues, solid waste, junk vehicles, and unpermitted structures."
    },
    {
      "title": "Inspection & access",
      "text": "Inspection notices, property-search requests, access correspondence, inspection warrants, and correction records."
    },
    {
      "title": "Compliance & evidence",
      "text": "Correction notices, compliance plans, proof of correction, evidence submissions, extensions, and case follow-up."
    },
    {
      "title": "Hearings & appeals",
      "text": "Administrative hearing requests, code-enforcement appeals, case-file packages, and agency record requests."
    }
  ],
  "featured": [
    {
      "slug": "code-violation-notice-response",
      "title": "Code Violation Notice Response",
      "description": "Organize the notice, alleged violations, property facts, supporting records, and reviewed response."
    },
    {
      "slug": "request-to-search-property-response",
      "title": "Request to Search Property Response",
      "description": "Prepare a documented response to an agency request to inspect or search property."
    },
    {
      "slug": "inspection-notice-response",
      "title": "Inspection Notice Response",
      "description": "Organize the inspection notice, property context, dates, requested access, and correspondence."
    },
    {
      "slug": "unpermitted-structure-response",
      "title": "Unpermitted Structure Response",
      "description": "Build a response record around an alleged unpermitted structure and the documents you provide."
    },
    {
      "slug": "code-enforcement-evidence-submission",
      "title": "Code Enforcement Evidence Submission",
      "description": "Package photos, permits, records, explanations, and other supporting evidence for review."
    },
    {
      "slug": "code-enforcement-appeal",
      "title": "Code Enforcement Appeal",
      "description": "Prepare an appeal or review request from the agency action, record, dates, and supporting evidence."
    }
  ],
  "outcomes": [
    "A notice-specific response",
    "A property and evidence record",
    "A documented case and mailing trail"
  ],
  "safetyTitle": "Local code, procedure, and property facts matter.",
  "safetyBody": "MailMyPDF helps organize the source notice, records, and correspondence. It does not provide legal advice, determine whether a violation exists, or guarantee an agency outcome.",
  "faqs": [
    [
      "Can I respond to a code violation notice?",
      "Yes. Notice-response workflows keep the alleged violations, dates, property facts, evidence, and outgoing response organized."
    ],
    [
      "Can I respond to an inspection request?",
      "Yes. Inspection workflows organize the agency request, property context, dates, access issues, and correspondence you want to prepare."
    ],
    [
      "Can I submit proof of correction?",
      "Evidence workflows can package photos, permits, receipts, reports, and other records with a reviewed submission letter."
    ],
    [
      "Can I request an appeal or hearing?",
      "Where appropriate, appeal and hearing workflows organize the agency action, deadlines, issues, evidence, and requested review."
    ]
  ],
  "related": [
    {
      "name": "Records Requests",
      "path": "/records-request",
      "description": "Request code-enforcement, inspection, complaint, permit, and property records."
    },
    {
      "name": "Permit Reply",
      "path": "/permit-reply",
      "description": "Respond to permit denials, plan review, inspections, zoning, and closeout issues."
    },
    {
      "name": "Legal Defense",
      "path": "/legal-defense",
      "description": "Organize government records, search issues, evidence, and defense-related matters."
    }
  ]
} as const satisfies SectionLandingConfig

export default codeEnforcementConfig
