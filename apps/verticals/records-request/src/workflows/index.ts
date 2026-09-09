import { codeEnforcementRecordsWorkflow } from './code-enforcement-records'
import { policeRecordsWorkflow } from './police-records'
import { bodyCameraRecordsWorkflow } from './body-camera-records'
import { dashCameraRecordsWorkflow } from './dash-camera-records'
import { dispatch911RecordsWorkflow } from './dispatch-911-records'
import { useOfForceRecordsWorkflow } from './use-of-force-records'
import { internalAffairsRecordsWorkflow } from './internal-affairs-records'
import { officerDisciplineRecordsWorkflow } from './officer-discipline-records'
import { searchWarrantRecordsWorkflow } from './search-warrant-records'
import { policePursuitRecordsWorkflow } from './police-pursuit-records'
import { officerInvolvedShootingRecordsWorkflow } from './officer-involved-shooting-records'
import { evidencePropertyRoomRecordsWorkflow } from './evidence-property-room-records'
import { productionArrestRecordsWorkflow } from './arrest-records-production'
import { productionCriminalRecordsWorkflow } from './criminal-records-production'
import { productionCriminalHistoryWorkflow } from './criminal-history-production'
import { productionBackgroundCheckRecordsWorkflow } from './background-check-records-production'
import { productionCourtRecordsWorkflow } from './court-records-production'
import { productionPropertyRecordsWorkflow } from './property-records-production'
import { propertyPermitRecordsWorkflow } from './property-permit-records'
import { productionPlanningRecordsWorkflow } from './planning-records-production'
import { productionBirthRecordsWorkflow } from './birth-records-production'
import { productionMarriageRecordsWorkflow } from './marriage-records-production'
import { productionDivorceRecordsWorkflow } from './divorce-records-production'
import { productionDeathRecordsWorkflow } from './death-records-production'
import { productionMedicalRecordsWorkflow } from './medical-records-production'
import { productionEducationRecordsWorkflow } from './education-records-production'
import { productionEmploymentRecordsWorkflow } from './employment-records-production'
import { productionMilitaryRecordsWorkflow } from './military-records-production'
import { productionRecordsFollowUpWorkflow } from './records-follow-up-production'
import { productionRecordsDenialAppealWorkflow } from './records-denial-appeal-production'
import { productionOpenRecordsRequestWorkflow } from './open-records-production'
import { productionPublicInformationRequestWorkflow } from './public-information-production'
import { productionAgencyRecordsRequestWorkflow } from './agency-records-production'
import { productionGovernmentDocumentsRequestWorkflow } from './government-documents-production'
import { productionCaseRecordsWorkflow } from './case-records-production'
import { productionPoliceReportWorkflow } from './police-report-production'
import { productionPoliceReportCopyWorkflow } from './police-report-copy-production'
import { governmentCommunicationsRecordsWorkflow } from './government-communications-records'
import { foiaRequestWorkflow } from './foia-request'
import { publicRecordsRequestWorkflow } from './public-records-request'
import type { RecordsWorkflow } from '../workflow-factory'

export const recordsWorkflows: readonly RecordsWorkflow[] = [
  publicRecordsRequestWorkflow,
  foiaRequestWorkflow,
  productionPublicInformationRequestWorkflow,
  productionOpenRecordsRequestWorkflow,
  productionAgencyRecordsRequestWorkflow,
  productionGovernmentDocumentsRequestWorkflow,
  policeRecordsWorkflow,
  bodyCameraRecordsWorkflow,
  dashCameraRecordsWorkflow,
  dispatch911RecordsWorkflow,
  useOfForceRecordsWorkflow,
  internalAffairsRecordsWorkflow,
  officerDisciplineRecordsWorkflow,
  searchWarrantRecordsWorkflow,
  policePursuitRecordsWorkflow,
  officerInvolvedShootingRecordsWorkflow,
  evidencePropertyRoomRecordsWorkflow,
  productionPoliceReportWorkflow,
  productionPoliceReportCopyWorkflow,
  productionCourtRecordsWorkflow,
  productionCriminalRecordsWorkflow,
  productionCriminalHistoryWorkflow,
  productionArrestRecordsWorkflow,
  productionBackgroundCheckRecordsWorkflow,
  productionPropertyRecordsWorkflow,
  propertyPermitRecordsWorkflow,
  codeEnforcementRecordsWorkflow,
  productionPlanningRecordsWorkflow,
  productionBirthRecordsWorkflow,
  productionMarriageRecordsWorkflow,
  productionDivorceRecordsWorkflow,
  productionDeathRecordsWorkflow,
  productionMilitaryRecordsWorkflow,
  productionMedicalRecordsWorkflow,
  productionEmploymentRecordsWorkflow,
  productionEducationRecordsWorkflow,
  governmentCommunicationsRecordsWorkflow,
  productionCaseRecordsWorkflow,
  productionRecordsFollowUpWorkflow,
  productionRecordsDenialAppealWorkflow,
]

const workflowMap = new Map(recordsWorkflows.map((workflow) => [workflow.id, workflow]))
export function getRecordsWorkflow(id: string): RecordsWorkflow | null { return workflowMap.get(id) ?? null }
export function listRecordsWorkflows(): readonly RecordsWorkflow[] { return recordsWorkflows }
