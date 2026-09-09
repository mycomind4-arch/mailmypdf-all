import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import type { RecordsDomainCapability } from './domain-pack'
import { analyzePoliceProduction, type PoliceProductionIdentifiers, type PoliceProductionRecord } from './police-records-analysis'
import { assessPoliceContradiction, classifyPoliceRecord, extractPoliceIncidentFacts, recommendPoliceFollowUp } from './police-records-ai'
import { getConfiguredRecordsLlmProviders } from '../ai/records-llm-providers'

export const INTERNAL_AFFAIRS_RECORD_CATEGORIES = [
  'complaint-intake-and-tracking',
  'internal-affairs-investigation-records',
  'professional-standards-review-records',
  'interviews-and-statements',
  'evidence-and-media-indexes',
  'findings-and-disposition-records',
  'supervisory-and-command-review',
  'policy-training-and-directive-records',
  'referral-and-corrective-action-records',
  'retention-redaction-and-withholding-records',
  'request-status-and-release-records',
] as const

export const INTERNAL_AFFAIRS_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const INTERNAL_AFFAIRS_INTAKE = [
  { id:'agency', label:'Law-enforcement agency', required:true, helpText:'Police department, sheriff, state police, campus police, transit police, or other public agency.' },
  { id:'jurisdiction', label:'Jurisdiction', required:true, helpText:'Federal, state, county, city, district, campus, transit, or other jurisdiction whose access and personnel-record rules may apply.' },
  { id:'department', label:'Professional standards / internal affairs unit', helpText:'Internal affairs, professional standards, civilian oversight, inspector general, records, legal, or another likely custodian.' },
  { id:'complaintNumber', label:'Complaint / IA case number', helpText:'Complaint, internal-affairs, professional-standards, civilian-oversight, or inspector-general case number when known.' },
  { id:'incidentNumber', label:'Related incident / report number', helpText:'Incident, arrest, citation, report, CAD, call-for-service, or other event identifier associated with the complaint.' },
  { id:'dateStart', label:'Beginning date', required:true, helpText:'Beginning of the relevant complaint/investigation period.' },
  { id:'dateEnd', label:'Ending date', required:true, helpText:'End of the relevant complaint/investigation period.' },
  { id:'person', label:'Complainant / involved person', helpText:'Requester-supplied name or identifier for the complainant or another involved person when lawfully appropriate.' },
  { id:'officerNames', label:'Officer / employee identifiers', helpText:'Known names, badge numbers, employee numbers, units, assignments, or roles.' },
  { id:'allegation', label:'Complaint or allegation', required:true, helpText:'Plain-English description of the conduct, incident, policy issue, or complaint being researched. Preserve disputed conduct as an allegation unless a final finding establishes otherwise.' },
  { id:'requesterRelationship', label:'Requester relationship / access context', helpText:'Optional requester-supplied context such as complainant, involved person, attorney, media, researcher, or general public. This does not establish legal entitlement by itself.' },
  { id:'preferredFormat', label:'Preferred format', helpText:'Native case export, CSV/JSON indexes, PDF, native media, or another available format.' },
  { id:'exclusions', label:'Scope exclusions / narrowing', helpText:'Optional exclusions that reduce noise without changing the complaint/investigation objective.' },
] as const

function text(input:Record<string,unknown>, key:string):string|undefined {
  const raw=input[key]
  if(typeof raw!=='string') return undefined
  const value=raw.trim()
  return value||undefined
}

function selectedCategories(input:Record<string,unknown>):string[] {
  const raw=input.categories
  if(!Array.isArray(raw)) return [...INTERNAL_AFFAIRS_RECORD_CATEGORIES]
  const known=new Set(INTERNAL_AFFAIRS_RECORD_CATEGORIES)
  const selected=raw.filter((entry):entry is string=>typeof entry==='string'&&known.has(entry as typeof INTERNAL_AFFAIRS_RECORD_CATEGORIES[number]))
  return selected.length?selected:[...INTERNAL_AFFAIRS_RECORD_CATEGORIES]
}

function scopeText(input:Record<string,unknown>):string {
  const ids=[
    text(input,'complaintNumber')&&`complaint/IA case identifier ${text(input,'complaintNumber')}`,
    text(input,'incidentNumber')&&`related incident/report identifier ${text(input,'incidentNumber')}`,
    text(input,'person')&&`requester-supplied complainant/involved-person identifier ${text(input,'person')}`,
    text(input,'officerNames')&&`officer/employee identifiers ${text(input,'officerNames')}`,
    text(input,'department')&&`likely unit/custodian ${text(input,'department')}`,
  ].filter(Boolean)
  const start=text(input,'dateStart')
  const end=text(input,'dateEnd')
  const format=text(input,'preferredFormat')?` Preferred format: ${text(input,'preferredFormat')}.`:''
  const exclusions=text(input,'exclusions')?` Scope exclusions/narrowing: ${text(input,'exclusions')}.`:''
  const relationship=text(input,'requesterRelationship')?` Requester-supplied relationship/access context: ${text(input,'requesterRelationship')} (not treated as verified entitlement unless established by applicable authority or agency records).`:''
  return `${ids.length?` Search using these requester-supplied identifiers: ${ids.join('; ')}.`:''}${start&&end?` Cover ${start} through ${end}.`:''}${format}${exclusions}${relationship}`
}

function describe(category:string,input:Record<string,unknown>):string {
  const scope=scopeText(input)
  const allegation=text(input,'allegation')?` Complaint/allegation description supplied by requester: ${text(input,'allegation')}. Preserve whether a statement is an allegation, complaint, witness/employee statement, investigator note, preliminary assessment, sustained/not-sustained/exonerated/unfounded or comparable finding, final disposition, withdrawal, administrative closure, corrective-action referral, discipline record, or adjudicated finding; do not collapse those states into one conclusion.`:''
  const descriptions:Record<string,string>={
    'complaint-intake-and-tracking':`Lawfully accessible complaint intake records, complaint forms, intake logs, acknowledgments, tracking records, routing history, case identifiers, status history, transfers/referrals, and related complaint-management records associated with the identified matter. A complaint or intake allegation is not proof that misconduct occurred.${scope}`,
    'internal-affairs-investigation-records':`Lawfully accessible internal-affairs investigative records, investigative plans, assignments, chronology records, investigator notes, evidence references, investigative summaries, status records, and related case-management records concerning the identified matter. Preserve draft/preliminary versus final status and do not treat an investigator note or preliminary assessment as a final finding.${scope}`,
    'professional-standards-review-records':`Lawfully accessible professional-standards, inspector-general, civilian-oversight, integrity, review-board, or comparable review records associated with the complaint or incident. Preserve each body's role and status; review or referral does not itself establish misconduct, discipline, approval, or finality.${scope}`,
    'interviews-and-statements':`Lawfully accessible recorded or written interviews, statements, summaries, interview logs, complainant/witness statements, employee statements, and associated non-secret metadata concerning the matter. Preserve speaker/source attribution and do not assume confidential-source, whistleblower, victim/witness, juvenile, medical, home/contact, or other protected information is publicly disclosable.${scope}`,
    'evidence-and-media-indexes':`Lawfully accessible evidence inventories, attachment lists, digital-evidence indexes, media indexes, referenced-report lists, exhibits, file inventories, hashes where maintained, and cross-references used or reviewed in connection with the complaint/investigation. Request records sufficient to identify responsive evidence; do not request evidence-system credentials, private keys, authentication tokens, internal server addresses, or security-sensitive configuration.${scope}`,
    'findings-and-disposition-records':`Lawfully accessible findings, disposition records, closing summaries, conclusion memoranda, notification records, and final case-status records. Preserve exact status language such as sustained, not sustained, exonerated, unfounded, administratively closed, withdrawn, pending, insufficient evidence, policy-compliant/noncompliant, superseded, corrected, or other agency-specific terms; do not invent or upgrade a status beyond the source record.${scope}`,
    'supervisory-and-command-review':`Lawfully accessible supervisor, command, legal, risk-management, review-board, executive, or other review records showing review, approval, disagreement, remand, routing, comments, or disposition. Preserve whether review is advisory, preliminary, final, privileged, or otherwise limited; legal/risk/command participation does not itself establish guilt, misconduct, discipline, finality, or approval.${scope}`,
    'policy-training-and-directive-records':`Lawfully accessible policies, procedures, general orders, directives, bulletins, training materials, or guidance identified, cited, applied, or relied on in evaluating the conduct at issue, including versions effective during the relevant period. Do not infer that a cited policy was violated unless a record or verified authority establishes that conclusion.${scope}`,
    'referral-and-corrective-action-records':`Lawfully accessible referral records, remedial/corrective-action referrals, training referrals, policy-review referrals, administrative follow-up, counseling or non-disciplinary action records, and records of discipline where actually maintained and disclosable. A referral, recommendation, remedial step, or training assignment is not discipline unless the record establishes that status.${scope}`,
    'retention-redaction-and-withholding-records':`Existing retention classifications, preservation holds, destruction/deletion records, redaction logs, withholding determinations, privilege logs where maintained, segregation records, and the agency's actually stated basis for material not produced. Do not infer spoliation, unlawful withholding, misconduct, waiver, or another legal violation without verified evidence and applicable authority.${scope}`,
    'request-status-and-release-records':`Existing acknowledgment, request/search status, fee, clarification, transfer/referral, identity/access-verification requirement, no-records response, retention/deletion statement, segregation/partial-production notice, production manifest, release/export record, closure, and review/appeal instructions where actually stated. Preserve the agency's actual statement rather than inventing access entitlement, completeness, deadlines, exemptions, privileges, or review rights.${scope}`,
  }
  return `${descriptions[category]??`Existing internal-affairs records concerning ${category}.${scope}`}${allegation}`
}

function validateInternalAffairs(request:ValidatedRequest):readonly {field:string;message:string}[] {
  const issues:{field:string;message:string}[]=[]
  const corpus=request.items.map(item=>item.description.toLowerCase()).join(' ')
  if(!request.agency?.trim()) issues.push({field:'agency',message:'Identify the law-enforcement agency or public body.'})
  if(!request.jurisdiction?.trim()) issues.push({field:'jurisdiction',message:'Identify the relevant jurisdiction.'})
  if(!corpus.includes('complaint/allegation description supplied by requester:')) issues.push({field:'allegation',message:'Describe the complaint, conduct, incident, or policy issue in plain language.'})
  if(!corpus.includes('cover ')) issues.push({field:'dateRange',message:'Provide a beginning and ending date for the complaint or investigation period.'})
  const hasIdentifier=['complaint/ia case identifier','related incident/report identifier','officer/employee identifiers','requester-supplied complainant/involved-person identifier'].some(marker=>corpus.includes(marker))
  if(!hasIdentifier) issues.push({field:'identifiers',message:'Provide at least one complaint/case number, related incident number, involved person, or officer/employee identifier.'})
  return issues
}

export function buildInternalAffairsRecordsRequest(input:Record<string,unknown>) {
  const complaintNumber=text(input,'complaintNumber')
  const incidentNumber=text(input,'incidentNumber')
  const person=text(input,'person')
  const allegation=text(input,'allegation')
  const start=text(input,'dateStart')
  const end=text(input,'dateEnd')
  const categories=selectedCategories(input)
  return {
    title:`Internal Affairs Records — ${complaintNumber??incidentNumber??person??'Complaint'}`,
    agency:text(input,'agency')??'',
    jurisdiction:text(input,'jurisdiction'),
    purpose:text(input,'purpose')??'Identify, preserve, obtain, and compare lawfully accessible complaint, investigation, evidence-index, finding/disposition, review, policy, referral, retention, withholding, and release-status records while preserving exact evidentiary and personnel-record status.',
    scope:JSON.stringify({workflow:'internal-affairs-records',complaintNumber,incidentNumber,dateStart:start,dateEnd:end,person,officerNames:text(input,'officerNames'),department:text(input,'department'),allegation,requesterRelationship:text(input,'requesterRelationship'),preferredFormat:text(input,'preferredFormat'),exclusions:text(input,'exclusions')}),
    items:categories.map(category=>({
      category,
      description:describe(category,input),
      dateStart:start,
      dateEnd:end,
      custodian:text(input,'department'),
      systemHint:category==='complaint-intake-and-tracking'||category==='internal-affairs-investigation-records'||category==='professional-standards-review-records'?'internal affairs / professional standards case-management records':category==='evidence-and-media-indexes'?'digital evidence / document management records':undefined,
      format:text(input,'preferredFormat')??(category==='complaint-intake-and-tracking'||category==='evidence-and-media-indexes'?'native export, CSV, JSON, or other structured format where maintained':undefined),
    })),
  }
}

export const INTERNAL_AFFAIRS_FINDINGS=['MISSING_REQUESTED_CATEGORY','REFERENCED_RECORD_NOT_PRODUCED','INCIDENT_IDENTIFIER_MISMATCH','DATE_GAP','DUPLICATE_RECORD','MISSING_MEDIA','UNEXPLAINED_WITHHOLDING','REDACTION_REVIEW','PARTIAL_PRODUCTION','UNRESPONSIVE_ITEM'] as const

export const internalAffairsRecordsWorkflow:RecordsWorkflow=createRecordsWorkflow({
  id:'internal-affairs-records',
  name:'Internal Affairs & Professional Standards Records Request',
  description:'Build a targeted request for complaint intake, internal-affairs investigation records, professional-standards review, interviews, evidence indexes, findings/dispositions, command review, policies, referrals/corrective action, retention/withholding, and request/release status.',
  searchIntent:'internal affairs records request',
  seo:{title:'Internal Affairs Records Request — Police Complaint, Findings & Review Records',description:'Request police internal-affairs and professional-standards complaint records, investigation materials, evidence indexes, findings/dispositions, command review, policies, referrals, withholding records, and release status.',canonicalPath:'/workflows/internal-affairs-records'},
  intakeVersion:'2.0.0',
  intake:INTERNAL_AFFAIRS_INTAKE,
  capabilities:INTERNAL_AFFAIRS_CAPABILITIES,
  request:{categories:INTERNAL_AFFAIRS_RECORD_CATEGORIES,build:buildInternalAffairsRecordsRequest},
  validate:validateInternalAffairs,
  policies:[{jurisdiction:'all',version:'2.0.0',rules:{requestDisclosableRecordsAndSegregablePortionsOnly:true,requestEvidenceIndexesPoliciesFindingsRetentionWithholdingAndReleaseStatusSeparately:true,preserveRequesterSuppliedComplaintIncidentOfficerPersonRelationshipAndAllegationAsUnverifiedUnlessSupported:true,preserveComplaintAllegationStatementInvestigatorNotePreliminaryAssessmentFindingDispositionWithdrawalAdministrativeClosureReferralCorrectiveActionDisciplineAndAdjudicationDistinctions:true,doNotTreatComplaintAllegationReferralTrainingAssignmentCorrectiveActionInvestigatorNoteOrReviewAsProofOfMisconductDisciplineOrFinalDisposition:true,doNotAssumePersonnelComplainantVictimWitnessJuvenileMedicalConfidentialSourceWhistleblowerHomeContactSocialSecurityFinancialPrivilegedDeliberativeSecurityOrAuthenticationDataIsPublic:true,doNotInventCaseExistenceComplaintOrIncidentNumbersOfficerAssignmentsInvestigativeStepsFindingsDispositionsDisciplineRetentionDeletionSearchCompletenessAgencyFactsOrRequestStatus:true,doNotInferSpoliationUnlawfulWithholdingPrivilegeWaiverMisconductOrLegalViolationsWithoutVerifiedEvidenceAndAuthority:true,doNotAssertJurisdictionSpecificDeadlinesExemptionsPrivilegesDisclosureRightsReviewRightsOrAccessEntitlementWithoutVerifiedAuthority:true,doNotRequestPasswordsSecurityAnswersOneTimeCodesAuthenticationTokensPaymentCredentialsPrivateKeysCaseManagementOrEvidenceSystemCredentialsInternalServerAddressesOrSecurityConfiguration:true,requireHumanReviewWhenConsequentialPersonnelPrivacyPrivilegeFindingDispositionDisciplineRetentionDeletionIdentityVerificationAccessLegalOrSensitiveInformationQuestionIsUnclear:true}}],
  responseAnalysis:{findingTypes:INTERNAL_AFFAIRS_FINDINGS,async analyze(input:unknown){
    if(!input||typeof input!=='object') throw new Error('INTERNAL_AFFAIRS_PRODUCTION_ANALYSIS_INPUT_INVALID')
    const source=input as {requestedItems?:readonly {category:string;description:string}[];records?:readonly PoliceProductionRecord[];identifiers?:PoliceProductionIdentifiers}
    const records=source.records??[]
    const requested=(source.requestedItems??[]).map(item=>({id:item.category,label:item.category,keywords:item.description.split(/\W+/).filter(word=>word.length>=4).slice(0,20)}))
    const deterministic=analyzePoliceProduction(requested,records,source.identifiers??{})
    const providers=getConfiguredRecordsLlmProviders()
    if(providers.length<2) return deterministic
    const policy={minimumProviders:2,agreementThreshold:0.67,maxProviders:3} as const
    const analyzed=await Promise.all(records.slice(0,20).map(async record=>({id:record.id,classification:await classifyPoliceRecord(providers,record,policy),facts:await extractPoliceIncidentFacts(providers,record,policy)})))
    const contradictions:Array<{leftId:string;rightId:string;result:Awaited<ReturnType<typeof assessPoliceContradiction>>}>=[]
    for(let i=0;i<Math.min(records.length,8);i+=1){for(let j=i+1;j<Math.min(records.length,8);j+=1){contradictions.push({leftId:records[i].id,rightId:records[j].id,result:await assessPoliceContradiction(providers,records[i],records[j],policy)})}}
    const strategy=await recommendPoliceFollowUp(providers,{workflow:'internal-affairs-records',deterministic,requestedItems:source.requestedItems??[],identifiers:source.identifiers??{},records:records.slice(0,20).map(record=>({id:record.id,filename:record.filename,category:record.category,text:record.text??''})),extracted:analyzed.map(item=>({id:item.id,classification:item.classification.value,facts:item.facts.value})),contradictions:contradictions.filter(item=>item.result.value.contradictory).map(item=>({leftId:item.leftId,rightId:item.rightId,analysis:item.result.value}))},policy)
    return {...deterministic,aiStrategy:strategy.value,aiProvenance:{providers:strategy.providers,confidence:strategy.confidence,disagreements:strategy.disagreements,warnings:strategy.warnings},aiRecordAnalysis:analyzed.map(item=>({id:item.id,classification:item.classification.value,facts:item.facts.value,classificationProvenance:item.classification.providers,factProvenance:item.facts.providers})),aiContradictions:contradictions.filter(item=>item.result.value.contradictory).map(item=>({leftId:item.leftId,rightId:item.rightId,analysis:item.result.value,providers:item.result.providers}))}
  }},
})
