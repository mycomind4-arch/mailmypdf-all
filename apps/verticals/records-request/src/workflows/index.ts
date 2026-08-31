import { codeEnforcementRecordsWorkflow } from './code-enforcement-records'
import { policeRecordsWorkflow } from './police-records'
import { propertyPermitRecordsWorkflow } from './property-permit-records'
import { governmentCommunicationsRecordsWorkflow } from './government-communications-records'
import { foiaRequestWorkflow } from './foia-request'
import { courtRecordsWorkflow } from './court-records'
import { propertyRecordsWorkflow } from './property-records'
import { planningRecordsWorkflow } from './planning-records'
import { publicRecordsRequestWorkflow } from './public-records-request'
import { caseRecordsWorkflow } from './case-records'
import { birthRecordsWorkflow, marriageRecordsWorkflow, divorceRecordsWorkflow, deathRecordsWorkflow } from './vital-records'
import { criminalRecordsWorkflow, criminalHistoryWorkflow, arrestRecordsWorkflow, backgroundCheckRecordsWorkflow } from './criminal-records'
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
  policeReportWorkflow,
  policeReportCopyWorkflow,
  courtRecordsWorkflow,
  criminalRecordsWorkflow,
  criminalHistoryWorkflow,
  arrestRecordsWorkflow,
  backgroundCheckRecordsWorkflow,
  // Property & development
  propertyRecordsWorkflow,
  propertyPermitRecordsWorkflow,
  codeEnforcementRecordsWorkflow,
  planningRecordsWorkflow,
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
