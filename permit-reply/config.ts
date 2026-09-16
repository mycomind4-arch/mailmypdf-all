import type { SectionLandingConfig } from "@mailmypdf/design-system"
import heroImage from "./assets/hero.jpg"

export const permitReplyConfig = {
  "id": "permit-reply",
  "name": "Permit Reply",
  "path": "/permit-reply",
  "tone": "light",
  "seoTitle": "Permit Denial, Inspection & Zoning Responses | MailMyPDF",
  "seoDescription": "Respond to building-permit denials, plan-review comments, failed inspections, zoning issues, permit deficiencies, and closeout problems with organized project records.",
  "eyebrow": "Permits · plan review · inspections · zoning · closeout",
  "heroTitle": "Respond to permit and inspection issues with the project record in hand.",
  "heroDescription": "Start from the denial, correction list, inspection result, zoning decision, or permit deficiency. Organize project facts and supporting documents, prepare reviewable correspondence, and keep delivery proof connected.",
  "heroImage": heroImage,
  "introTitle": "Permit correspondence should follow the project issue.",
  "introText": "A plan-review correction, failed inspection, permit denial, zoning decision, and closeout problem are different jobs. The selected workflow keeps the property, permit, agency, reviewer comments, evidence, and response together.",
  "trustLead": "Project and permit context preserved",
  "topics": [
    {
      "title": "Permit denials & deficiencies",
      "text": "Building, construction, electrical, plumbing, mechanical, roofing, and other permit denials or deficiency responses."
    },
    {
      "title": "Plan review & inspections",
      "text": "Correction comments, failed inspections, evidence submissions, reinspection correspondence, and project updates."
    },
    {
      "title": "Zoning & land use",
      "text": "Zoning permits, nonconforming use, site development, land development, and administrative responses."
    },
    {
      "title": "Occupancy & closeout",
      "text": "Certificates of occupancy, permit status, project closeout, reconsideration, and administrative appeal correspondence."
    }
  ],
  "featured": [
    {
      "slug": "building-permit-denial-response",
      "title": "Building Permit Denial Response",
      "description": "Organize the denial, application, plans, stated reasons, and reviewed response."
    },
    {
      "slug": "building-permit-correction-response",
      "title": "Plan Review Correction Response",
      "description": "Respond to permit corrections or review comments item by item with supporting records."
    },
    {
      "slug": "certificate-of-occupancy-response",
      "title": "Certificate of Occupancy Response",
      "description": "Organize outstanding approvals, inspections, corrections, and closeout correspondence."
    },
    {
      "slug": "zoning-permit-response",
      "title": "Zoning Permit Response",
      "description": "Prepare correspondence around zoning review, conditions, requested information, or a decision."
    },
    {
      "slug": "permit-deficiency-response",
      "title": "Permit Deficiency Response",
      "description": "Build a documented response to a deficiency notice or missing-item request."
    },
    {
      "slug": "permit-reconsideration",
      "title": "Permit Reconsideration Request",
      "description": "Prepare a reconsideration request from the decision, project record, and supporting evidence."
    }
  ],
  "outcomes": [
    "A project-specific response",
    "An organized correction and evidence record",
    "A reviewable correspondence packet"
  ],
  "safetyTitle": "Local requirements remain controlling.",
  "safetyBody": "Codes, amendments, review standards, deadlines, filing methods, and appeal rights vary by jurisdiction and project. MailMyPDF does not replace an architect, engineer, contractor, code official, or attorney.",
  "faqs": [
    [
      "Can I respond to plan-review comments?",
      "Yes. A correction-response workflow can keep each reviewer comment, your response, revised document, and supporting evidence connected."
    ],
    [
      "Can I respond to a failed inspection?",
      "Use an inspection or permit workflow to organize the result, cited items, completed work, photos, records, and requested next step."
    ],
    [
      "Does Permit Reply interpret building codes for me?",
      "It can help organize cited material and user-provided records, but local code interpretation and professional judgment may require the appropriate licensed professional or agency."
    ],
    [
      "Can I review everything before mailing?",
      "Yes. The workflow is intended to keep consequential correspondence behind explicit review and approval."
    ]
  ],
  "related": [
    {
      "name": "Code Enforcement",
      "path": "/code-enforcement",
      "description": "Respond to violations, inspections, compliance orders, and enforcement actions."
    },
    {
      "name": "Records Requests",
      "path": "/records-request",
      "description": "Request permits, inspections, planning records, and agency files."
    },
    {
      "name": "Small Business",
      "path": "/small-business",
      "description": "Prepare business licensing, compliance, vendor, and formal correspondence."
    }
  ]
} as const satisfies SectionLandingConfig

export default permitReplyConfig
