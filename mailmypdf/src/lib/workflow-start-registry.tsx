// Thin host-side bridge from (sectionId, workflowId) to the real top-level
// new-architecture start component. This file only imports and renders --
// all reusable workflow logic stays in the top-level workflow/shared
// packages. A workflow only appears here once it genuinely has a real
// start implementation; there is no fallback to the retired architecture.
//
// Static imports below cover executable workflows that need a dedicated
// component. Certified profile-driven families can be rendered generically,
// but only when canonical execution metadata AND the family profile registry
// agree. There is never a generic unknown-workflow fallback.

import type { ComponentType } from "react"
import NoticeResponseWorkflow from "@mailmypdf/notice-respond/shared/NoticeResponseWorkflow"
import { getNoticeResponseWorkflowProfile, workflowById } from "@mailmypdf/workflows"

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
import AppealSsiDenialStart from "@mailmypdf/appeal-mail/workflows/appeal-ssi-denial/start"
import AppealTimelyFilingDenialStart from "@mailmypdf/appeal-mail/workflows/appeal-timely-filing-denial/start"
import EquifaxDisputeStart from "@mailmypdf/dispute-mail-section/workflows/equifax-dispute/start"
import ExperianDisputeStart from "@mailmypdf/dispute-mail-section/workflows/experian-dispute/start"
import TransunionDisputeStart from "@mailmypdf/dispute-mail-section/workflows/transunion-dispute/start"
import ImmigrationFilingCoverLetterStart from "@mailmypdf/immigration-mail/workflows/immigration-filing-cover-letter/start"
import AgencyRecordsRequestStart from "@mailmypdf/records-request/workflows/agency-records-request/start"
import GovernmentDocumentsRequestStart from "@mailmypdf/records-request/workflows/government-documents-request/start"
import OpenRecordsRequestStart from "@mailmypdf/records-request/workflows/open-records-request/start"
import PublicInformationRequestStart from "@mailmypdf/records-request/workflows/public-information-request/start"
import PublicRecordsRequestStart from "@mailmypdf/records-request/workflows/public-records-request/start"
import { SecuredTransactionEligibilityIntake as SecuredTransactionEligibilityStart } from "@mailmypdf/secured-transactions-section/workflows/secured-transaction-eligibility/start/EligibilityIntake"
import NameCapacityResolutionStart from "@mailmypdf/secured-transactions-section/workflows/name-capacity-resolution/start"
import ObligationValueStart from "@mailmypdf/secured-transactions-section/workflows/obligation-value/start"

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
  "appeal-mail:appeal-ssi-denial": AppealSsiDenialStart,
  "appeal-mail:appeal-timely-filing-denial": AppealTimelyFilingDenialStart,
  "dispute-mail:equifax-dispute": EquifaxDisputeStart,
  "dispute-mail:experian-dispute": ExperianDisputeStart,
  "dispute-mail:transunion-dispute": TransunionDisputeStart,
  "immigration-mail:immigration-filing-cover-letter": ImmigrationFilingCoverLetterStart,
  "records-request:agency-records-request": AgencyRecordsRequestStart,
  "records-request:government-documents-request": GovernmentDocumentsRequestStart,
  "records-request:open-records-request": OpenRecordsRequestStart,
  "records-request:public-information-request": PublicInformationRequestStart,
  "records-request:public-records-request": PublicRecordsRequestStart,
  "secured-transactions:secured-transaction-eligibility": SecuredTransactionEligibilityStart,
  "secured-transactions:name-capacity-resolution": NameCapacityResolutionStart,
  "secured-transactions:obligation-value": ObligationValueStart,
}

const FACTORY_FAMILY_COMPONENTS = new Map<string, ComponentType>()

function noticeResponseStartComponent(workflowId: string): ComponentType {
  const key = `notice-response:${workflowId}`
  const cached = FACTORY_FAMILY_COMPONENTS.get(key)
  if (cached) return cached

  const Component = () => (
    <NoticeResponseWorkflow
      config={{
        workflowId,
      }}
    />
  )
  FACTORY_FAMILY_COMPONENTS.set(key, Component)
  return Component
}

export function workflowStartComponent(sectionId: string, workflowId: string): ComponentType | undefined {
  const staticComponent = WORKFLOW_START_COMPONENTS[`${sectionId}:${workflowId}`]
  if (staticComponent) return staticComponent

  const canonical = workflowById(`${sectionId}/${workflowId}`)
  if (
    canonical?.execution?.kind === "platform" &&
    canonical.execution.policyFamily === "notice-response" &&
    getNoticeResponseWorkflowProfile(workflowId)
  ) {
    return noticeResponseStartComponent(workflowId)
  }

  return undefined
}
