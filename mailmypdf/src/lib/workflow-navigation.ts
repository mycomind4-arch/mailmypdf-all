export type WorkflowNavigationItem = {
  slug: string
  label: string
  publicHref: string
  workspaceHref: string
}

export type WorkflowNavigationSection = {
  id: string
  label: string
  publicHref: string
  workspaceHref: string
  workflows: readonly WorkflowNavigationItem[]
}

/**
 * Canonical authenticated workflow navigation.
 *
 * Public workflow URLs remain dedicated SEO/discovery pages. Authenticated
 * navigation always uses workspaceHref so signed-in users stay inside the
 * application shell and never need to pass through marketing pages.
 */
export const WORKFLOW_NAV_SECTIONS = [
  {
    "id": "appeal-mail",
    "label": "Appeal Mail",
    "publicHref": "/appeal-mail/workflows",
    "workspaceHref": "/dashboard/workflows/appeal-mail",
    "workflows": [
      {
        "slug": "appeal-car-insurance-claim",
        "label": "Appeal Car Insurance Claim",
        "publicHref": "/appeal-mail/workflows/appeal-car-insurance-claim",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-car-insurance-claim"
      },
      {
        "slug": "appeal-denied-claim",
        "label": "Appeal Denied Claim",
        "publicHref": "/appeal-mail/workflows/appeal-denied-claim",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-denied-claim"
      },
      {
        "slug": "appeal-dental-insurance-denial",
        "label": "Appeal Dental Insurance Denial",
        "publicHref": "/appeal-mail/workflows/appeal-dental-insurance-denial",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-dental-insurance-denial"
      },
      {
        "slug": "appeal-edd-disqualification",
        "label": "Appeal Edd Disqualification",
        "publicHref": "/appeal-mail/workflows/appeal-edd-disqualification",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-edd-disqualification"
      },
      {
        "slug": "appeal-financial-aid-decision",
        "label": "Appeal Financial Aid Decision",
        "publicHref": "/appeal-mail/workflows/appeal-financial-aid-decision",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-financial-aid-decision"
      },
      {
        "slug": "appeal-government-decision",
        "label": "Appeal Government Decision",
        "publicHref": "/appeal-mail/workflows/appeal-government-decision",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-government-decision"
      },
      {
        "slug": "appeal-insurance-claim-denial",
        "label": "Appeal Insurance Claim Denial",
        "publicHref": "/appeal-mail/workflows/appeal-insurance-claim-denial",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-insurance-claim-denial"
      },
      {
        "slug": "appeal-insurance-coverage-denial",
        "label": "Appeal Insurance Coverage Denial",
        "publicHref": "/appeal-mail/workflows/appeal-insurance-coverage-denial",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-insurance-coverage-denial"
      },
      {
        "slug": "appeal-life-insurance-denial",
        "label": "Appeal Life Insurance Denial",
        "publicHref": "/appeal-mail/workflows/appeal-life-insurance-denial",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-life-insurance-denial"
      },
      {
        "slug": "appeal-medicaid-denial",
        "label": "Appeal Medicaid Denial",
        "publicHref": "/appeal-mail/workflows/appeal-medicaid-denial",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-medicaid-denial"
      },
      {
        "slug": "appeal-medical-insurance-denial",
        "label": "Appeal Medical Insurance Denial",
        "publicHref": "/appeal-mail/workflows/appeal-medical-insurance-denial",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-medical-insurance-denial"
      },
      {
        "slug": "appeal-medical-necessity-denial",
        "label": "Appeal Medical Necessity Denial",
        "publicHref": "/appeal-mail/workflows/appeal-medical-necessity-denial",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-medical-necessity-denial"
      },
      {
        "slug": "appeal-medicare-claim-denial",
        "label": "Appeal Medicare Claim Denial",
        "publicHref": "/appeal-mail/workflows/appeal-medicare-claim-denial",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-medicare-claim-denial"
      },
      {
        "slug": "appeal-out-of-network-denial",
        "label": "Appeal Out Of Network Denial",
        "publicHref": "/appeal-mail/workflows/appeal-out-of-network-denial",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-out-of-network-denial"
      },
      {
        "slug": "appeal-prior-authorization-denial",
        "label": "Appeal Prior Authorization Denial",
        "publicHref": "/appeal-mail/workflows/appeal-prior-authorization-denial",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-prior-authorization-denial"
      },
      {
        "slug": "appeal-social-security-decision",
        "label": "Appeal Social Security Decision",
        "publicHref": "/appeal-mail/workflows/appeal-social-security-decision",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-social-security-decision"
      },
      {
        "slug": "appeal-social-security-overpayment",
        "label": "Appeal Social Security Overpayment",
        "publicHref": "/appeal-mail/workflows/appeal-social-security-overpayment",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-social-security-overpayment"
      },
      {
        "slug": "appeal-ssdi-denial",
        "label": "Appeal SSDI Denial",
        "publicHref": "/appeal-mail/workflows/appeal-ssdi-denial",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-ssdi-denial"
      },
      {
        "slug": "appeal-ssi-denial",
        "label": "Appeal SSI Denial",
        "publicHref": "/appeal-mail/workflows/appeal-ssi-denial",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-ssi-denial"
      },
      {
        "slug": "appeal-timely-filing-denial",
        "label": "Appeal Timely Filing Denial",
        "publicHref": "/appeal-mail/workflows/appeal-timely-filing-denial",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-timely-filing-denial"
      },
      {
        "slug": "appeal-unemployment-denial",
        "label": "Appeal Unemployment Denial",
        "publicHref": "/appeal-mail/workflows/appeal-unemployment-denial",
        "workspaceHref": "/dashboard/workflows/appeal-mail/appeal-unemployment-denial"
      },
      {
        "slug": "dmv-suspension-revocation-appeal",
        "label": "DMV Suspension Revocation Appeal",
        "publicHref": "/appeal-mail/workflows/dmv-suspension-revocation-appeal",
        "workspaceHref": "/dashboard/workflows/appeal-mail/dmv-suspension-revocation-appeal"
      },
      {
        "slug": "fafsa-special-circumstances-appeal",
        "label": "Fafsa Special Circumstances Appeal",
        "publicHref": "/appeal-mail/workflows/fafsa-special-circumstances-appeal",
        "workspaceHref": "/dashboard/workflows/appeal-mail/fafsa-special-circumstances-appeal"
      },
      {
        "slug": "financial-aid-reinstatement",
        "label": "Financial Aid Reinstatement",
        "publicHref": "/appeal-mail/workflows/financial-aid-reinstatement",
        "workspaceHref": "/dashboard/workflows/appeal-mail/financial-aid-reinstatement"
      },
      {
        "slug": "financial-aid-suspension-appeal",
        "label": "Financial Aid Suspension Appeal",
        "publicHref": "/appeal-mail/workflows/financial-aid-suspension-appeal",
        "workspaceHref": "/dashboard/workflows/appeal-mail/financial-aid-suspension-appeal"
      },
      {
        "slug": "license-suspension-appeal",
        "label": "License Suspension Appeal",
        "publicHref": "/appeal-mail/workflows/license-suspension-appeal",
        "workspaceHref": "/dashboard/workflows/appeal-mail/license-suspension-appeal"
      },
      {
        "slug": "request-reconsideration",
        "label": "Request Reconsideration",
        "publicHref": "/appeal-mail/workflows/request-reconsideration",
        "workspaceHref": "/dashboard/workflows/appeal-mail/request-reconsideration"
      },
      {
        "slug": "respond-insurance-denial-letter",
        "label": "Respond Insurance Denial Letter",
        "publicHref": "/appeal-mail/workflows/respond-insurance-denial-letter",
        "workspaceHref": "/dashboard/workflows/appeal-mail/respond-insurance-denial-letter"
      },
      {
        "slug": "sap-appeal",
        "label": "SAP Appeal",
        "publicHref": "/appeal-mail/workflows/sap-appeal",
        "workspaceHref": "/dashboard/workflows/appeal-mail/sap-appeal"
      },
      {
        "slug": "scholarship-appeal",
        "label": "Scholarship Appeal",
        "publicHref": "/appeal-mail/workflows/scholarship-appeal",
        "workspaceHref": "/dashboard/workflows/appeal-mail/scholarship-appeal"
      }
    ]
  },
  {
    "id": "benefits-appeal",
    "label": "Benefits Appeal",
    "publicHref": "/benefits-appeal/workflows",
    "workspaceHref": "/dashboard/workflows/benefits-appeal",
    "workflows": [
      {
        "slug": "appeals-council-preparation",
        "label": "Appeals Council Preparation",
        "publicHref": "/benefits-appeal/workflows/appeals-council-preparation",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/appeals-council-preparation"
      },
      {
        "slug": "benefits-deadline-response",
        "label": "Benefits Deadline Response",
        "publicHref": "/benefits-appeal/workflows/benefits-deadline-response",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/benefits-deadline-response"
      },
      {
        "slug": "benefits-evidence-package",
        "label": "Benefits Evidence Package",
        "publicHref": "/benefits-appeal/workflows/benefits-evidence-package",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/benefits-evidence-package"
      },
      {
        "slug": "benefits-hearing-preparation",
        "label": "Benefits Hearing Preparation",
        "publicHref": "/benefits-appeal/workflows/benefits-hearing-preparation",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/benefits-hearing-preparation"
      },
      {
        "slug": "benefits-reconsideration",
        "label": "Benefits Reconsideration",
        "publicHref": "/benefits-appeal/workflows/benefits-reconsideration",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/benefits-reconsideration"
      },
      {
        "slug": "benefits-supporting-document-submission",
        "label": "Benefits Supporting Document Submission",
        "publicHref": "/benefits-appeal/workflows/benefits-supporting-document-submission",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/benefits-supporting-document-submission"
      },
      {
        "slug": "disability-claim-appeal",
        "label": "Disability Claim Appeal",
        "publicHref": "/benefits-appeal/workflows/disability-claim-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/disability-claim-appeal"
      },
      {
        "slug": "edd-appeal",
        "label": "Edd Appeal",
        "publicHref": "/benefits-appeal/workflows/edd-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/edd-appeal"
      },
      {
        "slug": "edd-disqualification-appeal",
        "label": "Edd Disqualification Appeal",
        "publicHref": "/benefits-appeal/workflows/edd-disqualification-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/edd-disqualification-appeal"
      },
      {
        "slug": "food-stamp-appeal",
        "label": "Food Stamp Appeal",
        "publicHref": "/benefits-appeal/workflows/food-stamp-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/food-stamp-appeal"
      },
      {
        "slug": "medicaid-appeal",
        "label": "Medicaid Appeal",
        "publicHref": "/benefits-appeal/workflows/medicaid-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/medicaid-appeal"
      },
      {
        "slug": "medicaid-denial-appeal",
        "label": "Medicaid Denial Appeal",
        "publicHref": "/benefits-appeal/workflows/medicaid-denial-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/medicaid-denial-appeal"
      },
      {
        "slug": "snap-appeal",
        "label": "Snap Appeal",
        "publicHref": "/benefits-appeal/workflows/snap-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/snap-appeal"
      },
      {
        "slug": "social-security-decision-appeal",
        "label": "Social Security Decision Appeal",
        "publicHref": "/benefits-appeal/workflows/social-security-decision-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/social-security-decision-appeal"
      },
      {
        "slug": "social-security-non-medical-appeal",
        "label": "Social Security Non Medical Appeal",
        "publicHref": "/benefits-appeal/workflows/social-security-non-medical-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/social-security-non-medical-appeal"
      },
      {
        "slug": "social-security-overpayment-appeal",
        "label": "Social Security Overpayment Appeal",
        "publicHref": "/benefits-appeal/workflows/social-security-overpayment-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/social-security-overpayment-appeal"
      },
      {
        "slug": "ssdi-appeal",
        "label": "SSDI Appeal",
        "publicHref": "/benefits-appeal/workflows/ssdi-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/ssdi-appeal"
      },
      {
        "slug": "ssdi-appeals-council",
        "label": "SSDI Appeals Council",
        "publicHref": "/benefits-appeal/workflows/ssdi-appeals-council",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/ssdi-appeals-council"
      },
      {
        "slug": "ssdi-denial-appeal",
        "label": "SSDI Denial Appeal",
        "publicHref": "/benefits-appeal/workflows/ssdi-denial-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/ssdi-denial-appeal"
      },
      {
        "slug": "ssdi-reconsideration",
        "label": "SSDI Reconsideration",
        "publicHref": "/benefits-appeal/workflows/ssdi-reconsideration",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/ssdi-reconsideration"
      },
      {
        "slug": "ssi-appeal",
        "label": "SSI Appeal",
        "publicHref": "/benefits-appeal/workflows/ssi-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/ssi-appeal"
      },
      {
        "slug": "ssi-denial-appeal",
        "label": "SSI Denial Appeal",
        "publicHref": "/benefits-appeal/workflows/ssi-denial-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/ssi-denial-appeal"
      },
      {
        "slug": "ssi-overpayment-appeal",
        "label": "SSI Overpayment Appeal",
        "publicHref": "/benefits-appeal/workflows/ssi-overpayment-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/ssi-overpayment-appeal"
      },
      {
        "slug": "ssi-reconsideration",
        "label": "SSI Reconsideration",
        "publicHref": "/benefits-appeal/workflows/ssi-reconsideration",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/ssi-reconsideration"
      },
      {
        "slug": "unemployment-appeal",
        "label": "Unemployment Appeal",
        "publicHref": "/benefits-appeal/workflows/unemployment-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/unemployment-appeal"
      },
      {
        "slug": "unemployment-denial-appeal",
        "label": "Unemployment Denial Appeal",
        "publicHref": "/benefits-appeal/workflows/unemployment-denial-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/unemployment-denial-appeal"
      },
      {
        "slug": "unemployment-disqualification-appeal",
        "label": "Unemployment Disqualification Appeal",
        "publicHref": "/benefits-appeal/workflows/unemployment-disqualification-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/unemployment-disqualification-appeal"
      },
      {
        "slug": "unemployment-overpayment-appeal",
        "label": "Unemployment Overpayment Appeal",
        "publicHref": "/benefits-appeal/workflows/unemployment-overpayment-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/unemployment-overpayment-appeal"
      },
      {
        "slug": "va-claim-appeal",
        "label": "VA Claim Appeal",
        "publicHref": "/benefits-appeal/workflows/va-claim-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/va-claim-appeal"
      },
      {
        "slug": "workers-compensation-appeal",
        "label": "Workers Compensation Appeal",
        "publicHref": "/benefits-appeal/workflows/workers-compensation-appeal",
        "workspaceHref": "/dashboard/workflows/benefits-appeal/workers-compensation-appeal"
      }
    ]
  },
  {
    "id": "claim-proof",
    "label": "Claim Proof",
    "publicHref": "/claim-proof/workflows",
    "workspaceHref": "/dashboard/workflows/claim-proof",
    "workflows": [
      {
        "slug": "accident-claim-package",
        "label": "Accident Claim Package",
        "publicHref": "/claim-proof/workflows/accident-claim-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/accident-claim-package"
      },
      {
        "slug": "auto-insurance-claim-package",
        "label": "Auto Insurance Claim Package",
        "publicHref": "/claim-proof/workflows/auto-insurance-claim-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/auto-insurance-claim-package"
      },
      {
        "slug": "claim-appeal-evidence-package",
        "label": "Claim Appeal Evidence Package",
        "publicHref": "/claim-proof/workflows/claim-appeal-evidence-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/claim-appeal-evidence-package"
      },
      {
        "slug": "claim-denial-evidence-package",
        "label": "Claim Denial Evidence Package",
        "publicHref": "/claim-proof/workflows/claim-denial-evidence-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/claim-denial-evidence-package"
      },
      {
        "slug": "claim-evidence-checklist",
        "label": "Claim Evidence Checklist",
        "publicHref": "/claim-proof/workflows/claim-evidence-checklist",
        "workspaceHref": "/dashboard/workflows/claim-proof/claim-evidence-checklist"
      },
      {
        "slug": "claim-follow-up-package",
        "label": "Claim Follow Up Package",
        "publicHref": "/claim-proof/workflows/claim-follow-up-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/claim-follow-up-package"
      },
      {
        "slug": "claim-proof-package",
        "label": "Claim Proof Package",
        "publicHref": "/claim-proof/workflows/claim-proof-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/claim-proof-package"
      },
      {
        "slug": "claim-reconsideration-package",
        "label": "Claim Reconsideration Package",
        "publicHref": "/claim-proof/workflows/claim-reconsideration-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/claim-reconsideration-package"
      },
      {
        "slug": "claim-record-proof-of-submission-package",
        "label": "Claim Record Proof Of Submission Package",
        "publicHref": "/claim-proof/workflows/claim-record-proof-of-submission-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/claim-record-proof-of-submission-package"
      },
      {
        "slug": "claim-supporting-documents",
        "label": "Claim Supporting Documents",
        "publicHref": "/claim-proof/workflows/claim-supporting-documents",
        "workspaceHref": "/dashboard/workflows/claim-proof/claim-supporting-documents"
      },
      {
        "slug": "claim-timeline-package",
        "label": "Claim Timeline Package",
        "publicHref": "/claim-proof/workflows/claim-timeline-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/claim-timeline-package"
      },
      {
        "slug": "dental-claim-package",
        "label": "Dental Claim Package",
        "publicHref": "/claim-proof/workflows/dental-claim-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/dental-claim-package"
      },
      {
        "slug": "disability-claim-evidence-package",
        "label": "Disability Claim Evidence Package",
        "publicHref": "/claim-proof/workflows/disability-claim-evidence-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/disability-claim-evidence-package"
      },
      {
        "slug": "health-insurance-claim-package",
        "label": "Health Insurance Claim Package",
        "publicHref": "/claim-proof/workflows/health-insurance-claim-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/health-insurance-claim-package"
      },
      {
        "slug": "home-insurance-claim-package",
        "label": "Home Insurance Claim Package",
        "publicHref": "/claim-proof/workflows/home-insurance-claim-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/home-insurance-claim-package"
      },
      {
        "slug": "hospital-indemnity-claim-package",
        "label": "Hospital Indemnity Claim Package",
        "publicHref": "/claim-proof/workflows/hospital-indemnity-claim-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/hospital-indemnity-claim-package"
      },
      {
        "slug": "insurance-claim-documentation",
        "label": "Insurance Claim Documentation",
        "publicHref": "/claim-proof/workflows/insurance-claim-documentation",
        "workspaceHref": "/dashboard/workflows/claim-proof/insurance-claim-documentation"
      },
      {
        "slug": "life-insurance-claim-package",
        "label": "Life Insurance Claim Package",
        "publicHref": "/claim-proof/workflows/life-insurance-claim-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/life-insurance-claim-package"
      },
      {
        "slug": "long-term-disability-claim-package",
        "label": "Long Term Disability Claim Package",
        "publicHref": "/claim-proof/workflows/long-term-disability-claim-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/long-term-disability-claim-package"
      },
      {
        "slug": "medical-insurance-claim-package",
        "label": "Medical Insurance Claim Package",
        "publicHref": "/claim-proof/workflows/medical-insurance-claim-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/medical-insurance-claim-package"
      },
      {
        "slug": "medical-necessity-evidence-package",
        "label": "Medical Necessity Evidence Package",
        "publicHref": "/claim-proof/workflows/medical-necessity-evidence-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/medical-necessity-evidence-package"
      },
      {
        "slug": "medicare-claim-package",
        "label": "Medicare Claim Package",
        "publicHref": "/claim-proof/workflows/medicare-claim-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/medicare-claim-package"
      },
      {
        "slug": "out-of-network-evidence-package",
        "label": "Out Of Network Evidence Package",
        "publicHref": "/claim-proof/workflows/out-of-network-evidence-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/out-of-network-evidence-package"
      },
      {
        "slug": "prior-authorization-evidence-package",
        "label": "Prior Authorization Evidence Package",
        "publicHref": "/claim-proof/workflows/prior-authorization-evidence-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/prior-authorization-evidence-package"
      },
      {
        "slug": "property-damage-claim-package",
        "label": "Property Damage Claim Package",
        "publicHref": "/claim-proof/workflows/property-damage-claim-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/property-damage-claim-package"
      },
      {
        "slug": "provider-claim-submission-package",
        "label": "Provider Claim Submission Package",
        "publicHref": "/claim-proof/workflows/provider-claim-submission-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/provider-claim-submission-package"
      },
      {
        "slug": "reimbursement-claim-package",
        "label": "Reimbursement Claim Package",
        "publicHref": "/claim-proof/workflows/reimbursement-claim-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/reimbursement-claim-package"
      },
      {
        "slug": "short-term-disability-claim-package",
        "label": "Short Term Disability Claim Package",
        "publicHref": "/claim-proof/workflows/short-term-disability-claim-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/short-term-disability-claim-package"
      },
      {
        "slug": "travel-claim-package",
        "label": "Travel Claim Package",
        "publicHref": "/claim-proof/workflows/travel-claim-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/travel-claim-package"
      },
      {
        "slug": "vision-claim-package",
        "label": "Vision Claim Package",
        "publicHref": "/claim-proof/workflows/vision-claim-package",
        "workspaceHref": "/dashboard/workflows/claim-proof/vision-claim-package"
      }
    ]
  },
  {
    "id": "code-enforcement",
    "label": "Code Enforcement",
    "publicHref": "/code-enforcement/workflows",
    "workspaceHref": "/dashboard/workflows/code-enforcement",
    "workflows": [
      {
        "slug": "abatement-order-response",
        "label": "Abatement Order Response",
        "publicHref": "/code-enforcement/workflows/abatement-order-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/abatement-order-response"
      },
      {
        "slug": "administrative-hearing-response",
        "label": "Administrative Hearing Response",
        "publicHref": "/code-enforcement/workflows/administrative-hearing-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/administrative-hearing-response"
      },
      {
        "slug": "building-code-violation-response",
        "label": "Building Code Violation Response",
        "publicHref": "/code-enforcement/workflows/building-code-violation-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/building-code-violation-response"
      },
      {
        "slug": "cease-and-desist-response",
        "label": "Cease And Desist Response",
        "publicHref": "/code-enforcement/workflows/cease-and-desist-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/cease-and-desist-response"
      },
      {
        "slug": "code-enforcement-appeal",
        "label": "Code Enforcement Appeal",
        "publicHref": "/code-enforcement/workflows/code-enforcement-appeal",
        "workspaceHref": "/dashboard/workflows/code-enforcement/code-enforcement-appeal"
      },
      {
        "slug": "code-enforcement-case-file-package",
        "label": "Code Enforcement Case File Package",
        "publicHref": "/code-enforcement/workflows/code-enforcement-case-file-package",
        "workspaceHref": "/dashboard/workflows/code-enforcement/code-enforcement-case-file-package"
      },
      {
        "slug": "code-enforcement-evidence-submission",
        "label": "Code Enforcement Evidence Submission",
        "publicHref": "/code-enforcement/workflows/code-enforcement-evidence-submission",
        "workspaceHref": "/dashboard/workflows/code-enforcement/code-enforcement-evidence-submission"
      },
      {
        "slug": "code-enforcement-notice-response",
        "label": "Code Enforcement Notice Response",
        "publicHref": "/code-enforcement/workflows/code-enforcement-notice-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/code-enforcement-notice-response"
      },
      {
        "slug": "code-enforcement-records-request",
        "label": "Code Enforcement Records Request",
        "publicHref": "/code-enforcement/workflows/code-enforcement-records-request",
        "workspaceHref": "/dashboard/workflows/code-enforcement/code-enforcement-records-request"
      },
      {
        "slug": "code-violation-notice-response",
        "label": "Code Violation Notice Response",
        "publicHref": "/code-enforcement/workflows/code-violation-notice-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/code-violation-notice-response"
      },
      {
        "slug": "complaint-records-request",
        "label": "Complaint Records Request",
        "publicHref": "/code-enforcement/workflows/complaint-records-request",
        "workspaceHref": "/dashboard/workflows/code-enforcement/complaint-records-request"
      },
      {
        "slug": "compliance-order-response",
        "label": "Compliance Order Response",
        "publicHref": "/code-enforcement/workflows/compliance-order-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/compliance-order-response"
      },
      {
        "slug": "compliance-plan-response",
        "label": "Compliance Plan Response",
        "publicHref": "/code-enforcement/workflows/compliance-plan-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/compliance-plan-response"
      },
      {
        "slug": "correction-notice-response",
        "label": "Correction Notice Response",
        "publicHref": "/code-enforcement/workflows/correction-notice-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/correction-notice-response"
      },
      {
        "slug": "deadline-extension-request",
        "label": "Deadline Extension Request",
        "publicHref": "/code-enforcement/workflows/deadline-extension-request",
        "workspaceHref": "/dashboard/workflows/code-enforcement/deadline-extension-request"
      },
      {
        "slug": "follow-up-after-compliance-submission",
        "label": "Follow Up After Compliance Submission",
        "publicHref": "/code-enforcement/workflows/follow-up-after-compliance-submission",
        "workspaceHref": "/dashboard/workflows/code-enforcement/follow-up-after-compliance-submission"
      },
      {
        "slug": "inspection-access-response",
        "label": "Inspection Access Response",
        "publicHref": "/code-enforcement/workflows/inspection-access-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/inspection-access-response"
      },
      {
        "slug": "inspection-notice-response",
        "label": "Inspection Notice Response",
        "publicHref": "/code-enforcement/workflows/inspection-notice-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/inspection-notice-response"
      },
      {
        "slug": "inspection-records-request",
        "label": "Inspection Records Request",
        "publicHref": "/code-enforcement/workflows/inspection-records-request",
        "workspaceHref": "/dashboard/workflows/code-enforcement/inspection-records-request"
      },
      {
        "slug": "inspection-warrant-response",
        "label": "Inspection Warrant Response",
        "publicHref": "/code-enforcement/workflows/inspection-warrant-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/inspection-warrant-response"
      },
      {
        "slug": "junk-vehicle-violation-response",
        "label": "Junk Vehicle Violation Response",
        "publicHref": "/code-enforcement/workflows/junk-vehicle-violation-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/junk-vehicle-violation-response"
      },
      {
        "slug": "land-use-violation-response",
        "label": "Land Use Violation Response",
        "publicHref": "/code-enforcement/workflows/land-use-violation-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/land-use-violation-response"
      },
      {
        "slug": "notice-of-violation-response",
        "label": "Notice Of Violation Response",
        "publicHref": "/code-enforcement/workflows/notice-of-violation-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/notice-of-violation-response"
      },
      {
        "slug": "nuisance-violation-response",
        "label": "Nuisance Violation Response",
        "publicHref": "/code-enforcement/workflows/nuisance-violation-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/nuisance-violation-response"
      },
      {
        "slug": "property-maintenance-violation-response",
        "label": "Property Maintenance Violation Response",
        "publicHref": "/code-enforcement/workflows/property-maintenance-violation-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/property-maintenance-violation-response"
      },
      {
        "slug": "request-to-correct-inspection-record",
        "label": "Request To Correct Inspection Record",
        "publicHref": "/code-enforcement/workflows/request-to-correct-inspection-record",
        "workspaceHref": "/dashboard/workflows/code-enforcement/request-to-correct-inspection-record"
      },
      {
        "slug": "request-to-search-property-response",
        "label": "Request To Search Property Response",
        "publicHref": "/code-enforcement/workflows/request-to-search-property-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/request-to-search-property-response"
      },
      {
        "slug": "solid-waste-violation-response",
        "label": "Solid Waste Violation Response",
        "publicHref": "/code-enforcement/workflows/solid-waste-violation-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/solid-waste-violation-response"
      },
      {
        "slug": "unpermitted-structure-response",
        "label": "Unpermitted Structure Response",
        "publicHref": "/code-enforcement/workflows/unpermitted-structure-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/unpermitted-structure-response"
      },
      {
        "slug": "zoning-violation-response",
        "label": "Zoning Violation Response",
        "publicHref": "/code-enforcement/workflows/zoning-violation-response",
        "workspaceHref": "/dashboard/workflows/code-enforcement/zoning-violation-response"
      }
    ]
  },
  {
    "id": "dispute-mail",
    "label": "Dispute Mail",
    "publicHref": "/dispute-mail/workflows",
    "workspaceHref": "/dashboard/workflows/dispute-mail",
    "workflows": [
      {
        "slug": "billing-error-dispute",
        "label": "Billing Error Dispute",
        "publicHref": "/dispute-mail/workflows/billing-error-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/billing-error-dispute"
      },
      {
        "slug": "cease-contact-request",
        "label": "Cease Contact Request",
        "publicHref": "/dispute-mail/workflows/cease-contact-request",
        "workspaceHref": "/dashboard/workflows/dispute-mail/cease-contact-request"
      },
      {
        "slug": "charge-off-dispute",
        "label": "Charge Off Dispute",
        "publicHref": "/dispute-mail/workflows/charge-off-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/charge-off-dispute"
      },
      {
        "slug": "consumer-evidence-package",
        "label": "Consumer Evidence Package",
        "publicHref": "/dispute-mail/workflows/consumer-evidence-package",
        "workspaceHref": "/dashboard/workflows/dispute-mail/consumer-evidence-package"
      },
      {
        "slug": "credit-bureau-dispute-package",
        "label": "Credit Bureau Dispute Package",
        "publicHref": "/dispute-mail/workflows/credit-bureau-dispute-package",
        "workspaceHref": "/dashboard/workflows/dispute-mail/credit-bureau-dispute-package"
      },
      {
        "slug": "credit-card-billing-dispute",
        "label": "Credit Card Billing Dispute",
        "publicHref": "/dispute-mail/workflows/credit-card-billing-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/credit-card-billing-dispute"
      },
      {
        "slug": "credit-report-collections-dispute",
        "label": "Credit Report Collections Dispute",
        "publicHref": "/dispute-mail/workflows/credit-report-collections-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/credit-report-collections-dispute"
      },
      {
        "slug": "credit-report-error-dispute",
        "label": "Credit Report Error Dispute",
        "publicHref": "/dispute-mail/workflows/credit-report-error-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/credit-report-error-dispute"
      },
      {
        "slug": "debt-collection-dispute",
        "label": "Debt Collection Dispute",
        "publicHref": "/dispute-mail/workflows/debt-collection-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/debt-collection-dispute"
      },
      {
        "slug": "debt-communication-documentation",
        "label": "Debt Communication Documentation",
        "publicHref": "/dispute-mail/workflows/debt-communication-documentation",
        "workspaceHref": "/dashboard/workflows/dispute-mail/debt-communication-documentation"
      },
      {
        "slug": "debt-dispute",
        "label": "Debt Dispute",
        "publicHref": "/dispute-mail/workflows/debt-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/debt-dispute"
      },
      {
        "slug": "debt-validation",
        "label": "Debt Validation",
        "publicHref": "/dispute-mail/workflows/debt-validation",
        "workspaceHref": "/dashboard/workflows/dispute-mail/debt-validation"
      },
      {
        "slug": "dispute-collection-account",
        "label": "Dispute Collection Account",
        "publicHref": "/dispute-mail/workflows/dispute-collection-account",
        "workspaceHref": "/dashboard/workflows/dispute-mail/dispute-collection-account"
      },
      {
        "slug": "dispute-collection-agency",
        "label": "Dispute Collection Agency",
        "publicHref": "/dispute-mail/workflows/dispute-collection-agency",
        "workspaceHref": "/dashboard/workflows/dispute-mail/dispute-collection-agency"
      },
      {
        "slug": "dispute-collections-on-credit-report",
        "label": "Dispute Collections On Credit Report",
        "publicHref": "/dispute-mail/workflows/dispute-collections-on-credit-report",
        "workspaceHref": "/dashboard/workflows/dispute-mail/dispute-collections-on-credit-report"
      },
      {
        "slug": "dispute-with-collection-agency",
        "label": "Dispute With Collection Agency",
        "publicHref": "/dispute-mail/workflows/dispute-with-collection-agency",
        "workspaceHref": "/dashboard/workflows/dispute-mail/dispute-with-collection-agency"
      },
      {
        "slug": "dispute-with-creditor",
        "label": "Dispute With Creditor",
        "publicHref": "/dispute-mail/workflows/dispute-with-creditor",
        "workspaceHref": "/dashboard/workflows/dispute-mail/dispute-with-creditor"
      },
      {
        "slug": "dispute-with-debt-buyer",
        "label": "Dispute With Debt Buyer",
        "publicHref": "/dispute-mail/workflows/dispute-with-debt-buyer",
        "workspaceHref": "/dashboard/workflows/dispute-mail/dispute-with-debt-buyer"
      },
      {
        "slug": "escalate-unresolved-dispute",
        "label": "Escalate Unresolved Dispute",
        "publicHref": "/dispute-mail/workflows/escalate-unresolved-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/escalate-unresolved-dispute"
      },
      {
        "slug": "fdcpa-dispute",
        "label": "FDCPA Dispute",
        "publicHref": "/dispute-mail/workflows/fdcpa-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/fdcpa-dispute"
      },
      {
        "slug": "follow-up-on-unanswered-dispute",
        "label": "Follow Up On Unanswered Dispute",
        "publicHref": "/dispute-mail/workflows/follow-up-on-unanswered-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/follow-up-on-unanswered-dispute"
      },
      {
        "slug": "hard-inquiry-dispute",
        "label": "Hard Inquiry Dispute",
        "publicHref": "/dispute-mail/workflows/hard-inquiry-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/hard-inquiry-dispute"
      },
      {
        "slug": "insurance-billing-dispute",
        "label": "Insurance Billing Dispute",
        "publicHref": "/dispute-mail/workflows/insurance-billing-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/insurance-billing-dispute"
      },
      {
        "slug": "insurance-payment-dispute",
        "label": "Insurance Payment Dispute",
        "publicHref": "/dispute-mail/workflows/insurance-payment-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/insurance-payment-dispute"
      },
      {
        "slug": "medical-collections-dispute",
        "label": "Medical Collections Dispute",
        "publicHref": "/dispute-mail/workflows/medical-collections-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/medical-collections-dispute"
      },
      {
        "slug": "medical-debt-dispute",
        "label": "Medical Debt Dispute",
        "publicHref": "/dispute-mail/workflows/medical-debt-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/medical-debt-dispute"
      },
      {
        "slug": "service-contract-dispute",
        "label": "Service Contract Dispute",
        "publicHref": "/dispute-mail/workflows/service-contract-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/service-contract-dispute"
      },
      {
        "slug": "student-loan-account-dispute",
        "label": "Student Loan Account Dispute",
        "publicHref": "/dispute-mail/workflows/student-loan-account-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/student-loan-account-dispute"
      },
      {
        "slug": "subscription-charge-dispute",
        "label": "Subscription Charge Dispute",
        "publicHref": "/dispute-mail/workflows/subscription-charge-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/subscription-charge-dispute"
      },
      {
        "slug": "unauthorized-charge-dispute",
        "label": "Unauthorized Charge Dispute",
        "publicHref": "/dispute-mail/workflows/unauthorized-charge-dispute",
        "workspaceHref": "/dashboard/workflows/dispute-mail/unauthorized-charge-dispute"
      }
    ]
  },
  {
    "id": "immigration-mail",
    "label": "Immigration Mail",
    "publicHref": "/immigration-mail/workflows",
    "workspaceHref": "/dashboard/workflows/immigration-mail",
    "workflows": [
      {
        "slug": "biometrics-appointment-correspondence",
        "label": "Biometrics Appointment Correspondence",
        "publicHref": "/immigration-mail/workflows/biometrics-appointment-correspondence",
        "workspaceHref": "/dashboard/workflows/immigration-mail/biometrics-appointment-correspondence"
      },
      {
        "slug": "case-evidence-package",
        "label": "Case Evidence Package",
        "publicHref": "/immigration-mail/workflows/case-evidence-package",
        "workspaceHref": "/dashboard/workflows/immigration-mail/case-evidence-package"
      },
      {
        "slug": "eb-1-rfe-response",
        "label": "Eb 1 RFE Response",
        "publicHref": "/immigration-mail/workflows/eb-1-rfe-response",
        "workspaceHref": "/dashboard/workflows/immigration-mail/eb-1-rfe-response"
      },
      {
        "slug": "h-1b-rfe-response",
        "label": "H 1b RFE Response",
        "publicHref": "/immigration-mail/workflows/h-1b-rfe-response",
        "workspaceHref": "/dashboard/workflows/immigration-mail/h-1b-rfe-response"
      },
      {
        "slug": "i-140-rfe-response",
        "label": "I 140 RFE Response",
        "publicHref": "/immigration-mail/workflows/i-140-rfe-response",
        "workspaceHref": "/dashboard/workflows/immigration-mail/i-140-rfe-response"
      },
      {
        "slug": "i-485-rfe-response",
        "label": "I 485 RFE Response",
        "publicHref": "/immigration-mail/workflows/i-485-rfe-response",
        "workspaceHref": "/dashboard/workflows/immigration-mail/i-485-rfe-response"
      },
      {
        "slug": "immigration-affidavit-package",
        "label": "Immigration Affidavit Package",
        "publicHref": "/immigration-mail/workflows/immigration-affidavit-package",
        "workspaceHref": "/dashboard/workflows/immigration-mail/immigration-affidavit-package"
      },
      {
        "slug": "immigration-deadline-response",
        "label": "Immigration Deadline Response",
        "publicHref": "/immigration-mail/workflows/immigration-deadline-response",
        "workspaceHref": "/dashboard/workflows/immigration-mail/immigration-deadline-response"
      },
      {
        "slug": "immigration-filing-cover-letter",
        "label": "Immigration Filing Cover Letter",
        "publicHref": "/immigration-mail/workflows/immigration-filing-cover-letter",
        "workspaceHref": "/dashboard/workflows/immigration-mail/immigration-filing-cover-letter"
      },
      {
        "slug": "immigration-mailing-proof-package",
        "label": "Immigration Mailing Proof Package",
        "publicHref": "/immigration-mail/workflows/immigration-mailing-proof-package",
        "workspaceHref": "/dashboard/workflows/immigration-mail/immigration-mailing-proof-package"
      },
      {
        "slug": "l-1-rfe-response",
        "label": "L 1 RFE Response",
        "publicHref": "/immigration-mail/workflows/l-1-rfe-response",
        "workspaceHref": "/dashboard/workflows/immigration-mail/l-1-rfe-response"
      },
      {
        "slug": "medical-rfe-response",
        "label": "Medical RFE Response",
        "publicHref": "/immigration-mail/workflows/medical-rfe-response",
        "workspaceHref": "/dashboard/workflows/immigration-mail/medical-rfe-response"
      },
      {
        "slug": "n-400-rfe-response",
        "label": "N 400 RFE Response",
        "publicHref": "/immigration-mail/workflows/n-400-rfe-response",
        "workspaceHref": "/dashboard/workflows/immigration-mail/n-400-rfe-response"
      },
      {
        "slug": "niw-rfe-response",
        "label": "NIW RFE Response",
        "publicHref": "/immigration-mail/workflows/niw-rfe-response",
        "workspaceHref": "/dashboard/workflows/immigration-mail/niw-rfe-response"
      },
      {
        "slug": "notice-of-intent-to-deny-response",
        "label": "Notice Of Intent To Deny Response",
        "publicHref": "/immigration-mail/workflows/notice-of-intent-to-deny-response",
        "workspaceHref": "/dashboard/workflows/immigration-mail/notice-of-intent-to-deny-response"
      },
      {
        "slug": "notice-of-intent-to-revoke-response",
        "label": "Notice Of Intent To Revoke Response",
        "publicHref": "/immigration-mail/workflows/notice-of-intent-to-revoke-response",
        "workspaceHref": "/dashboard/workflows/immigration-mail/notice-of-intent-to-revoke-response"
      },
      {
        "slug": "request-for-evidence-response",
        "label": "Request For Evidence Response",
        "publicHref": "/immigration-mail/workflows/request-for-evidence-response",
        "workspaceHref": "/dashboard/workflows/immigration-mail/request-for-evidence-response"
      },
      {
        "slug": "request-for-reconsideration",
        "label": "Request For Reconsideration",
        "publicHref": "/immigration-mail/workflows/request-for-reconsideration",
        "workspaceHref": "/dashboard/workflows/immigration-mail/request-for-reconsideration"
      },
      {
        "slug": "respond-immigration-notice",
        "label": "Respond Immigration Notice",
        "publicHref": "/immigration-mail/workflows/respond-immigration-notice",
        "workspaceHref": "/dashboard/workflows/immigration-mail/respond-immigration-notice"
      },
      {
        "slug": "rfe-cover-letter",
        "label": "RFE Cover Letter",
        "publicHref": "/immigration-mail/workflows/rfe-cover-letter",
        "workspaceHref": "/dashboard/workflows/immigration-mail/rfe-cover-letter"
      },
      {
        "slug": "rfe-response-letter",
        "label": "RFE Response Letter",
        "publicHref": "/immigration-mail/workflows/rfe-response-letter",
        "workspaceHref": "/dashboard/workflows/immigration-mail/rfe-response-letter"
      },
      {
        "slug": "submit-supporting-documents-to-uscis",
        "label": "Submit Supporting Documents To USCIS",
        "publicHref": "/immigration-mail/workflows/submit-supporting-documents-to-uscis",
        "workspaceHref": "/dashboard/workflows/immigration-mail/submit-supporting-documents-to-uscis"
      },
      {
        "slug": "supplemental-evidence-submission",
        "label": "Supplemental Evidence Submission",
        "publicHref": "/immigration-mail/workflows/supplemental-evidence-submission",
        "workspaceHref": "/dashboard/workflows/immigration-mail/supplemental-evidence-submission"
      },
      {
        "slug": "translation-certified-translation-package",
        "label": "Translation Certified Translation Package",
        "publicHref": "/immigration-mail/workflows/translation-certified-translation-package",
        "workspaceHref": "/dashboard/workflows/immigration-mail/translation-certified-translation-package"
      },
      {
        "slug": "uscis-evidence-submission",
        "label": "USCIS Evidence Submission",
        "publicHref": "/immigration-mail/workflows/uscis-evidence-submission",
        "workspaceHref": "/dashboard/workflows/immigration-mail/uscis-evidence-submission"
      },
      {
        "slug": "uscis-explanation-letter",
        "label": "USCIS Explanation Letter",
        "publicHref": "/immigration-mail/workflows/uscis-explanation-letter",
        "workspaceHref": "/dashboard/workflows/immigration-mail/uscis-explanation-letter"
      },
      {
        "slug": "uscis-follow-up-after-submission",
        "label": "USCIS Follow Up After Submission",
        "publicHref": "/immigration-mail/workflows/uscis-follow-up-after-submission",
        "workspaceHref": "/dashboard/workflows/immigration-mail/uscis-follow-up-after-submission"
      },
      {
        "slug": "uscis-missing-evidence-response",
        "label": "USCIS Missing Evidence Response",
        "publicHref": "/immigration-mail/workflows/uscis-missing-evidence-response",
        "workspaceHref": "/dashboard/workflows/immigration-mail/uscis-missing-evidence-response"
      },
      {
        "slug": "uscis-notice-of-intent-response",
        "label": "USCIS Notice Of Intent Response",
        "publicHref": "/immigration-mail/workflows/uscis-notice-of-intent-response",
        "workspaceHref": "/dashboard/workflows/immigration-mail/uscis-notice-of-intent-response"
      },
      {
        "slug": "uscis-rfe-response",
        "label": "USCIS RFE Response",
        "publicHref": "/immigration-mail/workflows/uscis-rfe-response",
        "workspaceHref": "/dashboard/workflows/immigration-mail/uscis-rfe-response"
      }
    ]
  },
  {
    "id": "insurance-claims",
    "label": "Insurance Claims",
    "publicHref": "/insurance-claims/workflows",
    "workspaceHref": "/dashboard/workflows/insurance-claims",
    "workflows": [
      {
        "slug": "auto-insurance-claim",
        "label": "Auto Insurance Claim",
        "publicHref": "/insurance-claims/workflows/auto-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/auto-insurance-claim"
      },
      {
        "slug": "business-interruption-claim",
        "label": "Business Interruption Claim",
        "publicHref": "/insurance-claims/workflows/business-interruption-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/business-interruption-claim"
      },
      {
        "slug": "claim-documentation-package",
        "label": "Claim Documentation Package",
        "publicHref": "/insurance-claims/workflows/claim-documentation-package",
        "workspaceHref": "/dashboard/workflows/insurance-claims/claim-documentation-package"
      },
      {
        "slug": "commercial-property-claim",
        "label": "Commercial Property Claim",
        "publicHref": "/insurance-claims/workflows/commercial-property-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/commercial-property-claim"
      },
      {
        "slug": "coverage-denial",
        "label": "Coverage Denial",
        "publicHref": "/insurance-claims/workflows/coverage-denial",
        "workspaceHref": "/dashboard/workflows/insurance-claims/coverage-denial"
      },
      {
        "slug": "denied-auto-insurance-claim",
        "label": "Denied Auto Insurance Claim",
        "publicHref": "/insurance-claims/workflows/denied-auto-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/denied-auto-insurance-claim"
      },
      {
        "slug": "denied-insurance-claim",
        "label": "Denied Insurance Claim",
        "publicHref": "/insurance-claims/workflows/denied-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/denied-insurance-claim"
      },
      {
        "slug": "denied-life-insurance-claim",
        "label": "Denied Life Insurance Claim",
        "publicHref": "/insurance-claims/workflows/denied-life-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/denied-life-insurance-claim"
      },
      {
        "slug": "disability-insurance-claim",
        "label": "Disability Insurance Claim",
        "publicHref": "/insurance-claims/workflows/disability-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/disability-insurance-claim"
      },
      {
        "slug": "disability-insurance-denial",
        "label": "Disability Insurance Denial",
        "publicHref": "/insurance-claims/workflows/disability-insurance-denial",
        "workspaceHref": "/dashboard/workflows/insurance-claims/disability-insurance-denial"
      },
      {
        "slug": "dispute-insurance-claim",
        "label": "Dispute Insurance Claim",
        "publicHref": "/insurance-claims/workflows/dispute-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/dispute-insurance-claim"
      },
      {
        "slug": "fire-smoke-damage-claim",
        "label": "Fire Smoke Damage Claim",
        "publicHref": "/insurance-claims/workflows/fire-smoke-damage-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/fire-smoke-damage-claim"
      },
      {
        "slug": "flood-damage-insurance-claim",
        "label": "Flood Damage Insurance Claim",
        "publicHref": "/insurance-claims/workflows/flood-damage-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/flood-damage-insurance-claim"
      },
      {
        "slug": "hail-damage-insurance-claim",
        "label": "Hail Damage Insurance Claim",
        "publicHref": "/insurance-claims/workflows/hail-damage-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/hail-damage-insurance-claim"
      },
      {
        "slug": "health-insurance-claim",
        "label": "Health Insurance Claim",
        "publicHref": "/insurance-claims/workflows/health-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/health-insurance-claim"
      },
      {
        "slug": "homeowners-insurance-claim",
        "label": "Homeowners Insurance Claim",
        "publicHref": "/insurance-claims/workflows/homeowners-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/homeowners-insurance-claim"
      },
      {
        "slug": "insurance-claim-appeal",
        "label": "Insurance Claim Appeal",
        "publicHref": "/insurance-claims/workflows/insurance-claim-appeal",
        "workspaceHref": "/dashboard/workflows/insurance-claims/insurance-claim-appeal"
      },
      {
        "slug": "insurance-claim-evidence-package",
        "label": "Insurance Claim Evidence Package",
        "publicHref": "/insurance-claims/workflows/insurance-claim-evidence-package",
        "workspaceHref": "/dashboard/workflows/insurance-claims/insurance-claim-evidence-package"
      },
      {
        "slug": "insurance-claim-follow-up",
        "label": "Insurance Claim Follow Up",
        "publicHref": "/insurance-claims/workflows/insurance-claim-follow-up",
        "workspaceHref": "/dashboard/workflows/insurance-claims/insurance-claim-follow-up"
      },
      {
        "slug": "life-insurance-claim",
        "label": "Life Insurance Claim",
        "publicHref": "/insurance-claims/workflows/life-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/life-insurance-claim"
      },
      {
        "slug": "long-term-disability-claim",
        "label": "Long Term Disability Claim",
        "publicHref": "/insurance-claims/workflows/long-term-disability-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/long-term-disability-claim"
      },
      {
        "slug": "medical-insurance-denial",
        "label": "Medical Insurance Denial",
        "publicHref": "/insurance-claims/workflows/medical-insurance-denial",
        "workspaceHref": "/dashboard/workflows/insurance-claims/medical-insurance-denial"
      },
      {
        "slug": "prepare-insurance-claim",
        "label": "Prepare Insurance Claim",
        "publicHref": "/insurance-claims/workflows/prepare-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/prepare-insurance-claim"
      },
      {
        "slug": "property-damage-insurance-claim",
        "label": "Property Damage Insurance Claim",
        "publicHref": "/insurance-claims/workflows/property-damage-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/property-damage-insurance-claim"
      },
      {
        "slug": "roof-damage-insurance-claim",
        "label": "Roof Damage Insurance Claim",
        "publicHref": "/insurance-claims/workflows/roof-damage-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/roof-damage-insurance-claim"
      },
      {
        "slug": "short-term-disability-claim",
        "label": "Short Term Disability Claim",
        "publicHref": "/insurance-claims/workflows/short-term-disability-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/short-term-disability-claim"
      },
      {
        "slug": "storm-damage-insurance-claim",
        "label": "Storm Damage Insurance Claim",
        "publicHref": "/insurance-claims/workflows/storm-damage-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/storm-damage-insurance-claim"
      },
      {
        "slug": "theft-vandalism-claim",
        "label": "Theft Vandalism Claim",
        "publicHref": "/insurance-claims/workflows/theft-vandalism-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/theft-vandalism-claim"
      },
      {
        "slug": "underpaid-insurance-claim",
        "label": "Underpaid Insurance Claim",
        "publicHref": "/insurance-claims/workflows/underpaid-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/underpaid-insurance-claim"
      },
      {
        "slug": "water-damage-insurance-claim",
        "label": "Water Damage Insurance Claim",
        "publicHref": "/insurance-claims/workflows/water-damage-insurance-claim",
        "workspaceHref": "/dashboard/workflows/insurance-claims/water-damage-insurance-claim"
      }
    ]
  },
  {
    "id": "legal-defense",
    "label": "Legal Defense",
    "publicHref": "/legal-defense/workflows",
    "workspaceHref": "/dashboard/workflows/legal-defense",
    "workflows": [
      {
        "slug": "arrest-timeline-reconstruction",
        "label": "Arrest Timeline Reconstruction",
        "publicHref": "/legal-defense/workflows/arrest-timeline-reconstruction",
        "workspaceHref": "/dashboard/workflows/legal-defense/arrest-timeline-reconstruction"
      },
      {
        "slug": "attorney-case-brief",
        "label": "Attorney Case Brief",
        "publicHref": "/legal-defense/workflows/attorney-case-brief",
        "workspaceHref": "/dashboard/workflows/legal-defense/attorney-case-brief"
      },
      {
        "slug": "body-camera-evidence-review",
        "label": "Body Camera Evidence Review",
        "publicHref": "/legal-defense/workflows/body-camera-evidence-review",
        "workspaceHref": "/dashboard/workflows/legal-defense/body-camera-evidence-review"
      },
      {
        "slug": "charging-document-analysis",
        "label": "Charging Document Analysis",
        "publicHref": "/legal-defense/workflows/charging-document-analysis",
        "workspaceHref": "/dashboard/workflows/legal-defense/charging-document-analysis"
      },
      {
        "slug": "consent-search-dispute",
        "label": "Consent Search Dispute",
        "publicHref": "/legal-defense/workflows/consent-search-dispute",
        "workspaceHref": "/dashboard/workflows/legal-defense/consent-search-dispute"
      },
      {
        "slug": "court-records-request",
        "label": "Court Records Request",
        "publicHref": "/legal-defense/workflows/court-records-request",
        "workspaceHref": "/dashboard/workflows/legal-defense/court-records-request"
      },
      {
        "slug": "criminal-case-timeline",
        "label": "Criminal Case Timeline",
        "publicHref": "/legal-defense/workflows/criminal-case-timeline",
        "workspaceHref": "/dashboard/workflows/legal-defense/criminal-case-timeline"
      },
      {
        "slug": "dash-camera-evidence-review",
        "label": "Dash Camera Evidence Review",
        "publicHref": "/legal-defense/workflows/dash-camera-evidence-review",
        "workspaceHref": "/dashboard/workflows/legal-defense/dash-camera-evidence-review"
      },
      {
        "slug": "defense-evidence-package",
        "label": "Defense Evidence Package",
        "publicHref": "/legal-defense/workflows/defense-evidence-package",
        "workspaceHref": "/dashboard/workflows/legal-defense/defense-evidence-package"
      },
      {
        "slug": "defense-intelligence-packet",
        "label": "Defense Intelligence Packet",
        "publicHref": "/legal-defense/workflows/defense-intelligence-packet",
        "workspaceHref": "/dashboard/workflows/legal-defense/defense-intelligence-packet"
      },
      {
        "slug": "discovery-deficiency-follow-up",
        "label": "Discovery Deficiency Follow Up",
        "publicHref": "/legal-defense/workflows/discovery-deficiency-follow-up",
        "workspaceHref": "/dashboard/workflows/legal-defense/discovery-deficiency-follow-up"
      },
      {
        "slug": "discovery-request-package",
        "label": "Discovery Request Package",
        "publicHref": "/legal-defense/workflows/discovery-request-package",
        "workspaceHref": "/dashboard/workflows/legal-defense/discovery-request-package"
      },
      {
        "slug": "dispatch-911-records-review",
        "label": "Dispatch 911 Records Review",
        "publicHref": "/legal-defense/workflows/dispatch-911-records-review",
        "workspaceHref": "/dashboard/workflows/legal-defense/dispatch-911-records-review"
      },
      {
        "slug": "evidence-chain-of-custody-review",
        "label": "Evidence Chain Of Custody Review",
        "publicHref": "/legal-defense/workflows/evidence-chain-of-custody-review",
        "workspaceHref": "/dashboard/workflows/legal-defense/evidence-chain-of-custody-review"
      },
      {
        "slug": "exculpatory-evidence-tracker",
        "label": "Exculpatory Evidence Tracker",
        "publicHref": "/legal-defense/workflows/exculpatory-evidence-tracker",
        "workspaceHref": "/dashboard/workflows/legal-defense/exculpatory-evidence-tracker"
      },
      {
        "slug": "expert-evidence-organizer",
        "label": "Expert Evidence Organizer",
        "publicHref": "/legal-defense/workflows/expert-evidence-organizer",
        "workspaceHref": "/dashboard/workflows/legal-defense/expert-evidence-organizer"
      },
      {
        "slug": "impeachment-evidence-tracker",
        "label": "Impeachment Evidence Tracker",
        "publicHref": "/legal-defense/workflows/impeachment-evidence-tracker",
        "workspaceHref": "/dashboard/workflows/legal-defense/impeachment-evidence-tracker"
      },
      {
        "slug": "motion-issue-spotter",
        "label": "Motion Issue Spotter",
        "publicHref": "/legal-defense/workflows/motion-issue-spotter",
        "workspaceHref": "/dashboard/workflows/legal-defense/motion-issue-spotter"
      },
      {
        "slug": "officer-statement-comparison",
        "label": "Officer Statement Comparison",
        "publicHref": "/legal-defense/workflows/officer-statement-comparison",
        "workspaceHref": "/dashboard/workflows/legal-defense/officer-statement-comparison"
      },
      {
        "slug": "police-records-request",
        "label": "Police Records Request",
        "publicHref": "/legal-defense/workflows/police-records-request",
        "workspaceHref": "/dashboard/workflows/legal-defense/police-records-request"
      },
      {
        "slug": "police-report-analysis",
        "label": "Police Report Analysis",
        "publicHref": "/legal-defense/workflows/police-report-analysis",
        "workspaceHref": "/dashboard/workflows/legal-defense/police-report-analysis"
      },
      {
        "slug": "probable-cause-review",
        "label": "Probable Cause Review",
        "publicHref": "/legal-defense/workflows/probable-cause-review",
        "workspaceHref": "/dashboard/workflows/legal-defense/probable-cause-review"
      },
      {
        "slug": "stolen-vehicle-arrest-defense",
        "label": "Stolen Vehicle Arrest Defense",
        "publicHref": "/legal-defense/workflows/stolen-vehicle-arrest-defense",
        "workspaceHref": "/dashboard/workflows/legal-defense/stolen-vehicle-arrest-defense"
      },
      {
        "slug": "suppression-issue-builder",
        "label": "Suppression Issue Builder",
        "publicHref": "/legal-defense/workflows/suppression-issue-builder",
        "workspaceHref": "/dashboard/workflows/legal-defense/suppression-issue-builder"
      },
      {
        "slug": "traffic-stop-evidence-review",
        "label": "Traffic Stop Evidence Review",
        "publicHref": "/legal-defense/workflows/traffic-stop-evidence-review",
        "workspaceHref": "/dashboard/workflows/legal-defense/traffic-stop-evidence-review"
      },
      {
        "slug": "unlawful-search-and-seizure",
        "label": "Unlawful Search And Seizure",
        "publicHref": "/legal-defense/workflows/unlawful-search-and-seizure",
        "workspaceHref": "/dashboard/workflows/legal-defense/unlawful-search-and-seizure"
      },
      {
        "slug": "vehicle-search-defense",
        "label": "Vehicle Search Defense",
        "publicHref": "/legal-defense/workflows/vehicle-search-defense",
        "workspaceHref": "/dashboard/workflows/legal-defense/vehicle-search-defense"
      },
      {
        "slug": "warrant-validity-review",
        "label": "Warrant Validity Review",
        "publicHref": "/legal-defense/workflows/warrant-validity-review",
        "workspaceHref": "/dashboard/workflows/legal-defense/warrant-validity-review"
      },
      {
        "slug": "witness-statement-analysis",
        "label": "Witness Statement Analysis",
        "publicHref": "/legal-defense/workflows/witness-statement-analysis",
        "workspaceHref": "/dashboard/workflows/legal-defense/witness-statement-analysis"
      },
      {
        "slug": "wrongful-arrest-case-builder",
        "label": "Wrongful Arrest Case Builder",
        "publicHref": "/legal-defense/workflows/wrongful-arrest-case-builder",
        "workspaceHref": "/dashboard/workflows/legal-defense/wrongful-arrest-case-builder"
      }
    ]
  },
  {
    "id": "notice-respond",
    "label": "Notice Respond",
    "publicHref": "/notice-respond/workflows",
    "workspaceHref": "/dashboard/workflows/notice-respond",
    "workflows": [
      {
        "slug": "administrative-hearing-notice-response",
        "label": "Administrative Hearing Notice Response",
        "publicHref": "/notice-respond/workflows/administrative-hearing-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/administrative-hearing-notice-response"
      },
      {
        "slug": "agency-action-response",
        "label": "Agency Action Response",
        "publicHref": "/notice-respond/workflows/agency-action-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/agency-action-response"
      },
      {
        "slug": "appeal-after-notice",
        "label": "Appeal After Notice",
        "publicHref": "/notice-respond/workflows/appeal-after-notice",
        "workspaceHref": "/dashboard/workflows/notice-respond/appeal-after-notice"
      },
      {
        "slug": "benefits-notice-response",
        "label": "Benefits Notice Response",
        "publicHref": "/notice-respond/workflows/benefits-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/benefits-notice-response"
      },
      {
        "slug": "civil-summons-response",
        "label": "Civil Summons Response",
        "publicHref": "/notice-respond/workflows/civil-summons-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/civil-summons-response"
      },
      {
        "slug": "compliance-notice-response",
        "label": "Compliance Notice Response",
        "publicHref": "/notice-respond/workflows/compliance-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/compliance-notice-response"
      },
      {
        "slug": "court-summons-response",
        "label": "Court Summons Response",
        "publicHref": "/notice-respond/workflows/court-summons-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/court-summons-response"
      },
      {
        "slug": "cp2000-response",
        "label": "CP2000 Response",
        "publicHref": "/notice-respond/workflows/cp2000-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/cp2000-response"
      },
      {
        "slug": "cp3219a-response",
        "label": "Cp3219a Response",
        "publicHref": "/notice-respond/workflows/cp3219a-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/cp3219a-response"
      },
      {
        "slug": "cp504-response",
        "label": "CP504 Response",
        "publicHref": "/notice-respond/workflows/cp504-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/cp504-response"
      },
      {
        "slug": "cp90-collection-notice-response",
        "label": "Cp90 Collection Notice Response",
        "publicHref": "/notice-respond/workflows/cp90-collection-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/cp90-collection-notice-response"
      },
      {
        "slug": "deadline-extension-request",
        "label": "Deadline Extension Request",
        "publicHref": "/notice-respond/workflows/deadline-extension-request",
        "workspaceHref": "/dashboard/workflows/notice-respond/deadline-extension-request"
      },
      {
        "slug": "document-request-response",
        "label": "Document Request Response",
        "publicHref": "/notice-respond/workflows/document-request-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/document-request-response"
      },
      {
        "slug": "evidence-request-response",
        "label": "Evidence Request Response",
        "publicHref": "/notice-respond/workflows/evidence-request-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/evidence-request-response"
      },
      {
        "slug": "follow-up-after-notice-submission",
        "label": "Follow Up After Notice Submission",
        "publicHref": "/notice-respond/workflows/follow-up-after-notice-submission",
        "workspaceHref": "/dashboard/workflows/notice-respond/follow-up-after-notice-submission"
      },
      {
        "slug": "government-notice-response",
        "label": "Government Notice Response",
        "publicHref": "/notice-respond/workflows/government-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/government-notice-response"
      },
      {
        "slug": "irs-30-day-letter-response",
        "label": "IRS 30 Day Letter Response",
        "publicHref": "/notice-respond/workflows/irs-30-day-letter-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/irs-30-day-letter-response"
      },
      {
        "slug": "irs-audit-letter-response",
        "label": "IRS Audit Letter Response",
        "publicHref": "/notice-respond/workflows/irs-audit-letter-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/irs-audit-letter-response"
      },
      {
        "slug": "irs-balance-due-notice-response",
        "label": "IRS Balance Due Notice Response",
        "publicHref": "/notice-respond/workflows/irs-balance-due-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/irs-balance-due-notice-response"
      },
      {
        "slug": "irs-identity-information-notice-response",
        "label": "IRS Identity Information Notice Response",
        "publicHref": "/notice-respond/workflows/irs-identity-information-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/irs-identity-information-notice-response"
      },
      {
        "slug": "irs-income-tax-notice-response",
        "label": "IRS Income Tax Notice Response",
        "publicHref": "/notice-respond/workflows/irs-income-tax-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/irs-income-tax-notice-response"
      },
      {
        "slug": "irs-notice-response",
        "label": "IRS Notice Response",
        "publicHref": "/notice-respond/workflows/irs-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/irs-notice-response"
      },
      {
        "slug": "irs-penalty-notice-response",
        "label": "IRS Penalty Notice Response",
        "publicHref": "/notice-respond/workflows/irs-penalty-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/irs-penalty-notice-response"
      },
      {
        "slug": "irs-underreporter-notice-response",
        "label": "IRS Underreporter Notice Response",
        "publicHref": "/notice-respond/workflows/irs-underreporter-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/irs-underreporter-notice-response"
      },
      {
        "slug": "licensing-notice-response",
        "label": "Licensing Notice Response",
        "publicHref": "/notice-respond/workflows/licensing-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/licensing-notice-response"
      },
      {
        "slug": "notice-disagreement-response",
        "label": "Notice Disagreement Response",
        "publicHref": "/notice-respond/workflows/notice-disagreement-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/notice-disagreement-response"
      },
      {
        "slug": "regulatory-deficiency-notice-response",
        "label": "Regulatory Deficiency Notice Response",
        "publicHref": "/notice-respond/workflows/regulatory-deficiency-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/regulatory-deficiency-notice-response"
      },
      {
        "slug": "state-revenue-department-notice-response",
        "label": "State Revenue Department Notice Response",
        "publicHref": "/notice-respond/workflows/state-revenue-department-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/state-revenue-department-notice-response"
      },
      {
        "slug": "state-tax-notice-response",
        "label": "State Tax Notice Response",
        "publicHref": "/notice-respond/workflows/state-tax-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/state-tax-notice-response"
      },
      {
        "slug": "unemployment-notice-response",
        "label": "Unemployment Notice Response",
        "publicHref": "/notice-respond/workflows/unemployment-notice-response",
        "workspaceHref": "/dashboard/workflows/notice-respond/unemployment-notice-response"
      }
    ]
  },
  {
    "id": "permit-reply",
    "label": "Permit Reply",
    "publicHref": "/permit-reply/workflows",
    "workspaceHref": "/dashboard/workflows/permit-reply",
    "workflows": [
      {
        "slug": "building-permit-correction-response",
        "label": "Building Permit Correction Response",
        "publicHref": "/permit-reply/workflows/building-permit-correction-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/building-permit-correction-response"
      },
      {
        "slug": "building-permit-denial-response",
        "label": "Building Permit Denial Response",
        "publicHref": "/permit-reply/workflows/building-permit-denial-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/building-permit-denial-response"
      },
      {
        "slug": "building-permit-response",
        "label": "Building Permit Response",
        "publicHref": "/permit-reply/workflows/building-permit-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/building-permit-response"
      },
      {
        "slug": "certificate-of-occupancy-response",
        "label": "Certificate Of Occupancy Response",
        "publicHref": "/permit-reply/workflows/certificate-of-occupancy-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/certificate-of-occupancy-response"
      },
      {
        "slug": "commercial-building-permit",
        "label": "Commercial Building Permit",
        "publicHref": "/permit-reply/workflows/commercial-building-permit",
        "workspaceHref": "/dashboard/workflows/permit-reply/commercial-building-permit"
      },
      {
        "slug": "construction-permit-response",
        "label": "Construction Permit Response",
        "publicHref": "/permit-reply/workflows/construction-permit-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/construction-permit-response"
      },
      {
        "slug": "deck-permit-response",
        "label": "Deck Permit Response",
        "publicHref": "/permit-reply/workflows/deck-permit-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/deck-permit-response"
      },
      {
        "slug": "demolition-permit-response",
        "label": "Demolition Permit Response",
        "publicHref": "/permit-reply/workflows/demolition-permit-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/demolition-permit-response"
      },
      {
        "slug": "electrical-permit-response",
        "label": "Electrical Permit Response",
        "publicHref": "/permit-reply/workflows/electrical-permit-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/electrical-permit-response"
      },
      {
        "slug": "fence-permit-response",
        "label": "Fence Permit Response",
        "publicHref": "/permit-reply/workflows/fence-permit-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/fence-permit-response"
      },
      {
        "slug": "hvac-permit-response",
        "label": "Hvac Permit Response",
        "publicHref": "/permit-reply/workflows/hvac-permit-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/hvac-permit-response"
      },
      {
        "slug": "land-development-permit",
        "label": "Land Development Permit",
        "publicHref": "/permit-reply/workflows/land-development-permit",
        "workspaceHref": "/dashboard/workflows/permit-reply/land-development-permit"
      },
      {
        "slug": "mechanical-permit-response",
        "label": "Mechanical Permit Response",
        "publicHref": "/permit-reply/workflows/mechanical-permit-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/mechanical-permit-response"
      },
      {
        "slug": "nonconforming-use-permit",
        "label": "Nonconforming Use Permit",
        "publicHref": "/permit-reply/workflows/nonconforming-use-permit",
        "workspaceHref": "/dashboard/workflows/permit-reply/nonconforming-use-permit"
      },
      {
        "slug": "occupancy-permit-response",
        "label": "Occupancy Permit Response",
        "publicHref": "/permit-reply/workflows/occupancy-permit-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/occupancy-permit-response"
      },
      {
        "slug": "permit-appeal-administrative-response",
        "label": "Permit Appeal Administrative Response",
        "publicHref": "/permit-reply/workflows/permit-appeal-administrative-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/permit-appeal-administrative-response"
      },
      {
        "slug": "permit-deficiency-response",
        "label": "Permit Deficiency Response",
        "publicHref": "/permit-reply/workflows/permit-deficiency-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/permit-deficiency-response"
      },
      {
        "slug": "permit-document-submission",
        "label": "Permit Document Submission",
        "publicHref": "/permit-reply/workflows/permit-document-submission",
        "workspaceHref": "/dashboard/workflows/permit-reply/permit-document-submission"
      },
      {
        "slug": "permit-evidence-package",
        "label": "Permit Evidence Package",
        "publicHref": "/permit-reply/workflows/permit-evidence-package",
        "workspaceHref": "/dashboard/workflows/permit-reply/permit-evidence-package"
      },
      {
        "slug": "permit-reconsideration",
        "label": "Permit Reconsideration",
        "publicHref": "/permit-reply/workflows/permit-reconsideration",
        "workspaceHref": "/dashboard/workflows/permit-reply/permit-reconsideration"
      },
      {
        "slug": "permit-status-tracking-request",
        "label": "Permit Status Tracking Request",
        "publicHref": "/permit-reply/workflows/permit-status-tracking-request",
        "workspaceHref": "/dashboard/workflows/permit-reply/permit-status-tracking-request"
      },
      {
        "slug": "plumbing-permit-response",
        "label": "Plumbing Permit Response",
        "publicHref": "/permit-reply/workflows/plumbing-permit-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/plumbing-permit-response"
      },
      {
        "slug": "reroof-permit-response",
        "label": "Reroof Permit Response",
        "publicHref": "/permit-reply/workflows/reroof-permit-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/reroof-permit-response"
      },
      {
        "slug": "residential-building-permit",
        "label": "Residential Building Permit",
        "publicHref": "/permit-reply/workflows/residential-building-permit",
        "workspaceHref": "/dashboard/workflows/permit-reply/residential-building-permit"
      },
      {
        "slug": "roofing-permit-response",
        "label": "Roofing Permit Response",
        "publicHref": "/permit-reply/workflows/roofing-permit-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/roofing-permit-response"
      },
      {
        "slug": "site-development-permit",
        "label": "Site Development Permit",
        "publicHref": "/permit-reply/workflows/site-development-permit",
        "workspaceHref": "/dashboard/workflows/permit-reply/site-development-permit"
      },
      {
        "slug": "temporary-structure-permit",
        "label": "Temporary Structure Permit",
        "publicHref": "/permit-reply/workflows/temporary-structure-permit",
        "workspaceHref": "/dashboard/workflows/permit-reply/temporary-structure-permit"
      },
      {
        "slug": "temporary-use-permit",
        "label": "Temporary Use Permit",
        "publicHref": "/permit-reply/workflows/temporary-use-permit",
        "workspaceHref": "/dashboard/workflows/permit-reply/temporary-use-permit"
      },
      {
        "slug": "utility-permit-response",
        "label": "Utility Permit Response",
        "publicHref": "/permit-reply/workflows/utility-permit-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/utility-permit-response"
      },
      {
        "slug": "zoning-permit-response",
        "label": "Zoning Permit Response",
        "publicHref": "/permit-reply/workflows/zoning-permit-response",
        "workspaceHref": "/dashboard/workflows/permit-reply/zoning-permit-response"
      }
    ]
  },
  {
    "id": "private-office",
    "label": "Private Office",
    "publicHref": "/private-office/workflows",
    "workspaceHref": "/dashboard/workflows/private-office",
    "workflows": [
      {
        "slug": "bank-fraud-dispute",
        "label": "Bank Fraud Dispute",
        "publicHref": "/private-office/workflows/bank-fraud-dispute",
        "workspaceHref": "/dashboard/workflows/private-office/bank-fraud-dispute"
      },
      {
        "slug": "bank-wire-transfer-dispute",
        "label": "Bank Wire Transfer Dispute",
        "publicHref": "/private-office/workflows/bank-wire-transfer-dispute",
        "workspaceHref": "/dashboard/workflows/private-office/bank-wire-transfer-dispute"
      },
      {
        "slug": "beneficiary-information-request",
        "label": "Beneficiary Information Request",
        "publicHref": "/private-office/workflows/beneficiary-information-request",
        "workspaceHref": "/dashboard/workflows/private-office/beneficiary-information-request"
      },
      {
        "slug": "construction-payment-dispute",
        "label": "Construction Payment Dispute",
        "publicHref": "/private-office/workflows/construction-payment-dispute",
        "workspaceHref": "/dashboard/workflows/private-office/construction-payment-dispute"
      },
      {
        "slug": "contractor-defect-dispute",
        "label": "Contractor Defect Dispute",
        "publicHref": "/private-office/workflows/contractor-defect-dispute",
        "workspaceHref": "/dashboard/workflows/private-office/contractor-defect-dispute"
      },
      {
        "slug": "contractor-dispute",
        "label": "Contractor Dispute",
        "publicHref": "/private-office/workflows/contractor-dispute",
        "workspaceHref": "/dashboard/workflows/private-office/contractor-dispute"
      },
      {
        "slug": "estate-property-dispute",
        "label": "Estate Property Dispute",
        "publicHref": "/private-office/workflows/estate-property-dispute",
        "workspaceHref": "/dashboard/workflows/private-office/estate-property-dispute"
      },
      {
        "slug": "evidence-preservation-notice",
        "label": "Evidence Preservation Notice",
        "publicHref": "/private-office/workflows/evidence-preservation-notice",
        "workspaceHref": "/dashboard/workflows/private-office/evidence-preservation-notice"
      },
      {
        "slug": "fiduciary-duty-concern",
        "label": "Fiduciary Duty Concern",
        "publicHref": "/private-office/workflows/fiduciary-duty-concern",
        "workspaceHref": "/dashboard/workflows/private-office/fiduciary-duty-concern"
      },
      {
        "slug": "formal-demand-letter",
        "label": "Formal Demand Letter",
        "publicHref": "/private-office/workflows/formal-demand-letter",
        "workspaceHref": "/dashboard/workflows/private-office/formal-demand-letter"
      },
      {
        "slug": "government-accountability-investigation",
        "label": "Government Accountability Investigation",
        "publicHref": "/private-office/workflows/government-accountability-investigation",
        "workspaceHref": "/dashboard/workflows/private-office/government-accountability-investigation"
      },
      {
        "slug": "government-accusation-defense",
        "label": "Government Accusation Defense",
        "publicHref": "/private-office/workflows/government-accusation-defense",
        "workspaceHref": "/dashboard/workflows/private-office/government-accusation-defense"
      },
      {
        "slug": "high-value-purchase-dispute",
        "label": "High Value Purchase Dispute",
        "publicHref": "/private-office/workflows/high-value-purchase-dispute",
        "workspaceHref": "/dashboard/workflows/private-office/high-value-purchase-dispute"
      },
      {
        "slug": "home-repair-dispute",
        "label": "Home Repair Dispute",
        "publicHref": "/private-office/workflows/home-repair-dispute",
        "workspaceHref": "/dashboard/workflows/private-office/home-repair-dispute"
      },
      {
        "slug": "insurance-underpayment-dispute",
        "label": "Insurance Underpayment Dispute",
        "publicHref": "/private-office/workflows/insurance-underpayment-dispute",
        "workspaceHref": "/dashboard/workflows/private-office/insurance-underpayment-dispute"
      },
      {
        "slug": "litigation-hold-letter",
        "label": "Litigation Hold Letter",
        "publicHref": "/private-office/workflows/litigation-hold-letter",
        "workspaceHref": "/dashboard/workflows/private-office/litigation-hold-letter"
      },
      {
        "slug": "personal-legal-autonomy-asset-control",
        "label": "Personal Legal Autonomy Asset Control",
        "publicHref": "/private-office/workflows/personal-legal-autonomy-asset-control",
        "workspaceHref": "/dashboard/workflows/private-office/personal-legal-autonomy-asset-control"
      },
      {
        "slug": "power-of-attorney-dispute",
        "label": "Power Of Attorney Dispute",
        "publicHref": "/private-office/workflows/power-of-attorney-dispute",
        "workspaceHref": "/dashboard/workflows/private-office/power-of-attorney-dispute"
      },
      {
        "slug": "private-matter-evidence-package",
        "label": "Private Matter Evidence Package",
        "publicHref": "/private-office/workflows/private-matter-evidence-package",
        "workspaceHref": "/dashboard/workflows/private-office/private-matter-evidence-package"
      },
      {
        "slug": "probate-records-investigation",
        "label": "Probate Records Investigation",
        "publicHref": "/private-office/workflows/probate-records-investigation",
        "workspaceHref": "/dashboard/workflows/private-office/probate-records-investigation"
      },
      {
        "slug": "professional-services-dispute",
        "label": "Professional Services Dispute",
        "publicHref": "/private-office/workflows/professional-services-dispute",
        "workspaceHref": "/dashboard/workflows/private-office/professional-services-dispute"
      },
      {
        "slug": "property-damage-demand",
        "label": "Property Damage Demand",
        "publicHref": "/private-office/workflows/property-damage-demand",
        "workspaceHref": "/dashboard/workflows/private-office/property-damage-demand"
      },
      {
        "slug": "property-estate-reconstruction",
        "label": "Property Estate Reconstruction",
        "publicHref": "/private-office/workflows/property-estate-reconstruction",
        "workspaceHref": "/dashboard/workflows/private-office/property-estate-reconstruction"
      },
      {
        "slug": "property-insurance-claim",
        "label": "Property Insurance Claim",
        "publicHref": "/private-office/workflows/property-insurance-claim",
        "workspaceHref": "/dashboard/workflows/private-office/property-insurance-claim"
      },
      {
        "slug": "property-title-history-investigation",
        "label": "Property Title History Investigation",
        "publicHref": "/private-office/workflows/property-title-history-investigation",
        "workspaceHref": "/dashboard/workflows/private-office/property-title-history-investigation"
      },
      {
        "slug": "security-deposit-dispute",
        "label": "Security Deposit Dispute",
        "publicHref": "/private-office/workflows/security-deposit-dispute",
        "workspaceHref": "/dashboard/workflows/private-office/security-deposit-dispute"
      },
      {
        "slug": "trust-accounting-demand",
        "label": "Trust Accounting Demand",
        "publicHref": "/private-office/workflows/trust-accounting-demand",
        "workspaceHref": "/dashboard/workflows/private-office/trust-accounting-demand"
      },
      {
        "slug": "trust-beneficiary-notice",
        "label": "Trust Beneficiary Notice",
        "publicHref": "/private-office/workflows/trust-beneficiary-notice",
        "workspaceHref": "/dashboard/workflows/private-office/trust-beneficiary-notice"
      },
      {
        "slug": "unauthorized-bank-transfer-dispute",
        "label": "Unauthorized Bank Transfer Dispute",
        "publicHref": "/private-office/workflows/unauthorized-bank-transfer-dispute",
        "workspaceHref": "/dashboard/workflows/private-office/unauthorized-bank-transfer-dispute"
      },
      {
        "slug": "wire-fraud-recovery-package",
        "label": "Wire Fraud Recovery Package",
        "publicHref": "/private-office/workflows/wire-fraud-recovery-package",
        "workspaceHref": "/dashboard/workflows/private-office/wire-fraud-recovery-package"
      }
    ]
  },
  {
    "id": "records-request",
    "label": "Records Requests",
    "publicHref": "/records-request/workflows",
    "workspaceHref": "/dashboard/workflows/records-request",
    "workflows": [
      {
        "slug": "agency-records-request",
        "label": "Agency Records Request",
        "publicHref": "/records-request/workflows/agency-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/agency-records-request"
      },
      {
        "slug": "arrest-records-request",
        "label": "Arrest Records Request",
        "publicHref": "/records-request/workflows/arrest-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/arrest-records-request"
      },
      {
        "slug": "background-check-records-request",
        "label": "Background Check Records Request",
        "publicHref": "/records-request/workflows/background-check-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/background-check-records-request"
      },
      {
        "slug": "birth-certificate-request",
        "label": "Birth Certificate Request",
        "publicHref": "/records-request/workflows/birth-certificate-request",
        "workspaceHref": "/dashboard/workflows/records-request/birth-certificate-request"
      },
      {
        "slug": "birth-records-request",
        "label": "Birth Records Request",
        "publicHref": "/records-request/workflows/birth-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/birth-records-request"
      },
      {
        "slug": "code-enforcement-records-request",
        "label": "Code Enforcement Records Request",
        "publicHref": "/records-request/workflows/code-enforcement-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/code-enforcement-records-request"
      },
      {
        "slug": "court-records-request",
        "label": "Court Records Request",
        "publicHref": "/records-request/workflows/court-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/court-records-request"
      },
      {
        "slug": "criminal-history-request",
        "label": "Criminal History Request",
        "publicHref": "/records-request/workflows/criminal-history-request",
        "workspaceHref": "/dashboard/workflows/records-request/criminal-history-request"
      },
      {
        "slug": "criminal-records-request",
        "label": "Criminal Records Request",
        "publicHref": "/records-request/workflows/criminal-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/criminal-records-request"
      },
      {
        "slug": "death-records-request",
        "label": "Death Records Request",
        "publicHref": "/records-request/workflows/death-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/death-records-request"
      },
      {
        "slug": "divorce-records-request",
        "label": "Divorce Records Request",
        "publicHref": "/records-request/workflows/divorce-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/divorce-records-request"
      },
      {
        "slug": "education-records-request",
        "label": "Education Records Request",
        "publicHref": "/records-request/workflows/education-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/education-records-request"
      },
      {
        "slug": "employment-records-request",
        "label": "Employment Records Request",
        "publicHref": "/records-request/workflows/employment-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/employment-records-request"
      },
      {
        "slug": "foia-police-records-request",
        "label": "FOIA Police Records Request",
        "publicHref": "/records-request/workflows/foia-police-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/foia-police-records-request"
      },
      {
        "slug": "foia-request",
        "label": "FOIA Request",
        "publicHref": "/records-request/workflows/foia-request",
        "workspaceHref": "/dashboard/workflows/records-request/foia-request"
      },
      {
        "slug": "government-documents-request",
        "label": "Government Documents Request",
        "publicHref": "/records-request/workflows/government-documents-request",
        "workspaceHref": "/dashboard/workflows/records-request/government-documents-request"
      },
      {
        "slug": "marriage-records-request",
        "label": "Marriage Records Request",
        "publicHref": "/records-request/workflows/marriage-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/marriage-records-request"
      },
      {
        "slug": "medical-records-request",
        "label": "Medical Records Request",
        "publicHref": "/records-request/workflows/medical-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/medical-records-request"
      },
      {
        "slug": "military-records-request",
        "label": "Military Records Request",
        "publicHref": "/records-request/workflows/military-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/military-records-request"
      },
      {
        "slug": "open-records-request",
        "label": "Open Records Request",
        "publicHref": "/records-request/workflows/open-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/open-records-request"
      },
      {
        "slug": "permit-records-request",
        "label": "Permit Records Request",
        "publicHref": "/records-request/workflows/permit-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/permit-records-request"
      },
      {
        "slug": "police-records-request",
        "label": "Police Records Request",
        "publicHref": "/records-request/workflows/police-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/police-records-request"
      },
      {
        "slug": "police-report-copy-request",
        "label": "Police Report Copy Request",
        "publicHref": "/records-request/workflows/police-report-copy-request",
        "workspaceHref": "/dashboard/workflows/records-request/police-report-copy-request"
      },
      {
        "slug": "police-report-request",
        "label": "Police Report Request",
        "publicHref": "/records-request/workflows/police-report-request",
        "workspaceHref": "/dashboard/workflows/records-request/police-report-request"
      },
      {
        "slug": "property-records-request",
        "label": "Property Records Request",
        "publicHref": "/records-request/workflows/property-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/property-records-request"
      },
      {
        "slug": "public-information-request",
        "label": "Public Information Request",
        "publicHref": "/records-request/workflows/public-information-request",
        "workspaceHref": "/dashboard/workflows/records-request/public-information-request"
      },
      {
        "slug": "public-records-request",
        "label": "Public Records Request",
        "publicHref": "/records-request/workflows/public-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/public-records-request"
      },
      {
        "slug": "records-denial-appeal-request",
        "label": "Records Denial Appeal Request",
        "publicHref": "/records-request/workflows/records-denial-appeal-request",
        "workspaceHref": "/dashboard/workflows/records-request/records-denial-appeal-request"
      },
      {
        "slug": "records-follow-up-request",
        "label": "Records Follow Up Request",
        "publicHref": "/records-request/workflows/records-follow-up-request",
        "workspaceHref": "/dashboard/workflows/records-request/records-follow-up-request"
      },
      {
        "slug": "school-records-request",
        "label": "School Records Request",
        "publicHref": "/records-request/workflows/school-records-request",
        "workspaceHref": "/dashboard/workflows/records-request/school-records-request"
      }
    ]
  },
  {
    "id": "small-business",
    "label": "Small Business",
    "publicHref": "/small-business/workflows",
    "workspaceHref": "/dashboard/workflows/small-business",
    "workflows": [
      {
        "slug": "account-balance-notice",
        "label": "Account Balance Notice",
        "publicHref": "/small-business/workflows/account-balance-notice",
        "workspaceHref": "/dashboard/workflows/small-business/account-balance-notice"
      },
      {
        "slug": "appointment-scheduling-notice",
        "label": "Appointment Scheduling Notice",
        "publicHref": "/small-business/workflows/appointment-scheduling-notice",
        "workspaceHref": "/dashboard/workflows/small-business/appointment-scheduling-notice"
      },
      {
        "slug": "business-policy-update",
        "label": "Business Policy Update",
        "publicHref": "/small-business/workflows/business-policy-update",
        "workspaceHref": "/dashboard/workflows/small-business/business-policy-update"
      },
      {
        "slug": "business-records-request",
        "label": "Business Records Request",
        "publicHref": "/small-business/workflows/business-records-request",
        "workspaceHref": "/dashboard/workflows/small-business/business-records-request"
      },
      {
        "slug": "cease-and-desist-business-correspondence",
        "label": "Cease And Desist Business Correspondence",
        "publicHref": "/small-business/workflows/cease-and-desist-business-correspondence",
        "workspaceHref": "/dashboard/workflows/small-business/cease-and-desist-business-correspondence"
      },
      {
        "slug": "change-of-address-notice",
        "label": "Change Of Address Notice",
        "publicHref": "/small-business/workflows/change-of-address-notice",
        "workspaceHref": "/dashboard/workflows/small-business/change-of-address-notice"
      },
      {
        "slug": "collection-letter",
        "label": "Collection Letter",
        "publicHref": "/small-business/workflows/collection-letter",
        "workspaceHref": "/dashboard/workflows/small-business/collection-letter"
      },
      {
        "slug": "compliance-notice",
        "label": "Compliance Notice",
        "publicHref": "/small-business/workflows/compliance-notice",
        "workspaceHref": "/dashboard/workflows/small-business/compliance-notice"
      },
      {
        "slug": "contract-change-notice",
        "label": "Contract Change Notice",
        "publicHref": "/small-business/workflows/contract-change-notice",
        "workspaceHref": "/dashboard/workflows/small-business/contract-change-notice"
      },
      {
        "slug": "contract-nonrenewal-notice",
        "label": "Contract Nonrenewal Notice",
        "publicHref": "/small-business/workflows/contract-nonrenewal-notice",
        "workspaceHref": "/dashboard/workflows/small-business/contract-nonrenewal-notice"
      },
      {
        "slug": "contract-renewal-notice",
        "label": "Contract Renewal Notice",
        "publicHref": "/small-business/workflows/contract-renewal-notice",
        "workspaceHref": "/dashboard/workflows/small-business/contract-renewal-notice"
      },
      {
        "slug": "customer-complaint-response",
        "label": "Customer Complaint Response",
        "publicHref": "/small-business/workflows/customer-complaint-response",
        "workspaceHref": "/dashboard/workflows/small-business/customer-complaint-response"
      },
      {
        "slug": "customer-dispute-response",
        "label": "Customer Dispute Response",
        "publicHref": "/small-business/workflows/customer-dispute-response",
        "workspaceHref": "/dashboard/workflows/small-business/customer-dispute-response"
      },
      {
        "slug": "final-demand-for-payment",
        "label": "Final Demand For Payment",
        "publicHref": "/small-business/workflows/final-demand-for-payment",
        "workspaceHref": "/dashboard/workflows/small-business/final-demand-for-payment"
      },
      {
        "slug": "final-payment-reminder",
        "label": "Final Payment Reminder",
        "publicHref": "/small-business/workflows/final-payment-reminder",
        "workspaceHref": "/dashboard/workflows/small-business/final-payment-reminder"
      },
      {
        "slug": "general-formal-business-letter",
        "label": "General Formal Business Letter",
        "publicHref": "/small-business/workflows/general-formal-business-letter",
        "workspaceHref": "/dashboard/workflows/small-business/general-formal-business-letter"
      },
      {
        "slug": "insurance-certificate-request",
        "label": "Insurance Certificate Request",
        "publicHref": "/small-business/workflows/insurance-certificate-request",
        "workspaceHref": "/dashboard/workflows/small-business/insurance-certificate-request"
      },
      {
        "slug": "late-payment-notice",
        "label": "Late Payment Notice",
        "publicHref": "/small-business/workflows/late-payment-notice",
        "workspaceHref": "/dashboard/workflows/small-business/late-payment-notice"
      },
      {
        "slug": "past-due-invoice-notice",
        "label": "Past Due Invoice Notice",
        "publicHref": "/small-business/workflows/past-due-invoice-notice",
        "workspaceHref": "/dashboard/workflows/small-business/past-due-invoice-notice"
      },
      {
        "slug": "payment-demand",
        "label": "Payment Demand",
        "publicHref": "/small-business/workflows/payment-demand",
        "workspaceHref": "/dashboard/workflows/small-business/payment-demand"
      },
      {
        "slug": "payment-reminder",
        "label": "Payment Reminder",
        "publicHref": "/small-business/workflows/payment-reminder",
        "workspaceHref": "/dashboard/workflows/small-business/payment-reminder"
      },
      {
        "slug": "price-increase-notice",
        "label": "Price Increase Notice",
        "publicHref": "/small-business/workflows/price-increase-notice",
        "workspaceHref": "/dashboard/workflows/small-business/price-increase-notice"
      },
      {
        "slug": "refund-response",
        "label": "Refund Response",
        "publicHref": "/small-business/workflows/refund-response",
        "workspaceHref": "/dashboard/workflows/small-business/refund-response"
      },
      {
        "slug": "service-cancellation-response",
        "label": "Service Cancellation Response",
        "publicHref": "/small-business/workflows/service-cancellation-response",
        "workspaceHref": "/dashboard/workflows/small-business/service-cancellation-response"
      },
      {
        "slug": "service-interruption-notice",
        "label": "Service Interruption Notice",
        "publicHref": "/small-business/workflows/service-interruption-notice",
        "workspaceHref": "/dashboard/workflows/small-business/service-interruption-notice"
      },
      {
        "slug": "terms-violation-notice",
        "label": "Terms Violation Notice",
        "publicHref": "/small-business/workflows/terms-violation-notice",
        "workspaceHref": "/dashboard/workflows/small-business/terms-violation-notice"
      },
      {
        "slug": "unpaid-invoice-letter",
        "label": "Unpaid Invoice Letter",
        "publicHref": "/small-business/workflows/unpaid-invoice-letter",
        "workspaceHref": "/dashboard/workflows/small-business/unpaid-invoice-letter"
      },
      {
        "slug": "vendor-dispute-response",
        "label": "Vendor Dispute Response",
        "publicHref": "/small-business/workflows/vendor-dispute-response",
        "workspaceHref": "/dashboard/workflows/small-business/vendor-dispute-response"
      },
      {
        "slug": "vendor-documentation-request",
        "label": "Vendor Documentation Request",
        "publicHref": "/small-business/workflows/vendor-documentation-request",
        "workspaceHref": "/dashboard/workflows/small-business/vendor-documentation-request"
      },
      {
        "slug": "vendor-payment-dispute",
        "label": "Vendor Payment Dispute",
        "publicHref": "/small-business/workflows/vendor-payment-dispute",
        "workspaceHref": "/dashboard/workflows/small-business/vendor-payment-dispute"
      }
    ]
  },
  {
    "id": "tenant-reply",
    "label": "Tenant Reply",
    "publicHref": "/tenant-reply/workflows",
    "workspaceHref": "/dashboard/workflows/tenant-reply",
    "workflows": [
      {
        "slug": "cure-or-quit-response",
        "label": "Cure Or Quit Response",
        "publicHref": "/tenant-reply/workflows/cure-or-quit-response",
        "workspaceHref": "/dashboard/workflows/tenant-reply/cure-or-quit-response"
      },
      {
        "slug": "eviction-notice-response",
        "label": "Eviction Notice Response",
        "publicHref": "/tenant-reply/workflows/eviction-notice-response",
        "workspaceHref": "/dashboard/workflows/tenant-reply/eviction-notice-response"
      },
      {
        "slug": "habitability-complaint",
        "label": "Habitability Complaint",
        "publicHref": "/tenant-reply/workflows/habitability-complaint",
        "workspaceHref": "/dashboard/workflows/tenant-reply/habitability-complaint"
      },
      {
        "slug": "housing-agency-complaint-response",
        "label": "Housing Agency Complaint Response",
        "publicHref": "/tenant-reply/workflows/housing-agency-complaint-response",
        "workspaceHref": "/dashboard/workflows/tenant-reply/housing-agency-complaint-response"
      },
      {
        "slug": "landlord-communication-documentation",
        "label": "Landlord Communication Documentation",
        "publicHref": "/tenant-reply/workflows/landlord-communication-documentation",
        "workspaceHref": "/dashboard/workflows/tenant-reply/landlord-communication-documentation"
      },
      {
        "slug": "landlord-damage-claim-response",
        "label": "Landlord Damage Claim Response",
        "publicHref": "/tenant-reply/workflows/landlord-damage-claim-response",
        "workspaceHref": "/dashboard/workflows/tenant-reply/landlord-damage-claim-response"
      },
      {
        "slug": "late-fee-dispute",
        "label": "Late Fee Dispute",
        "publicHref": "/tenant-reply/workflows/late-fee-dispute",
        "workspaceHref": "/dashboard/workflows/tenant-reply/late-fee-dispute"
      },
      {
        "slug": "lease-amendment-response",
        "label": "Lease Amendment Response",
        "publicHref": "/tenant-reply/workflows/lease-amendment-response",
        "workspaceHref": "/dashboard/workflows/tenant-reply/lease-amendment-response"
      },
      {
        "slug": "lease-renewal-response",
        "label": "Lease Renewal Response",
        "publicHref": "/tenant-reply/workflows/lease-renewal-response",
        "workspaceHref": "/dashboard/workflows/tenant-reply/lease-renewal-response"
      },
      {
        "slug": "lease-termination-response",
        "label": "Lease Termination Response",
        "publicHref": "/tenant-reply/workflows/lease-termination-response",
        "workspaceHref": "/dashboard/workflows/tenant-reply/lease-termination-response"
      },
      {
        "slug": "lease-violation-response",
        "label": "Lease Violation Response",
        "publicHref": "/tenant-reply/workflows/lease-violation-response",
        "workspaceHref": "/dashboard/workflows/tenant-reply/lease-violation-response"
      },
      {
        "slug": "maintenance-neglect-response",
        "label": "Maintenance Neglect Response",
        "publicHref": "/tenant-reply/workflows/maintenance-neglect-response",
        "workspaceHref": "/dashboard/workflows/tenant-reply/maintenance-neglect-response"
      },
      {
        "slug": "mold-water-damage-notice",
        "label": "Mold Water Damage Notice",
        "publicHref": "/tenant-reply/workflows/mold-water-damage-notice",
        "workspaceHref": "/dashboard/workflows/tenant-reply/mold-water-damage-notice"
      },
      {
        "slug": "move-out-charges-dispute",
        "label": "Move Out Charges Dispute",
        "publicHref": "/tenant-reply/workflows/move-out-charges-dispute",
        "workspaceHref": "/dashboard/workflows/tenant-reply/move-out-charges-dispute"
      },
      {
        "slug": "move-out-dispute",
        "label": "Move Out Dispute",
        "publicHref": "/tenant-reply/workflows/move-out-dispute",
        "workspaceHref": "/dashboard/workflows/tenant-reply/move-out-dispute"
      },
      {
        "slug": "notice-to-enter-response",
        "label": "Notice To Enter Response",
        "publicHref": "/tenant-reply/workflows/notice-to-enter-response",
        "workspaceHref": "/dashboard/workflows/tenant-reply/notice-to-enter-response"
      },
      {
        "slug": "pay-or-quit-response",
        "label": "Pay Or Quit Response",
        "publicHref": "/tenant-reply/workflows/pay-or-quit-response",
        "workspaceHref": "/dashboard/workflows/tenant-reply/pay-or-quit-response"
      },
      {
        "slug": "property-damage-dispute",
        "label": "Property Damage Dispute",
        "publicHref": "/tenant-reply/workflows/property-damage-dispute",
        "workspaceHref": "/dashboard/workflows/tenant-reply/property-damage-dispute"
      },
      {
        "slug": "rent-increase-response",
        "label": "Rent Increase Response",
        "publicHref": "/tenant-reply/workflows/rent-increase-response",
        "workspaceHref": "/dashboard/workflows/tenant-reply/rent-increase-response"
      },
      {
        "slug": "repair-request",
        "label": "Repair Request",
        "publicHref": "/tenant-reply/workflows/repair-request",
        "workspaceHref": "/dashboard/workflows/tenant-reply/repair-request"
      },
      {
        "slug": "security-deposit-demand",
        "label": "Security Deposit Demand",
        "publicHref": "/tenant-reply/workflows/security-deposit-demand",
        "workspaceHref": "/dashboard/workflows/tenant-reply/security-deposit-demand"
      },
      {
        "slug": "security-deposit-dispute",
        "label": "Security Deposit Dispute",
        "publicHref": "/tenant-reply/workflows/security-deposit-dispute",
        "workspaceHref": "/dashboard/workflows/tenant-reply/security-deposit-dispute"
      },
      {
        "slug": "security-deposit-response",
        "label": "Security Deposit Response",
        "publicHref": "/tenant-reply/workflows/security-deposit-response",
        "workspaceHref": "/dashboard/workflows/tenant-reply/security-deposit-response"
      },
      {
        "slug": "tenant-demand-letter",
        "label": "Tenant Demand Letter",
        "publicHref": "/tenant-reply/workflows/tenant-demand-letter",
        "workspaceHref": "/dashboard/workflows/tenant-reply/tenant-demand-letter"
      },
      {
        "slug": "tenant-evidence-package",
        "label": "Tenant Evidence Package",
        "publicHref": "/tenant-reply/workflows/tenant-evidence-package",
        "workspaceHref": "/dashboard/workflows/tenant-reply/tenant-evidence-package"
      },
      {
        "slug": "tenant-notice-response",
        "label": "Tenant Notice Response",
        "publicHref": "/tenant-reply/workflows/tenant-notice-response",
        "workspaceHref": "/dashboard/workflows/tenant-reply/tenant-notice-response"
      },
      {
        "slug": "tenant-response-to-landlord",
        "label": "Tenant Response To Landlord",
        "publicHref": "/tenant-reply/workflows/tenant-response-to-landlord",
        "workspaceHref": "/dashboard/workflows/tenant-reply/tenant-response-to-landlord"
      },
      {
        "slug": "unauthorized-entry-complaint",
        "label": "Unauthorized Entry Complaint",
        "publicHref": "/tenant-reply/workflows/unauthorized-entry-complaint",
        "workspaceHref": "/dashboard/workflows/tenant-reply/unauthorized-entry-complaint"
      },
      {
        "slug": "unresolved-repair-follow-up",
        "label": "Unresolved Repair Follow Up",
        "publicHref": "/tenant-reply/workflows/unresolved-repair-follow-up",
        "workspaceHref": "/dashboard/workflows/tenant-reply/unresolved-repair-follow-up"
      },
      {
        "slug": "utility-billing-dispute",
        "label": "Utility Billing Dispute",
        "publicHref": "/tenant-reply/workflows/utility-billing-dispute",
        "workspaceHref": "/dashboard/workflows/tenant-reply/utility-billing-dispute"
      }
    ]
  },
  {
    "id": "secured-transactions",
    "label": "Secured Transactions",
    "publicHref": "/secured-transactions/workflows",
    "workspaceHref": "/dashboard/workflows/secured-transactions",
    "workflows": [
      {
        "slug": "amendment-continuation-assignment-termination",
        "label": "Amendment Continuation Assignment Termination",
        "publicHref": "/secured-transactions/workflows/amendment-continuation-assignment-termination",
        "workspaceHref": "/dashboard/workflows/secured-transactions/amendment-continuation-assignment-termination"
      },
      {
        "slug": "attachment-certification",
        "label": "Attachment Certification",
        "publicHref": "/secured-transactions/workflows/attachment-certification",
        "workspaceHref": "/dashboard/workflows/secured-transactions/attachment-certification"
      },
      {
        "slug": "collateral-ownership-classification",
        "label": "Collateral Ownership Classification",
        "publicHref": "/secured-transactions/workflows/collateral-ownership-classification",
        "workspaceHref": "/dashboard/workflows/secured-transactions/collateral-ownership-classification"
      },
      {
        "slug": "first-priority-determination",
        "label": "First Priority Determination",
        "publicHref": "/secured-transactions/workflows/first-priority-determination",
        "workspaceHref": "/dashboard/workflows/secured-transactions/first-priority-determination"
      },
      {
        "slug": "governing-law-filing-jurisdiction",
        "label": "Governing Law Filing Jurisdiction",
        "publicHref": "/secured-transactions/workflows/governing-law-filing-jurisdiction",
        "workspaceHref": "/dashboard/workflows/secured-transactions/governing-law-filing-jurisdiction"
      },
      {
        "slug": "name-capacity-resolution",
        "label": "Name Capacity Resolution",
        "publicHref": "/secured-transactions/workflows/name-capacity-resolution",
        "workspaceHref": "/dashboard/workflows/secured-transactions/name-capacity-resolution"
      },
      {
        "slug": "obligation-value",
        "label": "Obligation Value",
        "publicHref": "/secured-transactions/workflows/obligation-value",
        "workspaceHref": "/dashboard/workflows/secured-transactions/obligation-value"
      },
      {
        "slug": "perfection-execution",
        "label": "Perfection Execution",
        "publicHref": "/secured-transactions/workflows/perfection-execution",
        "workspaceHref": "/dashboard/workflows/secured-transactions/perfection-execution"
      },
      {
        "slug": "perfection-method-selection",
        "label": "Perfection Method Selection",
        "publicHref": "/secured-transactions/workflows/perfection-method-selection",
        "workspaceHref": "/dashboard/workflows/secured-transactions/perfection-method-selection"
      },
      {
        "slug": "post-perfection-verification",
        "label": "Post Perfection Verification",
        "publicHref": "/secured-transactions/workflows/post-perfection-verification",
        "workspaceHref": "/dashboard/workflows/secured-transactions/post-perfection-verification"
      },
      {
        "slug": "pre-filing-lien-priority-search",
        "label": "Pre Filing Lien Priority Search",
        "publicHref": "/secured-transactions/workflows/pre-filing-lien-priority-search",
        "workspaceHref": "/dashboard/workflows/secured-transactions/pre-filing-lien-priority-search"
      },
      {
        "slug": "priority-preservation-monitoring",
        "label": "Priority Preservation Monitoring",
        "publicHref": "/secured-transactions/workflows/priority-preservation-monitoring",
        "workspaceHref": "/dashboard/workflows/secured-transactions/priority-preservation-monitoring"
      },
      {
        "slug": "priority-remediation",
        "label": "Priority Remediation",
        "publicHref": "/secured-transactions/workflows/priority-remediation",
        "workspaceHref": "/dashboard/workflows/secured-transactions/priority-remediation"
      },
      {
        "slug": "priority-strategy",
        "label": "Priority Strategy",
        "publicHref": "/secured-transactions/workflows/priority-strategy",
        "workspaceHref": "/dashboard/workflows/secured-transactions/priority-strategy"
      },
      {
        "slug": "secured-transaction-eligibility",
        "label": "Secured Transaction Eligibility",
        "publicHref": "/secured-transactions/workflows/secured-transaction-eligibility",
        "workspaceHref": "/dashboard/workflows/secured-transactions/secured-transaction-eligibility"
      },
      {
        "slug": "security-agreement-generation",
        "label": "Security Agreement Generation",
        "publicHref": "/secured-transactions/workflows/security-agreement-generation",
        "workspaceHref": "/dashboard/workflows/secured-transactions/security-agreement-generation"
      },
      {
        "slug": "ucc1-preparation-authorization",
        "label": "UCC 1 Preparation Authorization",
        "publicHref": "/secured-transactions/workflows/ucc1-preparation-authorization",
        "workspaceHref": "/dashboard/workflows/secured-transactions/ucc1-preparation-authorization"
      }
    ]
  }
] as const satisfies readonly WorkflowNavigationSection[]

export const WORKFLOW_NAV_COUNT = WORKFLOW_NAV_SECTIONS.reduce(
  (total, section) => total + section.workflows.length,
  0,
)

export function workflowNavigationSection(id: string | undefined) {
  return WORKFLOW_NAV_SECTIONS.find((section) => section.id === id) ?? null
}

export function workflowNavigationItem(sectionId: string | undefined, workflowId: string | undefined) {
  const section = workflowNavigationSection(sectionId)
  if (!section) return null
  const workflow = section.workflows.find((item) => item.slug === workflowId) ?? null
  return workflow ? { section, workflow } : null
}

export function findWorkflowNavigationItem(pathname: string) {
  for (const section of WORKFLOW_NAV_SECTIONS) {
    const workflow = section.workflows.find(
      (item) => pathname === item.workspaceHref || pathname.startsWith(item.workspaceHref + "/"),
    )
    if (workflow) return { section, workflow }
  }
  return null
}


/**
 * Backwards-compatible public product grouping derived from the canonical
 * navigation sections. Keep consumers on one source of truth while older
 * product-family pages migrate to WORKFLOW_NAV_SECTIONS.
 */
export const WORKFLOW_NAV_GROUPS = WORKFLOW_NAV_SECTIONS.map((section) => ({
  product: section.label,
  route: section.publicHref,
  workflows: section.workflows.map((workflow) => ({
    slug: workflow.slug,
    label: workflow.label,
    href: workflow.publicHref,
    pipeline: "Guided workflow",
  })),
}))
