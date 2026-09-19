// Thin host-side bridge from (sectionId, workflowId) to the real top-level
// new-architecture start component. This file only imports and renders --
// all reusable workflow logic stays in the top-level workflow/shared
// packages. A workflow only appears here once it genuinely has a real
// start implementation; there is no fallback to apps/verticals/**.
//
// Every import below is a real top-level workflow's own start component,
// matching @mailmypdf/workflows' WORKFLOW_EXECUTION_REGISTRY "executable"
// entries exactly -- do not add an entry here without a matching registry
// record, and do not add a registry record without a real entry here.

import type { ComponentType } from "react"

import AppealCarInsuranceClaimStart from "@mailmypdf/appeal-mail/workflows/appeal-car-insurance-claim/start"
import AppealDeniedClaimStart from "@mailmypdf/appeal-mail/workflows/appeal-denied-claim/start"
import AppealDentalInsuranceDenialStart from "@mailmypdf/appeal-mail/workflows/appeal-dental-insurance-denial/start"
import AppealInsuranceClaimDenialStart from "@mailmypdf/appeal-mail/workflows/appeal-insurance-claim-denial/start"
import AppealInsuranceCoverageDenialStart from "@mailmypdf/appeal-mail/workflows/appeal-insurance-coverage-denial/start"
import AppealLifeInsuranceDenialStart from "@mailmypdf/appeal-mail/workflows/appeal-life-insurance-denial/start"
import AppealMedicalInsuranceDenialStart from "@mailmypdf/appeal-mail/workflows/appeal-medical-insurance-denial/start"
import AppealMedicalNecessityDenialStart from "@mailmypdf/appeal-mail/workflows/appeal-medical-necessity-denial/start"
import AppealOutOfNetworkDenialStart from "@mailmypdf/appeal-mail/workflows/appeal-out-of-network-denial/start"
import AppealPriorAuthorizationDenialStart from "@mailmypdf/appeal-mail/workflows/appeal-prior-authorization-denial/start"
import AppealSsdiDenialStart from "@mailmypdf/appeal-mail/workflows/appeal-ssdi-denial/start"
import AppealTimelyFilingDenialStart from "@mailmypdf/appeal-mail/workflows/appeal-timely-filing-denial/start"
import ImmigrationFilingCoverLetterStart from "@mailmypdf/immigration-mail/workflows/immigration-filing-cover-letter/start"
import Cp2000ResponseStart from "@mailmypdf/notice-respond/workflows/cp2000-response/start"
import Cp504ResponseStart from "@mailmypdf/notice-respond/workflows/cp504-response/start"
import AgencyRecordsRequestStart from "@mailmypdf/records-request/workflows/agency-records-request/start"
import GovernmentDocumentsRequestStart from "@mailmypdf/records-request/workflows/government-documents-request/start"
import OpenRecordsRequestStart from "@mailmypdf/records-request/workflows/open-records-request/start"
import PublicInformationRequestStart from "@mailmypdf/records-request/workflows/public-information-request/start"
import PublicRecordsRequestStart from "@mailmypdf/records-request/workflows/public-records-request/start"

const WORKFLOW_START_COMPONENTS: Readonly<Record<string, ComponentType>> = {
  "appeal-mail:appeal-car-insurance-claim": AppealCarInsuranceClaimStart,
  "appeal-mail:appeal-denied-claim": AppealDeniedClaimStart,
  "appeal-mail:appeal-dental-insurance-denial": AppealDentalInsuranceDenialStart,
  "appeal-mail:appeal-insurance-claim-denial": AppealInsuranceClaimDenialStart,
  "appeal-mail:appeal-insurance-coverage-denial": AppealInsuranceCoverageDenialStart,
  "appeal-mail:appeal-life-insurance-denial": AppealLifeInsuranceDenialStart,
  "appeal-mail:appeal-medical-insurance-denial": AppealMedicalInsuranceDenialStart,
  "appeal-mail:appeal-medical-necessity-denial": AppealMedicalNecessityDenialStart,
  "appeal-mail:appeal-out-of-network-denial": AppealOutOfNetworkDenialStart,
  "appeal-mail:appeal-prior-authorization-denial": AppealPriorAuthorizationDenialStart,
  "appeal-mail:appeal-ssdi-denial": AppealSsdiDenialStart,
  "appeal-mail:appeal-timely-filing-denial": AppealTimelyFilingDenialStart,
  "immigration-mail:immigration-filing-cover-letter": ImmigrationFilingCoverLetterStart,
  "notice-respond:cp2000-response": Cp2000ResponseStart,
  "notice-respond:cp504-response": Cp504ResponseStart,
  "records-request:agency-records-request": AgencyRecordsRequestStart,
  "records-request:government-documents-request": GovernmentDocumentsRequestStart,
  "records-request:open-records-request": OpenRecordsRequestStart,
  "records-request:public-information-request": PublicInformationRequestStart,
  "records-request:public-records-request": PublicRecordsRequestStart,
}

export function workflowStartComponent(sectionId: string, workflowId: string): ComponentType | undefined {
  return WORKFLOW_START_COMPONENTS[`${sectionId}:${workflowId}`]
}
