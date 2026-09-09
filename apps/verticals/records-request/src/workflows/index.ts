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
import { governmentCommunicationsRecordsWorkflow } from './government-communications-records'
import { foiaRequestWorkflow } from './foia-request'
import { publicRecordsRequestWorkflow } from './public-records-request'
import { caseRecordsWorkflow } from './case-records'
import { birthRecordsWorkflow, marriageRecordsWorkflow, divorceRecordsWorkflow, deathRecordsWorkflow } from './vital-records'
import { militaryRecordsWorkflow, medicalRecordsWorkflow, employmentRecordsWorkflow, educationRecordsWorkflow, recordsFollowUpWorkflow, recordsDenialAppealWorkflow } from './specialized-records'
import { policeReportWorkflow, policeReportCopyWorkflow, publicInformationRequestWorkflow, openRecordsRequestWorkflow, agencyRecordsRequestWorkflow, governmentDocumentsRequestWorkflow } from './variant-records'
import type { RecordsWorkflow } from '../workflow-factory'

export const recordsWorkflows: readonly RecordsWorkflow[] = [
  // Start here
  publicRecordsRequestWorkflow,
  foiaRequestWorkflow,
  publicInformationRequestWorkflow,
  openRecordsRequestWorkflow,
  agencyRecordsRequestWorkflow,
  governmentDocumentsRequestWorkflow,
  // Law enforcement & courts
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
  policeReportWorkflow,
  policeReportCopyWorkflow,
  productionCourtRecordsWorkflow,
  productionCriminalRecordsWorkflow,
  productionCriminalHistoryWorkflow,
  productionArrestRecordsWorkflow,
  productionBackgroundCheckRecordsWorkflow,
  // Property & development
  productionPropertyRecordsWorkflow,
  propertyPermitRecordsWorkflow,
  codeEnforcementRecordsWorkflow,
  productionPlanningRecordsWorkflow,
  // Vital records
  birthRecordsWorkflow,
  marriageRecordsWorkflow,
  divorceRecordsWorkflow,
  deathRecordsWorkflow,
  // Personal records
  militaryRecordsWorkflow,
  medicalRecordsWorkflow,
  employmentRecordsWorkflow,
  educationRecordsWorkflow,
  // Communications & cases
  governmentCommunicationsRecordsWorkflow,
  caseRecordsWorkflow,
  // Lifecycle
  recordsFollowUpWorkflow,
  recordsDenialAppealWorkflow,
]

const workflowMap = new Map(recordsWorkflows.map((workflow) => [workflow.id, workflow]))

export function getRecordsWorkflow(id: string): RecordsWorkflow | null {
  return workflowMap.get(id) ?? null
}

export function listRecordsWorkflows(): readonly RecordsWorkflow[] {
  return recordsWorkflows
}
