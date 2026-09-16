import type { SectionLandingConfig } from "@mailmypdf/design-system"

export const insuranceClaimsConfig = {
  "id": "insurance-claims",
  "name": "Insurance Claims",
  "path": "/insurance-claims",
  "tone": "light",
  "seoTitle": "Insurance Claim, Denial & Appeal Workflows | MailMyPDF",
  "seoDescription": "Prepare insurance claims, denied-claim responses, coverage disputes, property-loss claims, auto claims, medical denials, disability claims, and evidence packages.",
  "eyebrow": "Insurance claims · denials · property loss · coverage disputes",
  "heroTitle": "Build the claim record. Challenge the denial.",
  "heroDescription": "Choose a focused workflow for a new claim, denied claim, property loss, coverage dispute, health or disability matter. Organize the evidence, prepare reviewable correspondence, and keep mailing and proof connected.",
  "heroImage": "/heroes/insurance-claims.jpg",
  "introTitle": "Start with the insurance problem you actually have.",
  "introText": "A new property claim, denied auto claim, roof loss, water damage, coverage denial, health claim, and disability denial each need a different record. The workflow keeps policy, loss, evidence, and correspondence organized.",
  "trustLead": "Claim-specific evidence structure",
  "topics": [
    {
      "title": "Property claims",
      "text": "Homeowners, roof, water, fire, smoke, hail, storm, flood, theft, vandalism, and property-damage claims."
    },
    {
      "title": "Auto claims",
      "text": "Car insurance claims, denied auto claims, vehicle theft, vandalism, and accident-related documentation."
    },
    {
      "title": "Coverage disputes & denials",
      "text": "Denied claims, underpaid claims, coverage denials, claim disputes, follow-up, and appeal correspondence."
    },
    {
      "title": "Health, disability & specialized claims",
      "text": "Medical denials, health insurance, short- and long-term disability, life insurance, and commercial claims."
    }
  ],
  "featured": [
    {
      "slug": "denied-insurance-claim",
      "title": "Denied Insurance Claim",
      "description": "Organize the denial reason, policy references, claim record, and supporting evidence for a response."
    },
    {
      "slug": "water-damage-insurance-claim",
      "title": "Water Damage Insurance Claim",
      "description": "Build a record from the loss, photos, estimates, repair information, policy, and correspondence."
    },
    {
      "slug": "roof-damage-insurance-claim",
      "title": "Roof Damage Insurance Claim",
      "description": "Organize roof damage, inspection material, photos, estimates, claim communications, and response."
    },
    {
      "slug": "auto-insurance-claim",
      "title": "Auto Insurance Claim",
      "description": "Prepare an auto claim record around the accident, damage, coverage, evidence, and correspondence."
    },
    {
      "slug": "denied-auto-insurance-claim",
      "title": "Denied Auto Insurance Claim",
      "description": "Build a documented response around the stated denial and supporting claim evidence."
    },
    {
      "slug": "medical-insurance-denial",
      "title": "Medical Insurance Denial",
      "description": "Organize the coverage decision, provider records, authorization history, medical documentation, and response."
    }
  ],
  "outcomes": [
    "A claim or denial response",
    "An organized policy and evidence record",
    "A reviewable claim packet"
  ],
  "safetyTitle": "The policy and claim record should stay visible.",
  "safetyBody": "MailMyPDF organizes claims and correspondence. It does not act as an insurer, adjuster, public adjuster, attorney, or claims representative and cannot guarantee payment or coverage.",
  "faqs": [
    [
      "Can I prepare a new insurance claim?",
      "Yes. New-claim workflows organize the loss, policy information, damage documentation, estimates, correspondence, and supporting records."
    ],
    [
      "Can I respond to a denied claim?",
      "Yes. Denial workflows start from the insurer's stated reason and help organize policy language, evidence, correspondence, and a reviewed response."
    ],
    [
      "Can I use it for roof or water damage?",
      "Yes. The directory includes focused property-loss workflows for roof, water, fire, smoke, hail, storm, and other damage."
    ],
    [
      "Does Insurance Claims guarantee payment?",
      "No. The product helps organize and prepare the claim record and correspondence; claim decisions remain with the insurer or other decision-maker."
    ]
  ],
  "related": [
    {
      "name": "Claim Proof",
      "path": "/claim-proof",
      "description": "Build evidence, timelines, and proof-of-submission packages."
    },
    {
      "name": "Appeal Mail",
      "path": "/appeal-mail",
      "description": "Prepare an appeal after an insurance or coverage decision."
    },
    {
      "name": "Dispute Mail",
      "path": "/dispute-mail",
      "description": "Prepare billing, payment, and consumer dispute correspondence."
    }
  ]
} as const satisfies SectionLandingConfig

export default insuranceClaimsConfig
