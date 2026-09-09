import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import type { RecordsDomainCapability } from './domain-pack'
import { analyzePoliceProduction, type PoliceProductionIdentifiers, type PoliceProductionRecord } from './police-records-analysis'
import { assessPoliceContradiction, classifyPoliceRecord, extractPoliceIncidentFacts, recommendPoliceFollowUp } from './police-records-ai'
import { getConfiguredRecordsLlmProviders } from '../ai/records-llm-providers'

export const DASH_CAMERA_RECORD_CATEGORIES = [
  'dash-camera-recordings',
  'dash-camera-metadata',
  'activation-and-event-logs',
  'audit-and-access-logs',
  'vehicle-and-unit-assignment-records',
  'dispatch-and-cad',
  'incident-and-supplemental-reports',
  'evidence-indexes',
  'retention-and-deletion-records',
  'redaction-and-withholding-records',
  'request-status-and-release-records',
] as const

export const DASH_CAMERA_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const DASH_CAMERA_INTAKE = [
  { id:'agency', label:'Law-enforcement agency', required:true, helpText:'Police department, sheriff, state police, highway patrol, campus police, transit police, or other public agency likely to hold in-car video.' },
  { id:'jurisdiction', label:'Jurisdiction', required:true, helpText:'Federal, state, county, city, district, campus, transit, or other jurisdiction whose access and records rules may apply.' },
  { id:'department', label:'Likely records / evidence / fleet unit', helpText:'Records, evidence, fleet, digital evidence, traffic, patrol, or another likely custodian.' },
  { id:'incidentDate', label:'Incident date', required:true, helpText:'Date of the stop, pursuit, collision, transport, or other event.' },
  { id:'timeStart', label:'Approximate start time', helpText:'Beginning of the relevant recording window.' },
  { id:'timeEnd', label:'Approximate end time', helpText:'End of the relevant recording window.' },
  { id:'incidentNumber', label:'Incident / report / CAD number', helpText:'Case, report, CAD, call-for-service, citation, pursuit, collision, or event number when known.' },
  { id:'location', label:'Incident location', required:true, helpText:'Roadway, address, intersection, mile marker, business, facility, or other specific location.' },
  { id:'person', label:'Person / entity involved', helpText:'Requester-supplied name of a driver, passenger, subject, reporting party, victim, witness, business, or other involved person/entity when lawfully appropriate.' },
  { id:'vehicle', label:'Vehicle / unit identifier', helpText:'Plate, VIN, make/model, patrol unit, fleet number, vehicle number, or other identifier.' },
  { id:'officerNames', label:'Officer / unit identifiers', helpText:'Known officer names, badge numbers, unit numbers, vehicle/unit identifiers, or roles.' },
  { id:'subjectMatter', label:'What happened', required:true, helpText:'Plain-English description of the stop, pursuit, collision, transport, or encounter. Describe disputed allegations as allegations rather than established facts.' },
  { id:'requesterRelationship', label:'Requester relationship / access context', helpText:'Optional requester-supplied context such as involved party, attorney, insurer, media, researcher, or general public. This does not establish legal entitlement by itself.' },
  { id:'preferredFormat', label:'Preferred format', helpText:'Native video and metadata where available, original digital files, CSV/JSON logs, PDF, or another available format.' },
  { id:'exclusions', label:'Scope exclusions / narrowing', helpText:'Optional exclusions that reduce noise without changing the dash-camera objective.' },
] as const

function text(input:Record<string,unknown>, key:string):string|undefined {
  const raw=input[key]
  if(typeof raw!=='string') return undefined
  const value=raw.trim()
  return value||undefined
}

function selectedCategories(input:Record<string,unknown>):string[] {
  const raw=input.categories
  if(!Array.isArray(raw)) return [...DASH_CAMERA_RECORD_CATEGORIES]
  const known=new Set(DASH_CAMERA_RECORD_CATEGORIES)
  const selected=raw.filter((entry):entry is string=>typeof entry==='string'&&known.has(entry as typeof DASH_CAMERA_RECORD_CATEGORIES[number]))
  return selected.length?selected:[...DASH_CAMERA_RECORD_CATEGORIES]
}

function scopeText(input:Record<string,unknown>):string {
  const ids=[
    text(input,'incidentNumber')&&`incident/report/CAD identifier ${text(input,'incidentNumber')}`,
    text(input,'location')&&`location ${text(input,'location')}`,
    text(input,'person')&&`requester-supplied person/entity identifier ${text(input,'person')}`,
    text(input,'vehicle')&&`vehicle/unit identifier ${text(input,'vehicle')}`,
    text(input,'officerNames')&&`officer/unit identifiers ${text(input,'officerNames')}`,
    text(input,'department')&&`likely unit/custodian ${text(input,'department')}`,
  ].filter(Boolean)
  const date=text(input,'incidentDate')
  const start=text(input,'timeStart')
  const end=text(input,'timeEnd')
  const time=start||end?`, approximately ${start??'unknown start'} through ${end??'unknown end'}`:''
  const format=text(input,'preferredFormat')?` Preferred format: ${text(input,'preferredFormat')}.`:''
  const exclusions=text(input,'exclusions')?` Scope exclusions/narrowing: ${text(input,'exclusions')}.`:''
  const relationship=text(input,'requesterRelationship')?` Requester-supplied relationship/access context: ${text(input,'requesterRelationship')} (not treated as verified entitlement unless established by applicable authority or agency records).`:''
  return `${ids.length?` Search using these requester-supplied identifiers: ${ids.join('; ')}.`:''}${date?` Incident date: ${date}${time}.`:''}${format}${exclusions}${relationship}`
}

function describe(category:string,input:Record<string,unknown>):string {
  const scope=scopeText(input)
  const subject=text(input,'subjectMatter')?` Event description supplied by requester: ${text(input,'subjectMatter')}. Preserve whether statements are allegations, reported observations, officer narratives/conclusions, arrests/citations, charges, dispositions, or adjudicated findings; do not convert the content of a recording or police report into a broader established fact beyond what the record supports.`:''
  const descriptions:Record<string,string>={
    'dash-camera-recordings':`Lawfully accessible in-car, dash-camera, mobile-video, forward-facing, rear-facing, cabin, or synchronized patrol-vehicle recordings depicting or capturing the identified event, including separate responsive files from each involved vehicle where maintained. Do not assume an unredacted version, unrelated private footage, or unrelated location history is publicly disclosable.${scope}`,
    'dash-camera-metadata':`Lawfully accessible native metadata for responsive in-car video, including recording identifiers, non-secret vehicle/unit/device identifiers, assigned officer, capture timestamps, duration, upload timestamps, filenames, hashes where maintained, and location metadata tied to responsive recordings where lawfully accessible. Do not request passwords, tokens, private keys, internal server addresses, evidence-system credentials, or security-sensitive configuration.${scope}`,
    'activation-and-event-logs':`Lawfully accessible activation, deactivation, event-trigger, buffering, synchronization, upload, tagging, categorization, fault, export, and other event records associated with responsive in-car recordings. Request operational event history needed to evaluate completeness, not authentication secrets or security-control configuration.${scope}`,
    'audit-and-access-logs':`Lawfully accessible audit history showing viewing, export, copying, modification, redaction, sharing, download, or other handling events for responsive recordings where maintained. Request non-secret activity records only; do not demand credentials, internal network details, access-control secrets, or unrelated personnel/security data.${scope}`,
    'vehicle-and-unit-assignment-records':`Lawfully accessible patrol vehicle, fleet/unit, officer assignment, shift, equipment assignment, camera assignment, and related records sufficient to identify which vehicle-camera systems may have captured the event. Do not request fleet-system credentials, real-time security configuration, or unrelated officer-location history.${scope}`,
    'dispatch-and-cad':`Existing CAD, call-for-service, dispatch, radio-event, unit-assignment, timestamp, response/disposition, and related records associated with the event where lawfully accessible.${scope}`,
    'incident-and-supplemental-reports':`Lawfully accessible incident, traffic-stop, citation, arrest, collision, pursuit, supplemental, field-contact, or other reports associated with the same event. An allegation, arrest, citation, charge, or officer narrative is not an adjudicated finding merely because it appears in a police record.${scope}`,
    'evidence-indexes':`Lawfully accessible digital-evidence inventories, media indexes, attachment lists, evidence/property references, file manifests, and cross-references showing in-car video associated with the event. Request record evidence sufficient to identify responsive media, not evidence-system secrets or security-sensitive access details.${scope}`,
    'retention-and-deletion-records':`Existing retention classifications, preservation holds, deletion schedules, actual deletion-event records, overwrite/status records, and other records showing the maintained preservation status of responsive in-car media. Do not infer deletion, spoliation, misconduct, or a legal violation unless supported by verified records and applicable authority.${scope}`,
    'redaction-and-withholding-records':`Existing records identifying redactions, withheld segments, redaction logs, redacted-export history, withholding determinations, and the agency's actually stated basis for material not produced. Preserve the stated basis rather than inventing an exemption, privilege, deadline, disclosure right, violation, or review route.${scope}`,
    'request-status-and-release-records':`Existing acknowledgment, request/search status, fee, clarification, transfer/referral, identity/access-verification requirement, no-records response, retention/deletion statement, production manifest, release/export record, partial-production notice, closure, and review/appeal instructions where actually stated. Preserve the agency's actual statement and do not invent access entitlement, completeness, deadlines, exemptions, or review rights.${scope}`,
  }
  return `${descriptions[category]??`Existing dash-camera records concerning ${category}.${scope}`}${subject}`
}

function validateDashCamera(request:ValidatedRequest):readonly {field:string;message:string}[] {
  const issues:{field:string;message:string}[]=[]
  const corpus=request.items.map(item=>item.description.toLowerCase()).join(' ')
  if(!request.agency?.trim()) issues.push({field:'agency',message:'Identify the law-enforcement agency or public body.'})
  if(!request.jurisdiction?.trim()) issues.push({field:'jurisdiction',message:'Identify the relevant jurisdiction.'})
  if(!corpus.includes('location ')) issues.push({field:'location',message:'Provide the event location so responsive vehicle-camera records can be identified.'})
  if(!corpus.includes('incident date:')) issues.push({field:'incidentDate',message:'Provide the incident date so responsive recordings can be located.'})
  if(!corpus.includes('event description supplied by requester:')) issues.push({field:'subjectMatter',message:'Describe the stop, pursuit, collision, transport, or encounter in plain language.'})
  return issues
}

export function buildDashCameraRecordsRequest(input:Record<string,unknown>) {
  const incidentNumber=text(input,'incidentNumber')
  const location=text(input,'location')
  const incidentDate=text(input,'incidentDate')
  const subjectMatter=text(input,'subjectMatter')
  const categories=selectedCategories(input)
  return {
    title:`Dash Camera Records — ${incidentNumber??location??incidentDate??'Incident'}`,
    agency:text(input,'agency')??'',
    jurisdiction:text(input,'jurisdiction'),
    purpose:text(input,'purpose')??'Identify, preserve, obtain, and review lawfully accessible in-car camera recordings and the metadata, assignments, logs, dispatch records, evidence indexes, retention records, and release evidence needed to evaluate production completeness.',
    scope:JSON.stringify({workflow:'dash-camera-records',incidentDate,timeStart:text(input,'timeStart'),timeEnd:text(input,'timeEnd'),incidentNumber,location,person:text(input,'person'),vehicle:text(input,'vehicle'),officerNames:text(input,'officerNames'),department:text(input,'department'),subjectMatter,requesterRelationship:text(input,'requesterRelationship'),preferredFormat:text(input,'preferredFormat'),exclusions:text(input,'exclusions')}),
    items:categories.map(category=>({
      category,
      description:describe(category,input),
      dateStart:incidentDate,
      dateEnd:incidentDate,
      custodian:text(input,'department'),
      systemHint:category.includes('dash-camera')||category.includes('activation')||category.includes('audit')?'in-car video / digital evidence management system':category==='dispatch-and-cad'?'CAD / call-for-service system':category==='vehicle-and-unit-assignment-records'?'fleet / scheduling / unit assignment records':undefined,
      format:text(input,'preferredFormat')??(category==='dash-camera-recordings'?'native digital video files where available, with associated metadata preserved separately':category==='dash-camera-metadata'||category.includes('logs')?'native export, CSV, JSON, or other structured format where maintained':undefined),
    })),
  }
}

export const DASH_CAMERA_FINDINGS=['MISSING_REQUESTED_CATEGORY','REFERENCED_RECORD_NOT_PRODUCED','INCIDENT_IDENTIFIER_MISMATCH','DATE_GAP','DUPLICATE_RECORD','MISSING_MEDIA','UNEXPLAINED_WITHHOLDING','REDACTION_REVIEW','PARTIAL_PRODUCTION','UNRESPONSIVE_ITEM'] as const

export const dashCameraRecordsWorkflow:RecordsWorkflow=createRecordsWorkflow({
  id:'dash-camera-records',
  name:'Dash Camera Records Request',
  description:'Build an incident-specific request for in-car video, metadata, activation/audit logs, unit assignments, CAD, reports, evidence indexes, retention records, redaction records, and request/release status.',
  searchIntent:'dash camera records request',
  seo:{title:'Dash Camera Records Request — Police In-Car Video, Metadata & Logs',description:'Request police dash-camera and in-car video plus metadata, logs, unit assignments, CAD, reports, evidence indexes, retention status, redaction records, and release-status records for a specific incident.',canonicalPath:'/workflows/dash-camera-records'},
  intakeVersion:'2.0.0',
  intake:DASH_CAMERA_INTAKE,
  capabilities:DASH_CAMERA_CAPABILITIES,
  request:{categories:DASH_CAMERA_RECORD_CATEGORIES,build:buildDashCameraRecordsRequest},
  validate:validateDashCamera,
  policies:[{jurisdiction:'all',version:'2.0.0',rules:{requestNativeMediaAndMetadataSeparatelyWhereLawfullyAccessible:true,requestUnitAssignmentsRetentionDeletionRedactionAndReleaseStatusEvidence:true,preserveIncidentOfficerUnitVehiclePersonLocationTimeFormatAndRequesterRelationshipAsRequesterSuppliedUnlessVerified:true,preserveAllegationObservationNarrativeArrestCitationChargeDispositionAndAdjudicationDistinctions:true,doNotTreatReferencedMediaAsProducedOrAssumeUnredactedMediaOrUnrelatedLocationHistoryIsDisclosable:true,doNotInventRecordingExistenceOfficerVehicleAssignmentActivationEventsRetentionDeletionPreservationStatusSearchCompletenessAgencyFactsOrRequestStatus:true,doNotAssertJurisdictionSpecificDeadlinesExemptionsPrivilegesDisclosureRightsReviewRightsAccessEntitlementSpoliationMisconductOrViolationsWithoutVerifiedAuthority:true,doNotTreatVictimWitnessJuvenileMedicalConfidentialSourcePersonnelPrivilegedDeliberativeLocationContactSecurityOrAuthenticationDataAsAutomaticallyPublic:true,doNotRequestPasswordsSecurityAnswersOneTimeCodesAuthenticationTokensPaymentCredentialsPrivateKeysInternalServerAddressesEvidenceOrFleetSystemSecretsOrSecurityConfiguration:true,requireHumanReviewWhenConsequentialAccessPrivacyPrivilegeRetentionDeletionIdentityVerificationLegalLocationOrSensitiveInformationQuestionIsUnclear:true}}],
  responseAnalysis:{
    findingTypes:DASH_CAMERA_FINDINGS,
    async analyze(input:unknown){
      if(!input||typeof input!=='object') throw new Error('DASH_CAMERA_PRODUCTION_ANALYSIS_INPUT_INVALID')
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
      const strategy=await recommendPoliceFollowUp(providers,{workflow:'dash-camera-records',deterministic,requestedItems:source.requestedItems??[],identifiers:source.identifiers??{},records:records.slice(0,20).map(record=>({id:record.id,filename:record.filename,category:record.category,text:record.text??''})),extracted:analyzed.map(item=>({id:item.id,classification:item.classification.value,facts:item.facts.value})),contradictions:contradictions.filter(item=>item.result.value.contradictory).map(item=>({leftId:item.leftId,rightId:item.rightId,analysis:item.result.value}))},policy)
      return {...deterministic,aiStrategy:strategy.value,aiProvenance:{providers:strategy.providers,confidence:strategy.confidence,disagreements:strategy.disagreements,warnings:strategy.warnings},aiRecordAnalysis:analyzed.map(item=>({id:item.id,classification:item.classification.value,facts:item.facts.value,classificationProvenance:item.classification.providers,factProvenance:item.facts.providers})),aiContradictions:contradictions.filter(item=>item.result.value.contradictory).map(item=>({leftId:item.leftId,rightId:item.rightId,analysis:item.result.value,providers:item.result.providers}))}
    },
  },
})
