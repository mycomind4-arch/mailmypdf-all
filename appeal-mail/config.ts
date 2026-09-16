import type { SectionLandingConfig } from "@mailmypdf/design-system"

export const appealMailConfig = {
  "id": "appeal-mail",
  "name": "Appeal Mail",
  "path": "/appeal-mail",
  "tone": "dark",
  "seoTitle": "Appeal Denials & Government Decisions | MailMyPDF",
  "seoDescription": "Prepare appeals for insurance denials, benefits decisions, financial-aid actions, license suspensions, and other adverse decisions with evidence, review, mailing, and proof.",
  "eyebrow": "Appeals · reconsideration · denied claims · adverse decisions",
  "heroTitle": "Build a clear appeal from the decision you received.",
  "heroDescription": "Start with the denial, determination, suspension, or adverse decision. Organize the reasons, evidence, deadlines, and requested outcome, then prepare a reviewable appeal packet and keep proof of what you sent.",
  "heroImage": "/heroes/appeal-mail.jpg",
  "introTitle": "Different decisions need different appeals.",
  "introText": "Appeal Mail routes the matter by the decision you received rather than forcing every denial into the same letter. The decision, stated reason, deadline, evidence, and review path remain connected.",
  "trustLead": "Decision-first appeal workflows",
  "topics": [
    {
      "title": "Insurance appeals",
      "text": "Denied claims, coverage decisions, medical necessity, prior authorization, dental, auto, and life-insurance matters."
    },
    {
      "title": "Benefits appeals",
      "text": "SSDI, SSI, Social Security, Medicaid, unemployment, workers compensation, and related benefit decisions."
    },
    {
      "title": "Education & financial aid",
      "text": "SAP appeals, financial-aid suspension, special circumstances, reinstatement, and scholarship decisions."
    },
    {
      "title": "Licensing & administrative actions",
      "text": "License suspensions, DMV decisions, government actions, reconsideration requests, and administrative appeals."
    }
  ],
  "featured": [
    {
      "slug": "appeal-insurance-claim-denial",
      "title": "Insurance Claim Denial Appeal",
      "description": "Build an appeal from the denial reason, claim record, supporting evidence, and requested reconsideration."
    },
    {
      "slug": "appeal-medical-insurance-denial",
      "title": "Medical Insurance Denial Appeal",
      "description": "Organize the coverage decision, medical documentation, provider records, and appeal response."
    },
    {
      "slug": "appeal-ssdi-denial",
      "title": "SSDI Denial Appeal",
      "description": "Prepare a structured Social Security disability appeal from the decision and supporting record."
    },
    {
      "slug": "appeal-unemployment-denial",
      "title": "Unemployment Denial Appeal",
      "description": "Organize the determination, work-separation facts, dates, supporting records, and appeal."
    },
    {
      "slug": "sap-appeal",
      "title": "SAP Appeal",
      "description": "Prepare a satisfactory academic progress appeal with circumstances and supporting documentation."
    },
    {
      "slug": "dmv-suspension-revocation-appeal",
      "title": "DMV Suspension or Revocation Appeal",
      "description": "Organize the agency action, dates, records, and review or hearing request."
    }
  ],
  "outcomes": [
    "A structured appeal letter or packet",
    "An evidence checklist and supporting record",
    "A mailing and proof record"
  ],
  "safetyTitle": "The decision letter stays at the center of the appeal.",
  "safetyBody": "Appeal Mail helps organize information and prepare correspondence; it does not guarantee reversal, entitlement, coverage, benefits, or any legal outcome.",
  "faqs": [
    [
      "What decisions can I appeal?",
      "The directory includes insurance, benefits, Social Security, unemployment, financial-aid, licensing, DMV, and other administrative decision workflows."
    ],
    [
      "What should I upload first?",
      "Usually the denial, determination, suspension, or decision letter. The selected workflow can then identify additional supporting documents to organize."
    ],
    [
      "Can I edit the appeal before sending?",
      "Yes. The intended workflow presents the draft and packet for review before any mailing authorization."
    ],
    [
      "Does Appeal Mail guarantee that the decision will change?",
      "No. It is a document-preparation and correspondence tool and cannot guarantee an agency, insurer, school, or administrator will reverse a decision."
    ]
  ],
  "related": [
    {
      "name": "Benefits Appeal",
      "path": "/benefits-appeal",
      "description": "Focused workflows for Social Security, unemployment, Medicaid, and benefit decisions."
    },
    {
      "name": "Insurance Claims",
      "path": "/insurance-claims",
      "description": "Build claims, challenge denials, and organize insurance evidence."
    },
    {
      "name": "Claim Proof",
      "path": "/claim-proof",
      "description": "Build evidence and proof packages around claims and adverse decisions."
    }
  ]
} as const satisfies SectionLandingConfig

export default appealMailConfig
