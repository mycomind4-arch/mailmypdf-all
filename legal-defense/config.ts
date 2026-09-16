import type { SectionLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/hero.svg"

export const legalDefenseConfig = {
  "id": "legal-defense",
  "name": "Legal Defense",
  "path": "/legal-defense",
  "tone": "dark",
  "seoTitle": "Legal Defense Case & Evidence Workflows | MailMyPDF",
  "seoDescription": "Organize arrest, search, police-report, body-camera, discovery, chain-of-custody, timeline, witness, and defense evidence into a reviewable criminal-case record.",
  "eyebrow": "Arrest · search · discovery · evidence · case reconstruction",
  "heroTitle": "Organize the case record before important decisions are made.",
  "heroDescription": "Build a structured matter from police reports, video, dispatch records, discovery, witness statements, timelines, and other evidence. Surface gaps and contradictions while keeping legal decisions with the user and counsel.",
  "heroImage": heroImage,
  "introTitle": "Defense work starts with the record, not a generic letter.",
  "introText": "Legal Defense is designed to organize source materials, chronology, evidence, discovery, search and seizure issues, witness statements, and open questions into a reviewable case record.",
  "trustLead": "Evidence and provenance preserved",
  "topics": [
    {
      "title": "Arrest & search review",
      "text": "Wrongful-arrest case building, traffic-stop review, vehicle searches, consent issues, warrant validity, and probable-cause records."
    },
    {
      "title": "Police & video evidence",
      "text": "Police reports, body-camera footage, dash-camera footage, dispatch records, officer statements, and witness comparisons."
    },
    {
      "title": "Discovery & evidence",
      "text": "Discovery requests, missing discovery, chain of custody, exculpatory material, impeachment evidence, and expert evidence organization."
    },
    {
      "title": "Case reconstruction",
      "text": "Charging-document analysis, criminal-case timelines, issue spotting, attorney case briefs, and defense intelligence packets."
    }
  ],
  "featured": [
    {
      "slug": "wrongful-arrest-case-builder",
      "title": "Wrongful Arrest Case Builder",
      "description": "Organize the stop, arrest, reports, records, timeline, evidence, and disputed facts into one matter."
    },
    {
      "slug": "unlawful-search-and-seizure",
      "title": "Search & Seizure Evidence Review",
      "description": "Build a source-linked record around the search, consent, warrant, scope, and supporting evidence."
    },
    {
      "slug": "police-report-analysis",
      "title": "Police Report Analysis",
      "description": "Compare report statements, dates, people, events, and supporting records while preserving source references."
    },
    {
      "slug": "body-camera-evidence-review",
      "title": "Body Camera Evidence Review",
      "description": "Organize body-camera material against reports, timeline events, statements, and disputed facts."
    },
    {
      "slug": "discovery-request-package",
      "title": "Discovery Request Package",
      "description": "Prepare and track a structured request for case materials and related records."
    },
    {
      "slug": "defense-evidence-package",
      "title": "Defense Evidence Package",
      "description": "Organize documents, media, statements, timelines, and evidence into a reviewable packet."
    }
  ],
  "outcomes": [
    "A source-linked case chronology",
    "An organized evidence and discovery record",
    "A reviewable matter packet"
  ],
  "safetyTitle": "This is case organization, not legal representation.",
  "safetyBody": "Legal Defense can organize information, identify inconsistencies, and prepare records or correspondence. It does not provide legal representation, decide legal strategy, or replace a licensed attorney.",
  "faqs": [
    [
      "Can I organize police reports and body-camera evidence?",
      "Yes. Evidence workflows are designed to keep source records, video, statements, and timeline events connected for review."
    ],
    [
      "Can I use this after an arrest?",
      "The case-builder workflows can organize the stop, arrest, charges, reports, records, evidence, and chronology you provide."
    ],
    [
      "Can it identify contradictions?",
      "The shared intelligence layer can surface potential conflicts between source records for human review without treating generated analysis as a legal conclusion."
    ],
    [
      "Is Legal Defense a substitute for a lawyer?",
      "No. It is a case-organization and document-preparation system and does not provide legal representation or legal strategy."
    ]
  ],
  "related": [
    {
      "name": "Records Requests",
      "path": "/records-request",
      "description": "Request police, court, arrest, dispatch, and government records."
    },
    {
      "name": "Code Enforcement",
      "path": "/code-enforcement",
      "description": "Organize property enforcement notices, inspections, evidence, and agency records."
    },
    {
      "name": "Dispute Mail",
      "path": "/dispute-mail",
      "description": "Prepare documented consumer, account, debt, and billing disputes."
    }
  ]
} as const satisfies SectionLandingConfig

export default legalDefenseConfig
