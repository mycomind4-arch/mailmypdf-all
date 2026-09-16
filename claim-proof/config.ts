import type { SectionLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/hero.jpg"

export const claimProofConfig = {
  "id": "claim-proof",
  "name": "Claim Proof",
  "path": "/claim-proof",
  "tone": "light",
  "seoTitle": "Claim Evidence & Proof Packages | MailMyPDF",
  "seoDescription": "Organize claim evidence, supporting documents, denial records, timelines, appeal material, and proof-of-submission packages for insurance, benefits, and reimbursement matters.",
  "eyebrow": "Claim evidence · supporting documents · timelines · proof",
  "heroTitle": "Build the evidence record before you build the argument.",
  "heroDescription": "Start from the claim, decision, denial, or reimbursement issue. Organize the facts and supporting documents, prepare a reviewable proof package, and keep submission and mailing evidence connected.",
  "heroImage": heroImage,
  "introTitle": "Claims are easier to evaluate when the record is organized.",
  "introText": "Claim Proof focuses on the supporting record: documents, dates, amounts, photos, reports, correspondence, and evidence tied to the issue they support.",
  "trustLead": "Evidence-first claim organization",
  "topics": [
    {
      "title": "Insurance claim documentation",
      "text": "Home, auto, property, life, medical, dental, travel, and reimbursement claim documentation."
    },
    {
      "title": "Disability & benefits evidence",
      "text": "Short-term disability, long-term disability, medical records, benefit decisions, and supporting evidence."
    },
    {
      "title": "Denied-claim proof",
      "text": "Denial letters, policy or plan references, claim timelines, evidence gaps, and appeal supporting documents."
    },
    {
      "title": "Submission records",
      "text": "Attachment indexes, evidence checklists, follow-up packages, and proof of what was submitted and when."
    }
  ],
  "featured": [
    {
      "slug": "insurance-claim-documentation",
      "title": "Insurance Claim Documentation",
      "description": "Build an organized claim record from the policy, loss information, correspondence, and supporting evidence."
    },
    {
      "slug": "property-damage-claim-package",
      "title": "Property Damage Claim Package",
      "description": "Organize property-loss photos, estimates, inventories, reports, and claim correspondence."
    },
    {
      "slug": "disability-claim-evidence-package",
      "title": "Disability Claim Evidence Package",
      "description": "Structure medical, work, decision, and supporting records around a disability claim."
    },
    {
      "slug": "claim-denial-evidence-package",
      "title": "Claim Denial Evidence Package",
      "description": "Build a source-linked record around a denial and the evidence relevant to the stated reason."
    },
    {
      "slug": "claim-timeline-package",
      "title": "Claim Timeline Package",
      "description": "Create a reviewable chronology of claim events, submissions, communications, and decisions."
    },
    {
      "slug": "claim-record-proof-of-submission-package",
      "title": "Proof of Submission Package",
      "description": "Keep the outgoing packet, attachment record, mailing details, and available delivery proof together."
    }
  ],
  "outcomes": [
    "An organized evidence package",
    "A source-linked claim timeline",
    "A proof-of-submission record"
  ],
  "safetyTitle": "Evidence should remain distinguishable from conclusions.",
  "safetyBody": "Claim Proof organizes user-supplied and document-derived information. It does not promise coverage, eligibility, payment, reimbursement, or reversal of a decision.",
  "faqs": [
    [
      "What is a claim proof package?",
      "It is an organized record of the documents, facts, timeline, correspondence, and supporting material relevant to a claim or decision."
    ],
    [
      "Can I use this after a denial?",
      "Yes. Denial-focused workflows can organize the decision, stated reason, supporting evidence, timeline, and material for a response or appeal."
    ],
    [
      "Can I include photos and supporting documents?",
      "The workflow is designed to keep uploaded records and generated correspondence tied to the matter and the issue they support."
    ],
    [
      "Does Claim Proof decide whether my claim is valid?",
      "No. It helps organize the record and prepare documents; it does not guarantee entitlement, coverage, or any claim outcome."
    ]
  ],
  "related": [
    {
      "name": "Insurance Claims",
      "path": "/insurance-claims",
      "description": "Prepare new claims, denial responses, and insurance appeals."
    },
    {
      "name": "Appeal Mail",
      "path": "/appeal-mail",
      "description": "Build an appeal from an adverse decision and supporting record."
    },
    {
      "name": "Benefits Appeal",
      "path": "/benefits-appeal",
      "description": "Prepare benefits appeals with evidence and decision-specific workflows."
    }
  ]
} as const satisfies SectionLandingConfig

export default claimProofConfig
