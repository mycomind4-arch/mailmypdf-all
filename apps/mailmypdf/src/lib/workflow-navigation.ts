export type WorkflowNavigationItem = {
  slug: string
  label: string
  href: string
}

export type WorkflowNavigationSection = {
  id: string
  label: string
  href: string
  workflows: readonly WorkflowNavigationItem[]
}

/**
 * Canonical authenticated workflow navigation.
 *
 * Generated from the colocated workflow folders. This is the source used by
 * the Studio-style authenticated sidebar so customers and admins can traverse
 * the complete MailMyPDF workflow catalog from one place.
 */
export const WORKFLOW_NAV_SECTIONS = [
  {
    "id": "appeal-mail",
    "label": "Appeal Mail",
    "href": "/appeal-mail",
    "workflows": [
      {
        "slug": "appeal-car-insurance-claim",
        "label": "Appeal Car Insurance Claim",
        "href": "/appeal-mail/workflows/appeal-car-insurance-claim"
      },
      {
        "slug": "appeal-denied-claim",
        "label": "Appeal Denied Claim",
        "href": "/appeal-mail/workflows/appeal-denied-claim"
      },
      {
        "slug": "appeal-dental-insurance-denial",
        "label": "Appeal Dental Insurance Denial",
        "href": "/appeal-mail/workflows/appeal-dental-insurance-denial"
      },
      {
        "slug": "appeal-edd-disqualification",
        "label": "Appeal Edd Disqualification",
        "href": "/appeal-mail/workflows/appeal-edd-disqualification"
      },
      {
        "slug": "appeal-financial-aid-decision",
        "label": "Appeal Financial Aid Decision",
        "href": "/appeal-mail/workflows/appeal-financial-aid-decision"
      },
      {
        "slug": "appeal-government-decision",
        "label": "Appeal Government Decision",
        "href": "/appeal-mail/workflows/appeal-government-decision"
      },
      {
        "slug": "appeal-insurance-claim-denial",
        "label": "Appeal Insurance Claim Denial",
        "href": "/appeal-mail/workflows/appeal-insurance-claim-denial"
      },
      {
        "slug": "appeal-insurance-coverage-denial",
        "label": "Appeal Insurance Coverage Denial",
        "href": "/appeal-mail/workflows/appeal-insurance-coverage-denial"
      },
      {
        "slug": "appeal-life-insurance-denial",
        "label": "Appeal Life Insurance Denial",
        "href": "/appeal-mail/workflows/appeal-life-insurance-denial"
      },
      {
        "slug": "appeal-medicaid-denial",
        "label": "Appeal Medicaid Denial",
        "href": "/appeal-mail/workflows/appeal-medicaid-denial"
      },
      {
        "slug": "appeal-medical-insurance-denial",
        "label": "Appeal Medical Insurance Denial",
        "href": "/appeal-mail/workflows/appeal-medical-insurance-denial"
      },
      {
        "slug": "appeal-medical-necessity-denial",
        "label": "Appeal Medical Necessity Denial",
        "href": "/appeal-mail/workflows/appeal-medical-necessity-denial"
      },
      {
        "slug": "appeal-medicare-claim-denial",
        "label": "Appeal Medicare Claim Denial",
        "href": "/appeal-mail/workflows/appeal-medicare-claim-denial"
      },
      {
        "slug": "appeal-out-of-network-denial",
        "label": "Appeal Out Of Network Denial",
        "href": "/appeal-mail/workflows/appeal-out-of-network-denial"
      },
      {
        "slug": "appeal-prior-authorization-denial",
        "label": "Appeal Prior Authorization Denial",
        "href": "/appeal-mail/workflows/appeal-prior-authorization-denial"
      },
      {
        "slug": "appeal-social-security-decision",
        "label": "Appeal Social Security Decision",
        "href": "/appeal-mail/workflows/appeal-social-security-decision"
      },
      {
        "slug": "appeal-social-security-overpayment",
        "label": "Appeal Social Security Overpayment",
        "href": "/appeal-mail/workflows/appeal-social-security-overpayment"
      },
      {
        "slug": "appeal-ssdi-denial",
        "label": "Appeal SSDI Denial",
        "href": "/appeal-mail/workflows/appeal-ssdi-denial"
      },
      {
        "slug": "appeal-ssi-denial",
        "label": "Appeal SSI Denial",
        "href": "/appeal-mail/workflows/appeal-ssi-denial"
      },
      {
        "slug": "appeal-timely-filing-denial",
        "label": "Appeal Timely Filing Denial",
        "href": "/appeal-mail/workflows/appeal-timely-filing-denial"
      },
      {
        "slug": "appeal-unemployment-denial",
        "label": "Appeal Unemployment Denial",
        "href": "/appeal-mail/workflows/appeal-unemployment-denial"
      },
      {
        "slug": "dmv-suspension-revocation-appeal",
        "label": "DMV Suspension Revocation Appeal",
        "href": "/appeal-mail/workflows/dmv-suspension-revocation-appeal"
      },
      {
        "slug": "fafsa-special-circumstances-appeal",
        "label": "Fafsa Special Circumstances Appeal",
        "href": "/appeal-mail/workflows/fafsa-special-circumstances-appeal"
      },
      {
        "slug": "financial-aid-reinstatement",
        "label": "Financial Aid Reinstatement",
        "href": "/appeal-mail/workflows/financial-aid-reinstatement"
      },
      {
        "slug": "financial-aid-suspension-appeal",
        "label": "Financial Aid Suspension Appeal",
        "href": "/appeal-mail/workflows/financial-aid-suspension-appeal"
      },
      {
        "slug": "license-suspension-appeal",
        "label": "License Suspension Appeal",
        "href": "/appeal-mail/workflows/license-suspension-appeal"
      },
      {
        "slug": "request-reconsideration",
        "label": "Request Reconsideration",
        "href": "/appeal-mail/workflows/request-reconsideration"
      },
      {
        "slug": "respond-insurance-denial-letter",
        "label": "Respond Insurance Denial Letter",
        "href": "/appeal-mail/workflows/respond-insurance-denial-letter"
      },
      {
        "slug": "sap-appeal",
        "label": "SAP Appeal",
        "href": "/appeal-mail/workflows/sap-appeal"
      },
      {
        "slug": "scholarship-appeal",
        "label": "Scholarship Appeal",
        "href": "/appeal-mail/workflows/scholarship-appeal"
      }
    ]
  },
  {
    "id": "benefits-appeal",
    "label": "Benefits Appeal",
    "href": "/benefits-appeal",
    "workflows": [
      {
        "slug": "appeals-council-preparation",
        "label": "Appeals Council Preparation",
        "href": "/benefits-appeal/workflows/appeals-council-preparation"
      },
      {
        "slug": "benefits-deadline-response",
        "label": "Benefits Deadline Response",
        "href": "/benefits-appeal/workflows/benefits-deadline-response"
      },
      {
        "slug": "benefits-evidence-package",
        "label": "Benefits Evidence Package",
        "href": "/benefits-appeal/workflows/benefits-evidence-package"
      },
      {
        "slug": "benefits-hearing-preparation",
        "label": "Benefits Hearing Preparation",
        "href": "/benefits-appeal/workflows/benefits-hearing-preparation"
      },
      {
        "slug": "benefits-reconsideration",
        "label": "Benefits Reconsideration",
        "href": "/benefits-appeal/workflows/benefits-reconsideration"
      },
      {
        "slug": "benefits-supporting-document-submission",
        "label": "Benefits Supporting Document Submission",
        "href": "/benefits-appeal/workflows/benefits-supporting-document-submission"
      },
      {
        "slug": "disability-claim-appeal",
        "label": "Disability Claim Appeal",
        "href": "/benefits-appeal/workflows/disability-claim-appeal"
      },
      {
        "slug": "edd-appeal",
        "label": "Edd Appeal",
        "href": "/benefits-appeal/workflows/edd-appeal"
      },
      {
        "slug": "edd-disqualification-appeal",
        "label": "Edd Disqualification Appeal",
        "href": "/benefits-appeal/workflows/edd-disqualification-appeal"
      },
      {
        "slug": "food-stamp-appeal",
        "label": "Food Stamp Appeal",
        "href": "/benefits-appeal/workflows/food-stamp-appeal"
      },
      {
        "slug": "medicaid-appeal",
        "label": "Medicaid Appeal",
        "href": "/benefits-appeal/workflows/medicaid-appeal"
      },
      {
        "slug": "medicaid-denial-appeal",
        "label": "Medicaid Denial Appeal",
        "href": "/benefits-appeal/workflows/medicaid-denial-appeal"
      },
      {
        "slug": "snap-appeal",
        "label": "Snap Appeal",
        "href": "/benefits-appeal/workflows/snap-appeal"
      },
      {
        "slug": "social-security-decision-appeal",
        "label": "Social Security Decision Appeal",
        "href": "/benefits-appeal/workflows/social-security-decision-appeal"
      },
      {
        "slug": "social-security-non-medical-appeal",
        "label": "Social Security Non Medical Appeal",
        "href": "/benefits-appeal/workflows/social-security-non-medical-appeal"
      },
      {
        "slug": "social-security-overpayment-appeal",
        "label": "Social Security Overpayment Appeal",
        "href": "/benefits-appeal/workflows/social-security-overpayment-appeal"
      },
      {
        "slug": "ssdi-appeal",
        "label": "SSDI Appeal",
        "href": "/benefits-appeal/workflows/ssdi-appeal"
      },
      {
        "slug": "ssdi-appeals-council",
        "label": "SSDI Appeals Council",
        "href": "/benefits-appeal/workflows/ssdi-appeals-council"
      },
      {
        "slug": "ssdi-denial-appeal",
        "label": "SSDI Denial Appeal",
        "href": "/benefits-appeal/workflows/ssdi-denial-appeal"
      },
      {
        "slug": "ssdi-reconsideration",
        "label": "SSDI Reconsideration",
        "href": "/benefits-appeal/workflows/ssdi-reconsideration"
      },
      {
        "slug": "ssi-appeal",
        "label": "SSI Appeal",
        "href": "/benefits-appeal/workflows/ssi-appeal"
      },
      {
        "slug": "ssi-denial-appeal",
        "label": "SSI Denial Appeal",
        "href": "/benefits-appeal/workflows/ssi-denial-appeal"
      },
      {
        "slug": "ssi-overpayment-appeal",
        "label": "SSI Overpayment Appeal",
        "href": "/benefits-appeal/workflows/ssi-overpayment-appeal"
      },
      {
        "slug": "ssi-reconsideration",
        "label": "SSI Reconsideration",
        "href": "/benefits-appeal/workflows/ssi-reconsideration"
      },
      {
        "slug": "unemployment-appeal",
        "label": "Unemployment Appeal",
        "href": "/benefits-appeal/workflows/unemployment-appeal"
      },
      {
        "slug": "unemployment-denial-appeal",
        "label": "Unemployment Denial Appeal",
        "href": "/benefits-appeal/workflows/unemployment-denial-appeal"
      },
      {
        "slug": "unemployment-disqualification-appeal",
        "label": "Unemployment Disqualification Appeal",
        "href": "/benefits-appeal/workflows/unemployment-disqualification-appeal"
      },
      {
        "slug": "unemployment-overpayment-appeal",
        "label": "Unemployment Overpayment Appeal",
        "href": "/benefits-appeal/workflows/unemployment-overpayment-appeal"
      },
      {
        "slug": "va-claim-appeal",
        "label": "VA Claim Appeal",
        "href": "/benefits-appeal/workflows/va-claim-appeal"
      },
      {
        "slug": "workers-compensation-appeal",
        "label": "Workers Compensation Appeal",
        "href": "/benefits-appeal/workflows/workers-compensation-appeal"
      }
    ]
  },
  {
    "id": "claim-proof",
    "label": "Claim Proof",
    "href": "/claim-proof",
    "workflows": [
      {
        "slug": "accident-claim-package",
        "label": "Accident Claim Package",
        "href": "/claim-proof/workflows/accident-claim-package"
      },
      {
        "slug": "auto-insurance-claim-package",
        "label": "Auto Insurance Claim Package",
        "href": "/claim-proof/workflows/auto-insurance-claim-package"
      },
      {
        "slug": "claim-appeal-evidence-package",
        "label": "Claim Appeal Evidence Package",
        "href": "/claim-proof/workflows/claim-appeal-evidence-package"
      },
      {
        "slug": "claim-denial-evidence-package",
        "label": "Claim Denial Evidence Package",
        "href": "/claim-proof/workflows/claim-denial-evidence-package"
      },
      {
        "slug": "claim-evidence-checklist",
        "label": "Claim Evidence Checklist",
        "href": "/claim-proof/workflows/claim-evidence-checklist"
      },
      {
        "slug": "claim-follow-up-package",
        "label": "Claim Follow Up Package",
        "href": "/claim-proof/workflows/claim-follow-up-package"
      },
      {
        "slug": "claim-proof-package",
        "label": "Claim Proof Package",
        "href": "/claim-proof/workflows/claim-proof-package"
      },
      {
        "slug": "claim-reconsideration-package",
        "label": "Claim Reconsideration Package",
        "href": "/claim-proof/workflows/claim-reconsideration-package"
      },
      {
        "slug": "claim-record-proof-of-submission-package",
        "label": "Claim Record Proof Of Submission Package",
        "href": "/claim-proof/workflows/claim-record-proof-of-submission-package"
      },
      {
        "slug": "claim-supporting-documents",
        "label": "Claim Supporting Documents",
        "href": "/claim-proof/workflows/claim-supporting-documents"
      },
      {
        "slug": "claim-timeline-package",
        "label": "Claim Timeline Package",
        "href": "/claim-proof/workflows/claim-timeline-package"
      },
      {
        "slug": "dental-claim-package",
        "label": "Dental Claim Package",
        "href": "/claim-proof/workflows/dental-claim-package"
      },
      {
        "slug": "disability-claim-evidence-package",
        "label": "Disability Claim Evidence Package",
        "href": "/claim-proof/workflows/disability-claim-evidence-package"
      },
      {
        "slug": "health-insurance-claim-package",
        "label": "Health Insurance Claim Package",
        "href": "/claim-proof/workflows/health-insurance-claim-package"
      },
      {
        "slug": "home-insurance-claim-package",
        "label": "Home Insurance Claim Package",
        "href": "/claim-proof/workflows/home-insurance-claim-package"
      },
      {
        "slug": "hospital-indemnity-claim-package",
        "label": "Hospital Indemnity Claim Package",
        "href": "/claim-proof/workflows/hospital-indemnity-claim-package"
      },
      {
        "slug": "insurance-claim-documentation",
        "label": "Insurance Claim Documentation",
        "href": "/claim-proof/workflows/insurance-claim-documentation"
      },
      {
        "slug": "life-insurance-claim-package",
        "label": "Life Insurance Claim Package",
        "href": "/claim-proof/workflows/life-insurance-claim-package"
      },
      {
        "slug": "long-term-disability-claim-package",
        "label": "Long Term Disability Claim Package",
        "href": "/claim-proof/workflows/long-term-disability-claim-package"
      },
      {
        "slug": "medical-insurance-claim-package",
        "label": "Medical Insurance Claim Package",
        "href": "/claim-proof/workflows/medical-insurance-claim-package"
      },
      {
        "slug": "medical-necessity-evidence-package",
        "label": "Medical Necessity Evidence Package",
        "href": "/claim-proof/workflows/medical-necessity-evidence-package"
      },
      {
        "slug": "medicare-claim-package",
        "label": "Medicare Claim Package",
        "href": "/claim-proof/workflows/medicare-claim-package"
      },
      {
        "slug": "out-of-network-evidence-package",
        "label": "Out Of Network Evidence Package",
        "href": "/claim-proof/workflows/out-of-network-evidence-package"
      },
      {
        "slug": "prior-authorization-evidence-package",
        "label": "Prior Authorization Evidence Package",
        "href": "/claim-proof/workflows/prior-authorization-evidence-package"
      },
      {
        "slug": "property-damage-claim-package",
        "label": "Property Damage Claim Package",
        "href": "/claim-proof/workflows/property-damage-claim-package"
      },
      {
        "slug": "provider-claim-submission-package",
        "label": "Provider Claim Submission Package",
        "href": "/claim-proof/workflows/provider-claim-submission-package"
      },
      {
        "slug": "reimbursement-claim-package",
        "label": "Reimbursement Claim Package",
        "href": "/claim-proof/workflows/reimbursement-claim-package"
      },
      {
        "slug": "short-term-disability-claim-package",
        "label": "Short Term Disability Claim Package",
        "href": "/claim-proof/workflows/short-term-disability-claim-package"
      },
      {
        "slug": "travel-claim-package",
        "label": "Travel Claim Package",
        "href": "/claim-proof/workflows/travel-claim-package"
      },
      {
        "slug": "vision-claim-package",
        "label": "Vision Claim Package",
        "href": "/claim-proof/workflows/vision-claim-package"
      }
    ]
  },
  {
    "id": "code-enforcement",
    "label": "Code Enforcement",
    "href": "/code-enforcement",
    "workflows": [
      {
        "slug": "abatement-order-response",
        "label": "Abatement Order Response",
        "href": "/code-enforcement/workflows/abatement-order-response"
      },
      {
        "slug": "administrative-hearing-response",
        "label": "Administrative Hearing Response",
        "href": "/code-enforcement/workflows/administrative-hearing-response"
      },
      {
        "slug": "building-code-violation-response",
        "label": "Building Code Violation Response",
        "href": "/code-enforcement/workflows/building-code-violation-response"
      },
      {
        "slug": "cease-and-desist-response",
        "label": "Cease And Desist Response",
        "href": "/code-enforcement/workflows/cease-and-desist-response"
      },
      {
        "slug": "code-enforcement-appeal",
        "label": "Code Enforcement Appeal",
        "href": "/code-enforcement/workflows/code-enforcement-appeal"
      },
      {
        "slug": "code-enforcement-case-file-package",
        "label": "Code Enforcement Case File Package",
        "href": "/code-enforcement/workflows/code-enforcement-case-file-package"
      },
      {
        "slug": "code-enforcement-evidence-submission",
        "label": "Code Enforcement Evidence Submission",
        "href": "/code-enforcement/workflows/code-enforcement-evidence-submission"
      },
      {
        "slug": "code-enforcement-notice-response",
        "label": "Code Enforcement Notice Response",
        "href": "/code-enforcement/workflows/code-enforcement-notice-response"
      },
      {
        "slug": "code-enforcement-records-request",
        "label": "Code Enforcement Records Request",
        "href": "/code-enforcement/workflows/code-enforcement-records-request"
      },
      {
        "slug": "code-violation-notice-response",
        "label": "Code Violation Notice Response",
        "href": "/code-enforcement/workflows/code-violation-notice-response"
      },
      {
        "slug": "complaint-records-request",
        "label": "Complaint Records Request",
        "href": "/code-enforcement/workflows/complaint-records-request"
      },
      {
        "slug": "compliance-order-response",
        "label": "Compliance Order Response",
        "href": "/code-enforcement/workflows/compliance-order-response"
      },
      {
        "slug": "compliance-plan-response",
        "label": "Compliance Plan Response",
        "href": "/code-enforcement/workflows/compliance-plan-response"
      },
      {
        "slug": "correction-notice-response",
        "label": "Correction Notice Response",
        "href": "/code-enforcement/workflows/correction-notice-response"
      },
      {
        "slug": "deadline-extension-request",
        "label": "Deadline Extension Request",
        "href": "/code-enforcement/workflows/deadline-extension-request"
      },
      {
        "slug": "follow-up-after-compliance-submission",
        "label": "Follow Up After Compliance Submission",
        "href": "/code-enforcement/workflows/follow-up-after-compliance-submission"
      },
      {
        "slug": "inspection-access-response",
        "label": "Inspection Access Response",
        "href": "/code-enforcement/workflows/inspection-access-response"
      },
      {
        "slug": "inspection-notice-response",
        "label": "Inspection Notice Response",
        "href": "/code-enforcement/workflows/inspection-notice-response"
      },
      {
        "slug": "inspection-records-request",
        "label": "Inspection Records Request",
        "href": "/code-enforcement/workflows/inspection-records-request"
      },
      {
        "slug": "inspection-warrant-response",
        "label": "Inspection Warrant Response",
        "href": "/code-enforcement/workflows/inspection-warrant-response"
      },
      {
        "slug": "junk-vehicle-violation-response",
        "label": "Junk Vehicle Violation Response",
        "href": "/code-enforcement/workflows/junk-vehicle-violation-response"
      },
      {
        "slug": "land-use-violation-response",
        "label": "Land Use Violation Response",
        "href": "/code-enforcement/workflows/land-use-violation-response"
      },
      {
        "slug": "notice-of-violation-response",
        "label": "Notice Of Violation Response",
        "href": "/code-enforcement/workflows/notice-of-violation-response"
      },
      {
        "slug": "nuisance-violation-response",
        "label": "Nuisance Violation Response",
        "href": "/code-enforcement/workflows/nuisance-violation-response"
      },
      {
        "slug": "property-maintenance-violation-response",
        "label": "Property Maintenance Violation Response",
        "href": "/code-enforcement/workflows/property-maintenance-violation-response"
      },
      {
        "slug": "request-to-correct-inspection-record",
        "label": "Request To Correct Inspection Record",
        "href": "/code-enforcement/workflows/request-to-correct-inspection-record"
      },
      {
        "slug": "request-to-search-property-response",
        "label": "Request To Search Property Response",
        "href": "/code-enforcement/workflows/request-to-search-property-response"
      },
      {
        "slug": "solid-waste-violation-response",
        "label": "Solid Waste Violation Response",
        "href": "/code-enforcement/workflows/solid-waste-violation-response"
      },
      {
        "slug": "unpermitted-structure-response",
        "label": "Unpermitted Structure Response",
        "href": "/code-enforcement/workflows/unpermitted-structure-response"
      },
      {
        "slug": "zoning-violation-response",
        "label": "Zoning Violation Response",
        "href": "/code-enforcement/workflows/zoning-violation-response"
      }
    ]
  },
  {
    "id": "dispute-mail",
    "label": "Dispute Mail",
    "href": "/dispute-mail",
    "workflows": [
      {
        "slug": "billing-error-dispute",
        "label": "Billing Error Dispute",
        "href": "/dispute-mail/workflows/billing-error-dispute"
      },
      {
        "slug": "cease-contact-request",
        "label": "Cease Contact Request",
        "href": "/dispute-mail/workflows/cease-contact-request"
      },
      {
        "slug": "charge-off-dispute",
        "label": "Charge Off Dispute",
        "href": "/dispute-mail/workflows/charge-off-dispute"
      },
      {
        "slug": "consumer-evidence-package",
        "label": "Consumer Evidence Package",
        "href": "/dispute-mail/workflows/consumer-evidence-package"
      },
      {
        "slug": "credit-bureau-dispute-package",
        "label": "Credit Bureau Dispute Package",
        "href": "/dispute-mail/workflows/credit-bureau-dispute-package"
      },
      {
        "slug": "credit-card-billing-dispute",
        "label": "Credit Card Billing Dispute",
        "href": "/dispute-mail/workflows/credit-card-billing-dispute"
      },
      {
        "slug": "credit-report-collections-dispute",
        "label": "Credit Report Collections Dispute",
        "href": "/dispute-mail/workflows/credit-report-collections-dispute"
      },
      {
        "slug": "credit-report-error-dispute",
        "label": "Credit Report Error Dispute",
        "href": "/dispute-mail/workflows/credit-report-error-dispute"
      },
      {
        "slug": "debt-collection-dispute",
        "label": "Debt Collection Dispute",
        "href": "/dispute-mail/workflows/debt-collection-dispute"
      },
      {
        "slug": "debt-communication-documentation",
        "label": "Debt Communication Documentation",
        "href": "/dispute-mail/workflows/debt-communication-documentation"
      },
      {
        "slug": "debt-dispute",
        "label": "Debt Dispute",
        "href": "/dispute-mail/workflows/debt-dispute"
      },
      {
        "slug": "debt-validation",
        "label": "Debt Validation",
        "href": "/dispute-mail/workflows/debt-validation"
      },
      {
        "slug": "dispute-collection-account",
        "label": "Dispute Collection Account",
        "href": "/dispute-mail/workflows/dispute-collection-account"
      },
      {
        "slug": "dispute-collection-agency",
        "label": "Dispute Collection Agency",
        "href": "/dispute-mail/workflows/dispute-collection-agency"
      },
      {
        "slug": "dispute-collections-on-credit-report",
        "label": "Dispute Collections On Credit Report",
        "href": "/dispute-mail/workflows/dispute-collections-on-credit-report"
      },
      {
        "slug": "dispute-with-collection-agency",
        "label": "Dispute With Collection Agency",
        "href": "/dispute-mail/workflows/dispute-with-collection-agency"
      },
      {
        "slug": "dispute-with-creditor",
        "label": "Dispute With Creditor",
        "href": "/dispute-mail/workflows/dispute-with-creditor"
      },
      {
        "slug": "dispute-with-debt-buyer",
        "label": "Dispute With Debt Buyer",
        "href": "/dispute-mail/workflows/dispute-with-debt-buyer"
      },
      {
        "slug": "escalate-unresolved-dispute",
        "label": "Escalate Unresolved Dispute",
        "href": "/dispute-mail/workflows/escalate-unresolved-dispute"
      },
      {
        "slug": "fdcpa-dispute",
        "label": "FDCPA Dispute",
        "href": "/dispute-mail/workflows/fdcpa-dispute"
      },
      {
        "slug": "follow-up-on-unanswered-dispute",
        "label": "Follow Up On Unanswered Dispute",
        "href": "/dispute-mail/workflows/follow-up-on-unanswered-dispute"
      },
      {
        "slug": "hard-inquiry-dispute",
        "label": "Hard Inquiry Dispute",
        "href": "/dispute-mail/workflows/hard-inquiry-dispute"
      },
      {
        "slug": "insurance-billing-dispute",
        "label": "Insurance Billing Dispute",
        "href": "/dispute-mail/workflows/insurance-billing-dispute"
      },
      {
        "slug": "insurance-payment-dispute",
        "label": "Insurance Payment Dispute",
        "href": "/dispute-mail/workflows/insurance-payment-dispute"
      },
      {
        "slug": "medical-collections-dispute",
        "label": "Medical Collections Dispute",
        "href": "/dispute-mail/workflows/medical-collections-dispute"
      },
      {
        "slug": "medical-debt-dispute",
        "label": "Medical Debt Dispute",
        "href": "/dispute-mail/workflows/medical-debt-dispute"
      },
      {
        "slug": "service-contract-dispute",
        "label": "Service Contract Dispute",
        "href": "/dispute-mail/workflows/service-contract-dispute"
      },
      {
        "slug": "student-loan-account-dispute",
        "label": "Student Loan Account Dispute",
        "href": "/dispute-mail/workflows/student-loan-account-dispute"
      },
      {
        "slug": "subscription-charge-dispute",
        "label": "Subscription Charge Dispute",
        "href": "/dispute-mail/workflows/subscription-charge-dispute"
      },
      {
        "slug": "unauthorized-charge-dispute",
        "label": "Unauthorized Charge Dispute",
        "href": "/dispute-mail/workflows/unauthorized-charge-dispute"
      }
    ]
  },
  {
    "id": "immigration-mail",
    "label": "Immigration Mail",
    "href": "/immigration-mail",
    "workflows": [
      {
        "slug": "biometrics-appointment-correspondence",
        "label": "Biometrics Appointment Correspondence",
        "href": "/immigration-mail/workflows/biometrics-appointment-correspondence"
      },
      {
        "slug": "case-evidence-package",
        "label": "Case Evidence Package",
        "href": "/immigration-mail/workflows/case-evidence-package"
      },
      {
        "slug": "eb-1-rfe-response",
        "label": "Eb 1 RFE Response",
        "href": "/immigration-mail/workflows/eb-1-rfe-response"
      },
      {
        "slug": "h-1b-rfe-response",
        "label": "H 1b RFE Response",
        "href": "/immigration-mail/workflows/h-1b-rfe-response"
      },
      {
        "slug": "i-140-rfe-response",
        "label": "I 140 RFE Response",
        "href": "/immigration-mail/workflows/i-140-rfe-response"
      },
      {
        "slug": "i-485-rfe-response",
        "label": "I 485 RFE Response",
        "href": "/immigration-mail/workflows/i-485-rfe-response"
      },
      {
        "slug": "immigration-affidavit-package",
        "label": "Immigration Affidavit Package",
        "href": "/immigration-mail/workflows/immigration-affidavit-package"
      },
      {
        "slug": "immigration-deadline-response",
        "label": "Immigration Deadline Response",
        "href": "/immigration-mail/workflows/immigration-deadline-response"
      },
      {
        "slug": "immigration-filing-cover-letter",
        "label": "Immigration Filing Cover Letter",
        "href": "/immigration-mail/workflows/immigration-filing-cover-letter"
      },
      {
        "slug": "immigration-mailing-proof-package",
        "label": "Immigration Mailing Proof Package",
        "href": "/immigration-mail/workflows/immigration-mailing-proof-package"
      },
      {
        "slug": "l-1-rfe-response",
        "label": "L 1 RFE Response",
        "href": "/immigration-mail/workflows/l-1-rfe-response"
      },
      {
        "slug": "medical-rfe-response",
        "label": "Medical RFE Response",
        "href": "/immigration-mail/workflows/medical-rfe-response"
      },
      {
        "slug": "n-400-rfe-response",
        "label": "N 400 RFE Response",
        "href": "/immigration-mail/workflows/n-400-rfe-response"
      },
      {
        "slug": "niw-rfe-response",
        "label": "NIW RFE Response",
        "href": "/immigration-mail/workflows/niw-rfe-response"
      },
      {
        "slug": "notice-of-intent-to-deny-response",
        "label": "Notice Of Intent To Deny Response",
        "href": "/immigration-mail/workflows/notice-of-intent-to-deny-response"
      },
      {
        "slug": "notice-of-intent-to-revoke-response",
        "label": "Notice Of Intent To Revoke Response",
        "href": "/immigration-mail/workflows/notice-of-intent-to-revoke-response"
      },
      {
        "slug": "request-for-evidence-response",
        "label": "Request For Evidence Response",
        "href": "/immigration-mail/workflows/request-for-evidence-response"
      },
      {
        "slug": "request-for-reconsideration",
        "label": "Request For Reconsideration",
        "href": "/immigration-mail/workflows/request-for-reconsideration"
      },
      {
        "slug": "respond-immigration-notice",
        "label": "Respond Immigration Notice",
        "href": "/immigration-mail/workflows/respond-immigration-notice"
      },
      {
        "slug": "rfe-cover-letter",
        "label": "RFE Cover Letter",
        "href": "/immigration-mail/workflows/rfe-cover-letter"
      },
      {
        "slug": "rfe-response-letter",
        "label": "RFE Response Letter",
        "href": "/immigration-mail/workflows/rfe-response-letter"
      },
      {
        "slug": "submit-supporting-documents-to-uscis",
        "label": "Submit Supporting Documents To USCIS",
        "href": "/immigration-mail/workflows/submit-supporting-documents-to-uscis"
      },
      {
        "slug": "supplemental-evidence-submission",
        "label": "Supplemental Evidence Submission",
        "href": "/immigration-mail/workflows/supplemental-evidence-submission"
      },
      {
        "slug": "translation-certified-translation-package",
        "label": "Translation Certified Translation Package",
        "href": "/immigration-mail/workflows/translation-certified-translation-package"
      },
      {
        "slug": "uscis-evidence-submission",
        "label": "USCIS Evidence Submission",
        "href": "/immigration-mail/workflows/uscis-evidence-submission"
      },
      {
        "slug": "uscis-explanation-letter",
        "label": "USCIS Explanation Letter",
        "href": "/immigration-mail/workflows/uscis-explanation-letter"
      },
      {
        "slug": "uscis-follow-up-after-submission",
        "label": "USCIS Follow Up After Submission",
        "href": "/immigration-mail/workflows/uscis-follow-up-after-submission"
      },
      {
        "slug": "uscis-missing-evidence-response",
        "label": "USCIS Missing Evidence Response",
        "href": "/immigration-mail/workflows/uscis-missing-evidence-response"
      },
      {
        "slug": "uscis-notice-of-intent-response",
        "label": "USCIS Notice Of Intent Response",
        "href": "/immigration-mail/workflows/uscis-notice-of-intent-response"
      },
      {
        "slug": "uscis-rfe-response",
        "label": "USCIS RFE Response",
        "href": "/immigration-mail/workflows/uscis-rfe-response"
      }
    ]
  },
  {
    "id": "insurance-claims",
    "label": "Insurance Claims",
    "href": "/insurance-claims",
    "workflows": [
      {
        "slug": "auto-insurance-claim",
        "label": "Auto Insurance Claim",
        "href": "/insurance-claims/workflows/auto-insurance-claim"
      },
      {
        "slug": "business-interruption-claim",
        "label": "Business Interruption Claim",
        "href": "/insurance-claims/workflows/business-interruption-claim"
      },
      {
        "slug": "claim-documentation-package",
        "label": "Claim Documentation Package",
        "href": "/insurance-claims/workflows/claim-documentation-package"
      },
      {
        "slug": "commercial-property-claim",
        "label": "Commercial Property Claim",
        "href": "/insurance-claims/workflows/commercial-property-claim"
      },
      {
        "slug": "coverage-denial",
        "label": "Coverage Denial",
        "href": "/insurance-claims/workflows/coverage-denial"
      },
      {
        "slug": "denied-auto-insurance-claim",
        "label": "Denied Auto Insurance Claim",
        "href": "/insurance-claims/workflows/denied-auto-insurance-claim"
      },
      {
        "slug": "denied-insurance-claim",
        "label": "Denied Insurance Claim",
        "href": "/insurance-claims/workflows/denied-insurance-claim"
      },
      {
        "slug": "denied-life-insurance-claim",
        "label": "Denied Life Insurance Claim",
        "href": "/insurance-claims/workflows/denied-life-insurance-claim"
      },
      {
        "slug": "disability-insurance-claim",
        "label": "Disability Insurance Claim",
        "href": "/insurance-claims/workflows/disability-insurance-claim"
      },
      {
        "slug": "disability-insurance-denial",
        "label": "Disability Insurance Denial",
        "href": "/insurance-claims/workflows/disability-insurance-denial"
      },
      {
        "slug": "dispute-insurance-claim",
        "label": "Dispute Insurance Claim",
        "href": "/insurance-claims/workflows/dispute-insurance-claim"
      },
      {
        "slug": "fire-smoke-damage-claim",
        "label": "Fire Smoke Damage Claim",
        "href": "/insurance-claims/workflows/fire-smoke-damage-claim"
      },
      {
        "slug": "flood-damage-insurance-claim",
        "label": "Flood Damage Insurance Claim",
        "href": "/insurance-claims/workflows/flood-damage-insurance-claim"
      },
      {
        "slug": "hail-damage-insurance-claim",
        "label": "Hail Damage Insurance Claim",
        "href": "/insurance-claims/workflows/hail-damage-insurance-claim"
      },
      {
        "slug": "health-insurance-claim",
        "label": "Health Insurance Claim",
        "href": "/insurance-claims/workflows/health-insurance-claim"
      },
      {
        "slug": "homeowners-insurance-claim",
        "label": "Homeowners Insurance Claim",
        "href": "/insurance-claims/workflows/homeowners-insurance-claim"
      },
      {
        "slug": "insurance-claim-appeal",
        "label": "Insurance Claim Appeal",
        "href": "/insurance-claims/workflows/insurance-claim-appeal"
      },
      {
        "slug": "insurance-claim-evidence-package",
        "label": "Insurance Claim Evidence Package",
        "href": "/insurance-claims/workflows/insurance-claim-evidence-package"
      },
      {
        "slug": "insurance-claim-follow-up",
        "label": "Insurance Claim Follow Up",
        "href": "/insurance-claims/workflows/insurance-claim-follow-up"
      },
      {
        "slug": "life-insurance-claim",
        "label": "Life Insurance Claim",
        "href": "/insurance-claims/workflows/life-insurance-claim"
      },
      {
        "slug": "long-term-disability-claim",
        "label": "Long Term Disability Claim",
        "href": "/insurance-claims/workflows/long-term-disability-claim"
      },
      {
        "slug": "medical-insurance-denial",
        "label": "Medical Insurance Denial",
        "href": "/insurance-claims/workflows/medical-insurance-denial"
      },
      {
        "slug": "prepare-insurance-claim",
        "label": "Prepare Insurance Claim",
        "href": "/insurance-claims/workflows/prepare-insurance-claim"
      },
      {
        "slug": "property-damage-insurance-claim",
        "label": "Property Damage Insurance Claim",
        "href": "/insurance-claims/workflows/property-damage-insurance-claim"
      },
      {
        "slug": "roof-damage-insurance-claim",
        "label": "Roof Damage Insurance Claim",
        "href": "/insurance-claims/workflows/roof-damage-insurance-claim"
      },
      {
        "slug": "short-term-disability-claim",
        "label": "Short Term Disability Claim",
        "href": "/insurance-claims/workflows/short-term-disability-claim"
      },
      {
        "slug": "storm-damage-insurance-claim",
        "label": "Storm Damage Insurance Claim",
        "href": "/insurance-claims/workflows/storm-damage-insurance-claim"
      },
      {
        "slug": "theft-vandalism-claim",
        "label": "Theft Vandalism Claim",
        "href": "/insurance-claims/workflows/theft-vandalism-claim"
      },
      {
        "slug": "underpaid-insurance-claim",
        "label": "Underpaid Insurance Claim",
        "href": "/insurance-claims/workflows/underpaid-insurance-claim"
      },
      {
        "slug": "water-damage-insurance-claim",
        "label": "Water Damage Insurance Claim",
        "href": "/insurance-claims/workflows/water-damage-insurance-claim"
      }
    ]
  },
  {
    "id": "legal-defense",
    "label": "Legal Defense",
    "href": "/legal-defense",
    "workflows": [
      {
        "slug": "arrest-timeline-reconstruction",
        "label": "Arrest Timeline Reconstruction",
        "href": "/legal-defense/workflows/arrest-timeline-reconstruction"
      },
      {
        "slug": "attorney-case-brief",
        "label": "Attorney Case Brief",
        "href": "/legal-defense/workflows/attorney-case-brief"
      },
      {
        "slug": "body-camera-evidence-review",
        "label": "Body Camera Evidence Review",
        "href": "/legal-defense/workflows/body-camera-evidence-review"
      },
      {
        "slug": "charging-document-analysis",
        "label": "Charging Document Analysis",
        "href": "/legal-defense/workflows/charging-document-analysis"
      },
      {
        "slug": "consent-search-dispute",
        "label": "Consent Search Dispute",
        "href": "/legal-defense/workflows/consent-search-dispute"
      },
      {
        "slug": "court-records-request",
        "label": "Court Records Request",
        "href": "/legal-defense/workflows/court-records-request"
      },
      {
        "slug": "criminal-case-timeline",
        "label": "Criminal Case Timeline",
        "href": "/legal-defense/workflows/criminal-case-timeline"
      },
      {
        "slug": "dash-camera-evidence-review",
        "label": "Dash Camera Evidence Review",
        "href": "/legal-defense/workflows/dash-camera-evidence-review"
      },
      {
        "slug": "defense-evidence-package",
        "label": "Defense Evidence Package",
        "href": "/legal-defense/workflows/defense-evidence-package"
      },
      {
        "slug": "defense-intelligence-packet",
        "label": "Defense Intelligence Packet",
        "href": "/legal-defense/workflows/defense-intelligence-packet"
      },
      {
        "slug": "discovery-deficiency-follow-up",
        "label": "Discovery Deficiency Follow Up",
        "href": "/legal-defense/workflows/discovery-deficiency-follow-up"
      },
      {
        "slug": "discovery-request-package",
        "label": "Discovery Request Package",
        "href": "/legal-defense/workflows/discovery-request-package"
      },
      {
        "slug": "dispatch-911-records-review",
        "label": "Dispatch 911 Records Review",
        "href": "/legal-defense/workflows/dispatch-911-records-review"
      },
      {
        "slug": "evidence-chain-of-custody-review",
        "label": "Evidence Chain Of Custody Review",
        "href": "/legal-defense/workflows/evidence-chain-of-custody-review"
      },
      {
        "slug": "exculpatory-evidence-tracker",
        "label": "Exculpatory Evidence Tracker",
        "href": "/legal-defense/workflows/exculpatory-evidence-tracker"
      },
      {
        "slug": "expert-evidence-organizer",
        "label": "Expert Evidence Organizer",
        "href": "/legal-defense/workflows/expert-evidence-organizer"
      },
      {
        "slug": "impeachment-evidence-tracker",
        "label": "Impeachment Evidence Tracker",
        "href": "/legal-defense/workflows/impeachment-evidence-tracker"
      },
      {
        "slug": "motion-issue-spotter",
        "label": "Motion Issue Spotter",
        "href": "/legal-defense/workflows/motion-issue-spotter"
      },
      {
        "slug": "officer-statement-comparison",
        "label": "Officer Statement Comparison",
        "href": "/legal-defense/workflows/officer-statement-comparison"
      },
      {
        "slug": "police-records-request",
        "label": "Police Records Request",
        "href": "/legal-defense/workflows/police-records-request"
      },
      {
        "slug": "police-report-analysis",
        "label": "Police Report Analysis",
        "href": "/legal-defense/workflows/police-report-analysis"
      },
      {
        "slug": "probable-cause-review",
        "label": "Probable Cause Review",
        "href": "/legal-defense/workflows/probable-cause-review"
      },
      {
        "slug": "stolen-vehicle-arrest-defense",
        "label": "Stolen Vehicle Arrest Defense",
        "href": "/legal-defense/workflows/stolen-vehicle-arrest-defense"
      },
      {
        "slug": "suppression-issue-builder",
        "label": "Suppression Issue Builder",
        "href": "/legal-defense/workflows/suppression-issue-builder"
      },
      {
        "slug": "traffic-stop-evidence-review",
        "label": "Traffic Stop Evidence Review",
        "href": "/legal-defense/workflows/traffic-stop-evidence-review"
      },
      {
        "slug": "unlawful-search-and-seizure",
        "label": "Unlawful Search And Seizure",
        "href": "/legal-defense/workflows/unlawful-search-and-seizure"
      },
      {
        "slug": "vehicle-search-defense",
        "label": "Vehicle Search Defense",
        "href": "/legal-defense/workflows/vehicle-search-defense"
      },
      {
        "slug": "warrant-validity-review",
        "label": "Warrant Validity Review",
        "href": "/legal-defense/workflows/warrant-validity-review"
      },
      {
        "slug": "witness-statement-analysis",
        "label": "Witness Statement Analysis",
        "href": "/legal-defense/workflows/witness-statement-analysis"
      },
      {
        "slug": "wrongful-arrest-case-builder",
        "label": "Wrongful Arrest Case Builder",
        "href": "/legal-defense/workflows/wrongful-arrest-case-builder"
      }
    ]
  },
  {
    "id": "notice-respond",
    "label": "Notice Respond",
    "href": "/notice-respond",
    "workflows": [
      {
        "slug": "administrative-hearing-notice-response",
        "label": "Administrative Hearing Notice Response",
        "href": "/notice-respond/workflows/administrative-hearing-notice-response"
      },
      {
        "slug": "agency-action-response",
        "label": "Agency Action Response",
        "href": "/notice-respond/workflows/agency-action-response"
      },
      {
        "slug": "appeal-after-notice",
        "label": "Appeal After Notice",
        "href": "/notice-respond/workflows/appeal-after-notice"
      },
      {
        "slug": "benefits-notice-response",
        "label": "Benefits Notice Response",
        "href": "/notice-respond/workflows/benefits-notice-response"
      },
      {
        "slug": "civil-summons-response",
        "label": "Civil Summons Response",
        "href": "/notice-respond/workflows/civil-summons-response"
      },
      {
        "slug": "compliance-notice-response",
        "label": "Compliance Notice Response",
        "href": "/notice-respond/workflows/compliance-notice-response"
      },
      {
        "slug": "court-summons-response",
        "label": "Court Summons Response",
        "href": "/notice-respond/workflows/court-summons-response"
      },
      {
        "slug": "cp2000-response",
        "label": "CP2000 Response",
        "href": "/notice-respond/workflows/cp2000-response"
      },
      {
        "slug": "cp3219a-response",
        "label": "Cp3219a Response",
        "href": "/notice-respond/workflows/cp3219a-response"
      },
      {
        "slug": "cp504-response",
        "label": "CP504 Response",
        "href": "/notice-respond/workflows/cp504-response"
      },
      {
        "slug": "cp90-collection-notice-response",
        "label": "Cp90 Collection Notice Response",
        "href": "/notice-respond/workflows/cp90-collection-notice-response"
      },
      {
        "slug": "deadline-extension-request",
        "label": "Deadline Extension Request",
        "href": "/notice-respond/workflows/deadline-extension-request"
      },
      {
        "slug": "document-request-response",
        "label": "Document Request Response",
        "href": "/notice-respond/workflows/document-request-response"
      },
      {
        "slug": "evidence-request-response",
        "label": "Evidence Request Response",
        "href": "/notice-respond/workflows/evidence-request-response"
      },
      {
        "slug": "follow-up-after-notice-submission",
        "label": "Follow Up After Notice Submission",
        "href": "/notice-respond/workflows/follow-up-after-notice-submission"
      },
      {
        "slug": "government-notice-response",
        "label": "Government Notice Response",
        "href": "/notice-respond/workflows/government-notice-response"
      },
      {
        "slug": "irs-30-day-letter-response",
        "label": "IRS 30 Day Letter Response",
        "href": "/notice-respond/workflows/irs-30-day-letter-response"
      },
      {
        "slug": "irs-audit-letter-response",
        "label": "IRS Audit Letter Response",
        "href": "/notice-respond/workflows/irs-audit-letter-response"
      },
      {
        "slug": "irs-balance-due-notice-response",
        "label": "IRS Balance Due Notice Response",
        "href": "/notice-respond/workflows/irs-balance-due-notice-response"
      },
      {
        "slug": "irs-identity-information-notice-response",
        "label": "IRS Identity Information Notice Response",
        "href": "/notice-respond/workflows/irs-identity-information-notice-response"
      },
      {
        "slug": "irs-income-tax-notice-response",
        "label": "IRS Income Tax Notice Response",
        "href": "/notice-respond/workflows/irs-income-tax-notice-response"
      },
      {
        "slug": "irs-notice-response",
        "label": "IRS Notice Response",
        "href": "/notice-respond/workflows/irs-notice-response"
      },
      {
        "slug": "irs-penalty-notice-response",
        "label": "IRS Penalty Notice Response",
        "href": "/notice-respond/workflows/irs-penalty-notice-response"
      },
      {
        "slug": "irs-underreporter-notice-response",
        "label": "IRS Underreporter Notice Response",
        "href": "/notice-respond/workflows/irs-underreporter-notice-response"
      },
      {
        "slug": "licensing-notice-response",
        "label": "Licensing Notice Response",
        "href": "/notice-respond/workflows/licensing-notice-response"
      },
      {
        "slug": "notice-disagreement-response",
        "label": "Notice Disagreement Response",
        "href": "/notice-respond/workflows/notice-disagreement-response"
      },
      {
        "slug": "regulatory-deficiency-notice-response",
        "label": "Regulatory Deficiency Notice Response",
        "href": "/notice-respond/workflows/regulatory-deficiency-notice-response"
      },
      {
        "slug": "state-revenue-department-notice-response",
        "label": "State Revenue Department Notice Response",
        "href": "/notice-respond/workflows/state-revenue-department-notice-response"
      },
      {
        "slug": "state-tax-notice-response",
        "label": "State Tax Notice Response",
        "href": "/notice-respond/workflows/state-tax-notice-response"
      },
      {
        "slug": "unemployment-notice-response",
        "label": "Unemployment Notice Response",
        "href": "/notice-respond/workflows/unemployment-notice-response"
      }
    ]
  },
  {
    "id": "permit-reply",
    "label": "Permit Reply",
    "href": "/permit-reply",
    "workflows": [
      {
        "slug": "building-permit-correction-response",
        "label": "Building Permit Correction Response",
        "href": "/permit-reply/workflows/building-permit-correction-response"
      },
      {
        "slug": "building-permit-denial-response",
        "label": "Building Permit Denial Response",
        "href": "/permit-reply/workflows/building-permit-denial-response"
      },
      {
        "slug": "building-permit-response",
        "label": "Building Permit Response",
        "href": "/permit-reply/workflows/building-permit-response"
      },
      {
        "slug": "certificate-of-occupancy-response",
        "label": "Certificate Of Occupancy Response",
        "href": "/permit-reply/workflows/certificate-of-occupancy-response"
      },
      {
        "slug": "commercial-building-permit",
        "label": "Commercial Building Permit",
        "href": "/permit-reply/workflows/commercial-building-permit"
      },
      {
        "slug": "construction-permit-response",
        "label": "Construction Permit Response",
        "href": "/permit-reply/workflows/construction-permit-response"
      },
      {
        "slug": "deck-permit-response",
        "label": "Deck Permit Response",
        "href": "/permit-reply/workflows/deck-permit-response"
      },
      {
        "slug": "demolition-permit-response",
        "label": "Demolition Permit Response",
        "href": "/permit-reply/workflows/demolition-permit-response"
      },
      {
        "slug": "electrical-permit-response",
        "label": "Electrical Permit Response",
        "href": "/permit-reply/workflows/electrical-permit-response"
      },
      {
        "slug": "fence-permit-response",
        "label": "Fence Permit Response",
        "href": "/permit-reply/workflows/fence-permit-response"
      },
      {
        "slug": "hvac-permit-response",
        "label": "Hvac Permit Response",
        "href": "/permit-reply/workflows/hvac-permit-response"
      },
      {
        "slug": "land-development-permit",
        "label": "Land Development Permit",
        "href": "/permit-reply/workflows/land-development-permit"
      },
      {
        "slug": "mechanical-permit-response",
        "label": "Mechanical Permit Response",
        "href": "/permit-reply/workflows/mechanical-permit-response"
      },
      {
        "slug": "nonconforming-use-permit",
        "label": "Nonconforming Use Permit",
        "href": "/permit-reply/workflows/nonconforming-use-permit"
      },
      {
        "slug": "occupancy-permit-response",
        "label": "Occupancy Permit Response",
        "href": "/permit-reply/workflows/occupancy-permit-response"
      },
      {
        "slug": "permit-appeal-administrative-response",
        "label": "Permit Appeal Administrative Response",
        "href": "/permit-reply/workflows/permit-appeal-administrative-response"
      },
      {
        "slug": "permit-deficiency-response",
        "label": "Permit Deficiency Response",
        "href": "/permit-reply/workflows/permit-deficiency-response"
      },
      {
        "slug": "permit-document-submission",
        "label": "Permit Document Submission",
        "href": "/permit-reply/workflows/permit-document-submission"
      },
      {
        "slug": "permit-evidence-package",
        "label": "Permit Evidence Package",
        "href": "/permit-reply/workflows/permit-evidence-package"
      },
      {
        "slug": "permit-reconsideration",
        "label": "Permit Reconsideration",
        "href": "/permit-reply/workflows/permit-reconsideration"
      },
      {
        "slug": "permit-status-tracking-request",
        "label": "Permit Status Tracking Request",
        "href": "/permit-reply/workflows/permit-status-tracking-request"
      },
      {
        "slug": "plumbing-permit-response",
        "label": "Plumbing Permit Response",
        "href": "/permit-reply/workflows/plumbing-permit-response"
      },
      {
        "slug": "reroof-permit-response",
        "label": "Reroof Permit Response",
        "href": "/permit-reply/workflows/reroof-permit-response"
      },
      {
        "slug": "residential-building-permit",
        "label": "Residential Building Permit",
        "href": "/permit-reply/workflows/residential-building-permit"
      },
      {
        "slug": "roofing-permit-response",
        "label": "Roofing Permit Response",
        "href": "/permit-reply/workflows/roofing-permit-response"
      },
      {
        "slug": "site-development-permit",
        "label": "Site Development Permit",
        "href": "/permit-reply/workflows/site-development-permit"
      },
      {
        "slug": "temporary-structure-permit",
        "label": "Temporary Structure Permit",
        "href": "/permit-reply/workflows/temporary-structure-permit"
      },
      {
        "slug": "temporary-use-permit",
        "label": "Temporary Use Permit",
        "href": "/permit-reply/workflows/temporary-use-permit"
      },
      {
        "slug": "utility-permit-response",
        "label": "Utility Permit Response",
        "href": "/permit-reply/workflows/utility-permit-response"
      },
      {
        "slug": "zoning-permit-response",
        "label": "Zoning Permit Response",
        "href": "/permit-reply/workflows/zoning-permit-response"
      }
    ]
  },
  {
    "id": "private-office",
    "label": "Private Office",
    "href": "/private-office",
    "workflows": [
      {
        "slug": "bank-fraud-dispute",
        "label": "Bank Fraud Dispute",
        "href": "/private-office/workflows/bank-fraud-dispute"
      },
      {
        "slug": "bank-wire-transfer-dispute",
        "label": "Bank Wire Transfer Dispute",
        "href": "/private-office/workflows/bank-wire-transfer-dispute"
      },
      {
        "slug": "beneficiary-information-request",
        "label": "Beneficiary Information Request",
        "href": "/private-office/workflows/beneficiary-information-request"
      },
      {
        "slug": "construction-payment-dispute",
        "label": "Construction Payment Dispute",
        "href": "/private-office/workflows/construction-payment-dispute"
      },
      {
        "slug": "contractor-defect-dispute",
        "label": "Contractor Defect Dispute",
        "href": "/private-office/workflows/contractor-defect-dispute"
      },
      {
        "slug": "contractor-dispute",
        "label": "Contractor Dispute",
        "href": "/private-office/workflows/contractor-dispute"
      },
      {
        "slug": "estate-property-dispute",
        "label": "Estate Property Dispute",
        "href": "/private-office/workflows/estate-property-dispute"
      },
      {
        "slug": "evidence-preservation-notice",
        "label": "Evidence Preservation Notice",
        "href": "/private-office/workflows/evidence-preservation-notice"
      },
      {
        "slug": "fiduciary-duty-concern",
        "label": "Fiduciary Duty Concern",
        "href": "/private-office/workflows/fiduciary-duty-concern"
      },
      {
        "slug": "formal-demand-letter",
        "label": "Formal Demand Letter",
        "href": "/private-office/workflows/formal-demand-letter"
      },
      {
        "slug": "government-accountability-investigation",
        "label": "Government Accountability Investigation",
        "href": "/private-office/workflows/government-accountability-investigation"
      },
      {
        "slug": "government-accusation-defense",
        "label": "Government Accusation Defense",
        "href": "/private-office/workflows/government-accusation-defense"
      },
      {
        "slug": "high-value-purchase-dispute",
        "label": "High Value Purchase Dispute",
        "href": "/private-office/workflows/high-value-purchase-dispute"
      },
      {
        "slug": "home-repair-dispute",
        "label": "Home Repair Dispute",
        "href": "/private-office/workflows/home-repair-dispute"
      },
      {
        "slug": "insurance-underpayment-dispute",
        "label": "Insurance Underpayment Dispute",
        "href": "/private-office/workflows/insurance-underpayment-dispute"
      },
      {
        "slug": "litigation-hold-letter",
        "label": "Litigation Hold Letter",
        "href": "/private-office/workflows/litigation-hold-letter"
      },
      {
        "slug": "personal-legal-autonomy-asset-control",
        "label": "Personal Legal Autonomy Asset Control",
        "href": "/private-office/workflows/personal-legal-autonomy-asset-control"
      },
      {
        "slug": "power-of-attorney-dispute",
        "label": "Power Of Attorney Dispute",
        "href": "/private-office/workflows/power-of-attorney-dispute"
      },
      {
        "slug": "private-matter-evidence-package",
        "label": "Private Matter Evidence Package",
        "href": "/private-office/workflows/private-matter-evidence-package"
      },
      {
        "slug": "probate-records-investigation",
        "label": "Probate Records Investigation",
        "href": "/private-office/workflows/probate-records-investigation"
      },
      {
        "slug": "professional-services-dispute",
        "label": "Professional Services Dispute",
        "href": "/private-office/workflows/professional-services-dispute"
      },
      {
        "slug": "property-damage-demand",
        "label": "Property Damage Demand",
        "href": "/private-office/workflows/property-damage-demand"
      },
      {
        "slug": "property-estate-reconstruction",
        "label": "Property Estate Reconstruction",
        "href": "/private-office/workflows/property-estate-reconstruction"
      },
      {
        "slug": "property-insurance-claim",
        "label": "Property Insurance Claim",
        "href": "/private-office/workflows/property-insurance-claim"
      },
      {
        "slug": "property-title-history-investigation",
        "label": "Property Title History Investigation",
        "href": "/private-office/workflows/property-title-history-investigation"
      },
      {
        "slug": "security-deposit-dispute",
        "label": "Security Deposit Dispute",
        "href": "/private-office/workflows/security-deposit-dispute"
      },
      {
        "slug": "trust-accounting-demand",
        "label": "Trust Accounting Demand",
        "href": "/private-office/workflows/trust-accounting-demand"
      },
      {
        "slug": "trust-beneficiary-notice",
        "label": "Trust Beneficiary Notice",
        "href": "/private-office/workflows/trust-beneficiary-notice"
      },
      {
        "slug": "unauthorized-bank-transfer-dispute",
        "label": "Unauthorized Bank Transfer Dispute",
        "href": "/private-office/workflows/unauthorized-bank-transfer-dispute"
      },
      {
        "slug": "wire-fraud-recovery-package",
        "label": "Wire Fraud Recovery Package",
        "href": "/private-office/workflows/wire-fraud-recovery-package"
      }
    ]
  },
  {
    "id": "records-request",
    "label": "Records Requests",
    "href": "/records-request",
    "workflows": [
      {
        "slug": "agency-records-request",
        "label": "Agency Records Request",
        "href": "/records-request/workflows/agency-records-request"
      },
      {
        "slug": "arrest-records-request",
        "label": "Arrest Records Request",
        "href": "/records-request/workflows/arrest-records-request"
      },
      {
        "slug": "background-check-records-request",
        "label": "Background Check Records Request",
        "href": "/records-request/workflows/background-check-records-request"
      },
      {
        "slug": "birth-certificate-request",
        "label": "Birth Certificate Request",
        "href": "/records-request/workflows/birth-certificate-request"
      },
      {
        "slug": "birth-records-request",
        "label": "Birth Records Request",
        "href": "/records-request/workflows/birth-records-request"
      },
      {
        "slug": "code-enforcement-records-request",
        "label": "Code Enforcement Records Request",
        "href": "/records-request/workflows/code-enforcement-records-request"
      },
      {
        "slug": "court-records-request",
        "label": "Court Records Request",
        "href": "/records-request/workflows/court-records-request"
      },
      {
        "slug": "criminal-history-request",
        "label": "Criminal History Request",
        "href": "/records-request/workflows/criminal-history-request"
      },
      {
        "slug": "criminal-records-request",
        "label": "Criminal Records Request",
        "href": "/records-request/workflows/criminal-records-request"
      },
      {
        "slug": "death-records-request",
        "label": "Death Records Request",
        "href": "/records-request/workflows/death-records-request"
      },
      {
        "slug": "divorce-records-request",
        "label": "Divorce Records Request",
        "href": "/records-request/workflows/divorce-records-request"
      },
      {
        "slug": "education-records-request",
        "label": "Education Records Request",
        "href": "/records-request/workflows/education-records-request"
      },
      {
        "slug": "employment-records-request",
        "label": "Employment Records Request",
        "href": "/records-request/workflows/employment-records-request"
      },
      {
        "slug": "foia-police-records-request",
        "label": "FOIA Police Records Request",
        "href": "/records-request/workflows/foia-police-records-request"
      },
      {
        "slug": "foia-request",
        "label": "FOIA Request",
        "href": "/records-request/workflows/foia-request"
      },
      {
        "slug": "government-documents-request",
        "label": "Government Documents Request",
        "href": "/records-request/workflows/government-documents-request"
      },
      {
        "slug": "marriage-records-request",
        "label": "Marriage Records Request",
        "href": "/records-request/workflows/marriage-records-request"
      },
      {
        "slug": "medical-records-request",
        "label": "Medical Records Request",
        "href": "/records-request/workflows/medical-records-request"
      },
      {
        "slug": "military-records-request",
        "label": "Military Records Request",
        "href": "/records-request/workflows/military-records-request"
      },
      {
        "slug": "open-records-request",
        "label": "Open Records Request",
        "href": "/records-request/workflows/open-records-request"
      },
      {
        "slug": "permit-records-request",
        "label": "Permit Records Request",
        "href": "/records-request/workflows/permit-records-request"
      },
      {
        "slug": "police-records-request",
        "label": "Police Records Request",
        "href": "/records-request/workflows/police-records-request"
      },
      {
        "slug": "police-report-copy-request",
        "label": "Police Report Copy Request",
        "href": "/records-request/workflows/police-report-copy-request"
      },
      {
        "slug": "police-report-request",
        "label": "Police Report Request",
        "href": "/records-request/workflows/police-report-request"
      },
      {
        "slug": "property-records-request",
        "label": "Property Records Request",
        "href": "/records-request/workflows/property-records-request"
      },
      {
        "slug": "public-information-request",
        "label": "Public Information Request",
        "href": "/records-request/workflows/public-information-request"
      },
      {
        "slug": "public-records-request",
        "label": "Public Records Request",
        "href": "/records-request/workflows/public-records-request"
      },
      {
        "slug": "records-denial-appeal-request",
        "label": "Records Denial Appeal Request",
        "href": "/records-request/workflows/records-denial-appeal-request"
      },
      {
        "slug": "records-follow-up-request",
        "label": "Records Follow Up Request",
        "href": "/records-request/workflows/records-follow-up-request"
      },
      {
        "slug": "school-records-request",
        "label": "School Records Request",
        "href": "/records-request/workflows/school-records-request"
      }
    ]
  },
  {
    "id": "small-business",
    "label": "Small Business",
    "href": "/small-business",
    "workflows": [
      {
        "slug": "account-balance-notice",
        "label": "Account Balance Notice",
        "href": "/small-business/workflows/account-balance-notice"
      },
      {
        "slug": "appointment-scheduling-notice",
        "label": "Appointment Scheduling Notice",
        "href": "/small-business/workflows/appointment-scheduling-notice"
      },
      {
        "slug": "business-policy-update",
        "label": "Business Policy Update",
        "href": "/small-business/workflows/business-policy-update"
      },
      {
        "slug": "business-records-request",
        "label": "Business Records Request",
        "href": "/small-business/workflows/business-records-request"
      },
      {
        "slug": "cease-and-desist-business-correspondence",
        "label": "Cease And Desist Business Correspondence",
        "href": "/small-business/workflows/cease-and-desist-business-correspondence"
      },
      {
        "slug": "change-of-address-notice",
        "label": "Change Of Address Notice",
        "href": "/small-business/workflows/change-of-address-notice"
      },
      {
        "slug": "collection-letter",
        "label": "Collection Letter",
        "href": "/small-business/workflows/collection-letter"
      },
      {
        "slug": "compliance-notice",
        "label": "Compliance Notice",
        "href": "/small-business/workflows/compliance-notice"
      },
      {
        "slug": "contract-change-notice",
        "label": "Contract Change Notice",
        "href": "/small-business/workflows/contract-change-notice"
      },
      {
        "slug": "contract-nonrenewal-notice",
        "label": "Contract Nonrenewal Notice",
        "href": "/small-business/workflows/contract-nonrenewal-notice"
      },
      {
        "slug": "contract-renewal-notice",
        "label": "Contract Renewal Notice",
        "href": "/small-business/workflows/contract-renewal-notice"
      },
      {
        "slug": "customer-complaint-response",
        "label": "Customer Complaint Response",
        "href": "/small-business/workflows/customer-complaint-response"
      },
      {
        "slug": "customer-dispute-response",
        "label": "Customer Dispute Response",
        "href": "/small-business/workflows/customer-dispute-response"
      },
      {
        "slug": "final-demand-for-payment",
        "label": "Final Demand For Payment",
        "href": "/small-business/workflows/final-demand-for-payment"
      },
      {
        "slug": "final-payment-reminder",
        "label": "Final Payment Reminder",
        "href": "/small-business/workflows/final-payment-reminder"
      },
      {
        "slug": "general-formal-business-letter",
        "label": "General Formal Business Letter",
        "href": "/small-business/workflows/general-formal-business-letter"
      },
      {
        "slug": "insurance-certificate-request",
        "label": "Insurance Certificate Request",
        "href": "/small-business/workflows/insurance-certificate-request"
      },
      {
        "slug": "late-payment-notice",
        "label": "Late Payment Notice",
        "href": "/small-business/workflows/late-payment-notice"
      },
      {
        "slug": "past-due-invoice-notice",
        "label": "Past Due Invoice Notice",
        "href": "/small-business/workflows/past-due-invoice-notice"
      },
      {
        "slug": "payment-demand",
        "label": "Payment Demand",
        "href": "/small-business/workflows/payment-demand"
      },
      {
        "slug": "payment-reminder",
        "label": "Payment Reminder",
        "href": "/small-business/workflows/payment-reminder"
      },
      {
        "slug": "price-increase-notice",
        "label": "Price Increase Notice",
        "href": "/small-business/workflows/price-increase-notice"
      },
      {
        "slug": "refund-response",
        "label": "Refund Response",
        "href": "/small-business/workflows/refund-response"
      },
      {
        "slug": "service-cancellation-response",
        "label": "Service Cancellation Response",
        "href": "/small-business/workflows/service-cancellation-response"
      },
      {
        "slug": "service-interruption-notice",
        "label": "Service Interruption Notice",
        "href": "/small-business/workflows/service-interruption-notice"
      },
      {
        "slug": "terms-violation-notice",
        "label": "Terms Violation Notice",
        "href": "/small-business/workflows/terms-violation-notice"
      },
      {
        "slug": "unpaid-invoice-letter",
        "label": "Unpaid Invoice Letter",
        "href": "/small-business/workflows/unpaid-invoice-letter"
      },
      {
        "slug": "vendor-dispute-response",
        "label": "Vendor Dispute Response",
        "href": "/small-business/workflows/vendor-dispute-response"
      },
      {
        "slug": "vendor-documentation-request",
        "label": "Vendor Documentation Request",
        "href": "/small-business/workflows/vendor-documentation-request"
      },
      {
        "slug": "vendor-payment-dispute",
        "label": "Vendor Payment Dispute",
        "href": "/small-business/workflows/vendor-payment-dispute"
      }
    ]
  },
  {
    "id": "tenant-reply",
    "label": "Tenant Reply",
    "href": "/tenant-reply",
    "workflows": [
      {
        "slug": "cure-or-quit-response",
        "label": "Cure Or Quit Response",
        "href": "/tenant-reply/workflows/cure-or-quit-response"
      },
      {
        "slug": "eviction-notice-response",
        "label": "Eviction Notice Response",
        "href": "/tenant-reply/workflows/eviction-notice-response"
      },
      {
        "slug": "habitability-complaint",
        "label": "Habitability Complaint",
        "href": "/tenant-reply/workflows/habitability-complaint"
      },
      {
        "slug": "housing-agency-complaint-response",
        "label": "Housing Agency Complaint Response",
        "href": "/tenant-reply/workflows/housing-agency-complaint-response"
      },
      {
        "slug": "landlord-communication-documentation",
        "label": "Landlord Communication Documentation",
        "href": "/tenant-reply/workflows/landlord-communication-documentation"
      },
      {
        "slug": "landlord-damage-claim-response",
        "label": "Landlord Damage Claim Response",
        "href": "/tenant-reply/workflows/landlord-damage-claim-response"
      },
      {
        "slug": "late-fee-dispute",
        "label": "Late Fee Dispute",
        "href": "/tenant-reply/workflows/late-fee-dispute"
      },
      {
        "slug": "lease-amendment-response",
        "label": "Lease Amendment Response",
        "href": "/tenant-reply/workflows/lease-amendment-response"
      },
      {
        "slug": "lease-renewal-response",
        "label": "Lease Renewal Response",
        "href": "/tenant-reply/workflows/lease-renewal-response"
      },
      {
        "slug": "lease-termination-response",
        "label": "Lease Termination Response",
        "href": "/tenant-reply/workflows/lease-termination-response"
      },
      {
        "slug": "lease-violation-response",
        "label": "Lease Violation Response",
        "href": "/tenant-reply/workflows/lease-violation-response"
      },
      {
        "slug": "maintenance-neglect-response",
        "label": "Maintenance Neglect Response",
        "href": "/tenant-reply/workflows/maintenance-neglect-response"
      },
      {
        "slug": "mold-water-damage-notice",
        "label": "Mold Water Damage Notice",
        "href": "/tenant-reply/workflows/mold-water-damage-notice"
      },
      {
        "slug": "move-out-charges-dispute",
        "label": "Move Out Charges Dispute",
        "href": "/tenant-reply/workflows/move-out-charges-dispute"
      },
      {
        "slug": "move-out-dispute",
        "label": "Move Out Dispute",
        "href": "/tenant-reply/workflows/move-out-dispute"
      },
      {
        "slug": "notice-to-enter-response",
        "label": "Notice To Enter Response",
        "href": "/tenant-reply/workflows/notice-to-enter-response"
      },
      {
        "slug": "pay-or-quit-response",
        "label": "Pay Or Quit Response",
        "href": "/tenant-reply/workflows/pay-or-quit-response"
      },
      {
        "slug": "property-damage-dispute",
        "label": "Property Damage Dispute",
        "href": "/tenant-reply/workflows/property-damage-dispute"
      },
      {
        "slug": "rent-increase-response",
        "label": "Rent Increase Response",
        "href": "/tenant-reply/workflows/rent-increase-response"
      },
      {
        "slug": "repair-request",
        "label": "Repair Request",
        "href": "/tenant-reply/workflows/repair-request"
      },
      {
        "slug": "security-deposit-demand",
        "label": "Security Deposit Demand",
        "href": "/tenant-reply/workflows/security-deposit-demand"
      },
      {
        "slug": "security-deposit-dispute",
        "label": "Security Deposit Dispute",
        "href": "/tenant-reply/workflows/security-deposit-dispute"
      },
      {
        "slug": "security-deposit-response",
        "label": "Security Deposit Response",
        "href": "/tenant-reply/workflows/security-deposit-response"
      },
      {
        "slug": "tenant-demand-letter",
        "label": "Tenant Demand Letter",
        "href": "/tenant-reply/workflows/tenant-demand-letter"
      },
      {
        "slug": "tenant-evidence-package",
        "label": "Tenant Evidence Package",
        "href": "/tenant-reply/workflows/tenant-evidence-package"
      },
      {
        "slug": "tenant-notice-response",
        "label": "Tenant Notice Response",
        "href": "/tenant-reply/workflows/tenant-notice-response"
      },
      {
        "slug": "tenant-response-to-landlord",
        "label": "Tenant Response To Landlord",
        "href": "/tenant-reply/workflows/tenant-response-to-landlord"
      },
      {
        "slug": "unauthorized-entry-complaint",
        "label": "Unauthorized Entry Complaint",
        "href": "/tenant-reply/workflows/unauthorized-entry-complaint"
      },
      {
        "slug": "unresolved-repair-follow-up",
        "label": "Unresolved Repair Follow Up",
        "href": "/tenant-reply/workflows/unresolved-repair-follow-up"
      },
      {
        "slug": "utility-billing-dispute",
        "label": "Utility Billing Dispute",
        "href": "/tenant-reply/workflows/utility-billing-dispute"
      }
    ]
  }
] as const satisfies readonly WorkflowNavigationSection[]

export const WORKFLOW_NAV_COUNT = WORKFLOW_NAV_SECTIONS.reduce(
  (total, section) => total + section.workflows.length,
  0,
)

export function findWorkflowNavigationItem(pathname: string) {
  for (const section of WORKFLOW_NAV_SECTIONS) {
    const workflow = section.workflows.find(
      (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
    )
    if (workflow) return { section, workflow }
  }
  return null
}
