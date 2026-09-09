import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import type { RecordsDomainCapability } from './domain-pack'
import { analyzePoliceProduction, type PoliceProductionIdentifiers, type PoliceProductionRecord } from './police-records-analysis'
import { assessPoliceContradiction, classifyPoliceRecord, extractPoliceIncidentFacts, recommendPoliceFollowUp } from './police-records-ai'
import { getConfiguredRecordsLlmProviders } from '../ai/records-llm-providers'

export const DISPATCH_911_RECORD_CATEGORIES = [
  '911-call-audio',
  '911-call-logs',
  'cad-event-history',
  'dispatch-radio-audio',
  'radio-and-dispatch-logs',
  'unit-assignments-and-status',
  'event-timestamps-and-disposition',
  'incident-and-supplemental-reports',
  'retention-and-deletion-records',
  'redaction-and-withholding-records',
  'request-status-and-release-records',
] as const

export const DISPATCH_911_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence',
  'research', 'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review',
  'approval', 'mailing', 'tracking', 'proofAudit',
]

export const DISPATCH_911_INTAKE = [
  { id:'agency', label:'Agency / dispatch center', required:true, helpText:'Police, sheriff, fire/EMS communications center, PSAP, consolidated dispatch, or other public custodian.' },
  { id:'jurisdiction', label:'Jurisdiction', required:true, helpText:'Federal, state, county, city, district, regional, or other jurisdiction whose access and records rules may apply.' },
  { id:'department', label:'Likely records / communications unit', helpText:'Dispatch, communications, records, emergency communications, radio, or another likely custodian.' },
  { id:'incidentDate', label:'Incident date', required:true, helpText:'Date of the call or dispatched event.' },
  { id:'timeStart', label:'Approximate start time', helpText:'Beginning of the call/event window when known.' },
  { id:'timeEnd', label:'Approximate end time', helpText:'End of the call/event window when known.' },
  { id:'incidentNumber', label:'Incident / CAD / event number', helpText:'CAD, call-for-service, incident, report, fire/EMS, or event identifier when known.' },
  { id:'location', label:'Incident location', required:true, helpText:'Address, intersection, business, parcel, facility, road segment, or other location associated with the event.' },
  { id:'callerPhone', label:'Caller phone number (optional)', helpText:'Provide only if already known, appropriate, and useful to identify the call. Do not provide account credentials, access codes, or unrelated private numbers.' },
  { id:'person', label:'Person / entity involved', helpText:'Requester-supplied name of a caller, subject, reporting party, victim, witness, business, or other involved person/entity when lawfully appropriate.' },
  { id:'subjectMatter', label:'What happened', required:true, helpText:'Plain-English description of the call, response, or incident. Describe disputed allegations as allegations rather than established facts.' },
  { id:'requesterRelationship', label:'Requester relationship / access context', helpText:'Optional requester-supplied context such as caller, involved party, parent/guardian, attorney, insurer, media, researcher, or general public. This does not establish legal entitlement by itself.' },
  { id:'preferredFormat', label:'Preferred format', helpText:'Native audio plus associated metadata, structured CAD export, CSV/JSON logs, PDF, or another available format.' },
  { id:'exclusions', label:'Scope exclusions / narrowing', helpText:'Optional exclusions that reduce noise without changing the event-record objective.' },
] as const

function text(input:Record<string,unknown>, key:string):string|undefined { const raw=input[key]; if(typeof raw!=='string') return undefined; const value=raw.trim(); return value||undefined }
function selectedCategories(input:Record<string,unknown>):string[] { const raw=input.categories; if(!Array.isArray(raw)) return [...DISPATCH_911_RECORD_CATEGORIES]; const known=new Set(DISPATCH_911_RECORD_CATEGORIES); const selected=raw.filter((entry):entry is string=>typeof entry==='string'&&known.has(entry as typeof DISPATCH_911_RECORD_CATEGORIES[number])); return selected.length?selected:[...DISPATCH_911_RECORD_CATEGORIES] }

function identifyingScope(input:Record<string,unknown>):string {
  const values=[
    text(input,'incidentNumber')&&`incident/CAD/event identifier ${text(input,'incidentNumber')}`,
    text(input,'location')&&`location ${text(input,'location')}`,
    text(input,'callerPhone')&&`requester-supplied caller number ${text(input,'callerPhone')}`,
    text(input,'person')&&`requester-supplied person/entity identifier ${text(input,'person')}`,
    text(input,'department')&&`likely unit/custodian ${text(input,'department')}`,
  ].filter(Boolean)
  const date=text(input,'incidentDate'); const start=text(input,'timeStart'); const end=text(input,'timeEnd')
  const time=start||end?`, approximately ${start??'unknown start'} through ${end??'unknown end'}`:''
  const format=text(input,'preferredFormat')?` Preferred format: ${text(input,'preferredFormat')}.`:''
  const exclusions=text(input,'exclusions')?` Scope exclusions/narrowing: ${text(input,'exclusions')}.`:''
  const relationship=text(input,'requesterRelationship')?` Requester-supplied relationship/access context: ${text(input,'requesterRelationship')} (not treated as verified entitlement unless established by applicable authority or agency records).`:''
  return `${values.length?` Search using these requester-supplied identifiers: ${values.join('; ')}.`:''}${date?` Event date: ${date}${time}.`:''}${format}${exclusions}${relationship}`
}

function describe(category:string,input:Record<string,unknown>):string {
  const scope=identifyingScope(input)
  const subject=text(input,'subjectMatter')?` Event description supplied by requester: ${text(input,'subjectMatter')}. Preserve whether statements are caller reports, allegations, dispatcher annotations, officer/first-responder observations, arrests/citations, dispositions, or adjudicated findings; do not convert call, CAD, radio, or report content into a broader established fact beyond what the record supports.`:''
  const descriptions:Record<string,string>={
    '911-call-audio':`Lawfully accessible audio recordings of 911, emergency, non-emergency, transferred, or related calls associated with the identified event, including responsive separate call segments where maintained. Do not assume caller identity, phone number, precise private location, medical information, victim/witness information, juvenile information, or unredacted audio is publicly disclosable.${scope}`,
    '911-call-logs':`Lawfully accessible call-detail records, call-taker logs, queue/transfer history, call identifiers, timestamps, disposition fields, and non-secret call metadata sufficient to identify responsive calls. Do not request telecommunications credentials, authentication data, internal network details, or unrelated caller data.${scope}`,
    'cad-event-history':`Existing CAD or call-for-service event history, including event creation, comments/narrative where lawfully accessible, updates, priority changes, unit activity, timestamps, disposition, cross-references, and event identifiers. Request event records, not CAD credentials, internal security configuration, authentication tokens, or sensitive system-administration details.${scope}`,
    'dispatch-radio-audio':`Lawfully accessible recorded dispatch and radio traffic associated with the identified event, including responsive dispatch, tactical, primary, or mutual-aid traffic where maintained and disclosable. Do not demand encryption keys, radio-system credentials, security-sensitive channel plans, or unrelated tactical communications.${scope}`,
    'radio-and-dispatch-logs':`Lawfully accessible radio logs, dispatch logs, console event records, transmission indexes, non-secret channel/talkgroup references, timestamps, and related communications metadata associated with the event. Do not request credentials, encryption material, internal network topology, or security-sensitive configuration.${scope}`,
    'unit-assignments-and-status':`Lawfully accessible records identifying responding units/personnel, assignment times, en-route/arrival/clear times, unit-status changes, and related response history for the identified event. Do not request unrelated real-time personnel tracking, unrelated historical location data, or security-sensitive deployment information.${scope}`,
    'event-timestamps-and-disposition':`Existing timestamp and disposition records showing call receipt, dispatch, acknowledgment, arrival, clearing, closure, cancellation, transfer, or other material event-state changes. Preserve the agency's actual disposition/status labels rather than treating them as proof of guilt, fault, or adjudication.${scope}`,
    'incident-and-supplemental-reports':`Lawfully accessible incident, offense, arrest, supplemental, field-contact, fire/EMS, medical-response, or other reports created from or linked to the identified dispatch event. Do not assume medical, victim/witness, juvenile, confidential-source, or other protected information is public; an allegation, arrest, citation, or responder narrative is not an adjudicated finding.${scope}`,
    'retention-and-deletion-records':`Existing retention classifications, deletion schedules, actual deletion-event records, preservation holds, overwrite/status records, or records showing the maintained preservation status of responsive call audio, radio audio, CAD, or dispatch data. Do not infer deletion, spoliation, misconduct, or a legal violation unless supported by verified records and applicable authority.${scope}`,
    'redaction-and-withholding-records':`Existing records identifying redactions, withheld audio/data, redaction logs, withholding determinations, and the agency's actually stated basis for material not produced. Preserve the stated basis rather than inventing an exemption, privilege, deadline, disclosure right, violation, or review route.${scope}`,
    'request-status-and-release-records':`Existing acknowledgment, request/search status, fee, clarification, transfer/referral, identity/access-verification requirement, no-records response, retention/deletion statement, production manifest, release/export record, partial-production notice, closure, and review/appeal instructions where actually stated. Preserve the agency's actual statement and do not invent access entitlement, completeness, deadlines, exemptions, or review rights.${scope}`,
  }
  return `${descriptions[category]??`Existing 911/dispatch records concerning ${category}.${scope}`}${subject}`
}

function validateDispatch911(request:ValidatedRequest):readonly {field:string;message:string}[] {
  const issues:{field:string;message:string}[]=[]; const corpus=request.items.map(item=>item.description.toLowerCase()).join(' ')
  if(!request.agency?.trim()) issues.push({field:'agency',message:'Identify the agency, dispatch center, or public body.'})
  if(!request.jurisdiction?.trim()) issues.push({field:'jurisdiction',message:'Identify the relevant jurisdiction.'})
  if(!corpus.includes('location ')) issues.push({field:'location',message:'Provide the incident location so the dispatch event can be identified.'})
  if(!corpus.includes('event date:')) issues.push({field:'incidentDate',message:'Provide the incident date so the call and CAD records can be located.'})
  if(!corpus.includes('event description supplied by requester:')) issues.push({field:'subjectMatter',message:'Describe the call, response, or incident in plain language.'})
  return issues
}

export function buildDispatch911RecordsRequest(input:Record<string,unknown>) {
  const incidentNumber=text(input,'incidentNumber'); const location=text(input,'location'); const incidentDate=text(input,'incidentDate'); const subjectMatter=text(input,'subjectMatter'); const categories=selectedCategories(input)
  return {
    title:`911 & Dispatch Records — ${incidentNumber??location??incidentDate??'Event'}`,
    agency:text(input,'agency')??'', jurisdiction:text(input,'jurisdiction'),
    purpose:text(input,'purpose')??'Identify, preserve, obtain, and compare lawfully accessible emergency-call, dispatch, CAD, radio, unit-response, retention, and release records for the specified event while preserving privacy and record-status distinctions.',
    scope:JSON.stringify({workflow:'dispatch-911-records',incidentDate,timeStart:text(input,'timeStart'),timeEnd:text(input,'timeEnd'),incidentNumber,location,callerPhone:text(input,'callerPhone'),person:text(input,'person'),department:text(input,'department'),subjectMatter,requesterRelationship:text(input,'requesterRelationship'),preferredFormat:text(input,'preferredFormat'),exclusions:text(input,'exclusions')}),
    items:categories.map(category=>({
      category,description:describe(category,input),dateStart:incidentDate,dateEnd:incidentDate,custodian:text(input,'department'),
      systemHint:category==='cad-event-history'||category==='unit-assignments-and-status'||category==='event-timestamps-and-disposition'?'CAD / call-for-service records':category.includes('audio')||category.includes('radio')?'911 / dispatch recording or radio logging records':undefined,
      format:text(input,'preferredFormat')??(category.includes('audio')?'native digital audio files where available, with associated metadata preserved separately':category.includes('logs')||category==='cad-event-history'||category==='event-timestamps-and-disposition'?'native export, CSV, JSON, or other structured format where maintained':undefined),
    })),
  }
}

export const DISPATCH_911_FINDINGS=['MISSING_REQUESTED_CATEGORY','REFERENCED_RECORD_NOT_PRODUCED','INCIDENT_IDENTIFIER_MISMATCH','DATE_GAP','DUPLICATE_RECORD','MISSING_MEDIA','UNEXPLAINED_WITHHOLDING','REDACTION_REVIEW','PARTIAL_PRODUCTION','UNRESPONSIVE_ITEM'] as const

export const dispatch911RecordsWorkflow:RecordsWorkflow=createRecordsWorkflow({
  id:'dispatch-911-records',name:'911 Call & Dispatch Records Request',description:'Build a focused request for 911 audio, call logs, CAD history, radio traffic, unit assignments, timestamps/dispositions, linked reports, retention records, redaction records, and request/release status.',searchIntent:'911 call records request',
  seo:{title:'911 Call Records Request — Audio, CAD, Radio & Dispatch Logs',description:'Request 911 audio, call logs, CAD event history, radio traffic, unit assignments, response timestamps, retention records, redaction records, and release-status evidence for a specific incident.',canonicalPath:'/workflows/dispatch-911-records'},
  intakeVersion:'2.0.0',intake:DISPATCH_911_INTAKE,capabilities:DISPATCH_911_CAPABILITIES,request:{categories:DISPATCH_911_RECORD_CATEGORIES,build:buildDispatch911RecordsRequest},validate:validateDispatch911,
  policies:[{jurisdiction:'all',version:'2.0.0',rules:{requestNativeAudioAndStructuredCadLogsSeparatelyWhereLawfullyAccessible:true,requestRetentionDeletionRedactionAndReleaseStatusEvidence:true,preserveEventIdentifiersTimestampsDispositionCallerPersonLocationFormatAndRequesterRelationshipAsRequesterSuppliedUnlessVerified:true,preserveCallerReportAllegationDispatcherAnnotationResponderObservationArrestCitationDispositionAndAdjudicationDistinctions:true,doNotTreatReferencedAudioAsProducedOrAssumeUnredactedAudioCallerIdentityPhonePrecisePrivateLocationOrMedicalInformationIsDisclosable:true,doNotInventCallAudioCadRadioRecordExistenceUnitAssignmentsRetentionDeletionPreservationStatusSearchCompletenessAgencyFactsOrRequestStatus:true,doNotAssertJurisdictionSpecificDeadlinesExemptionsPrivilegesDisclosureRightsReviewRightsAccessEntitlementSpoliationMisconductOrViolationsWithoutVerifiedAuthority:true,doNotTreatVictimWitnessJuvenileMedicalConfidentialSourcePersonnelPrivilegedSecurityContactLocationOrAuthenticationDataAsAutomaticallyPublic:true,doNotRequestPasswordsSecurityAnswersOneTimeCodesAuthenticationTokensPaymentCredentialsEncryptionKeysPrivateKeysCadRadioTelecomSystemSecretsInternalNetworkDetailsOrSecurityConfiguration:true,requireHumanReviewWhenConsequentialAccessPrivacyMedicalPrivilegeRetentionDeletionIdentityVerificationLegalCallerLocationOrSensitiveInformationQuestionIsUnclear:true}}],
  responseAnalysis:{findingTypes:DISPATCH_911_FINDINGS,async analyze(input:unknown){
    if(!input||typeof input!=='object') throw new Error('DISPATCH_911_PRODUCTION_ANALYSIS_INPUT_INVALID')
    const source=input as {requestedItems?:readonly {category:string;description:string}[];records?:readonly PoliceProductionRecord[];identifiers?:PoliceProductionIdentifiers}; const records=source.records??[]
    const requested=(source.requestedItems??[]).map(item=>({id:item.category,label:item.category,keywords:item.description.split(/\W+/).filter(word=>word.length>=4).slice(0,20)})); const deterministic=analyzePoliceProduction(requested,records,source.identifiers??{}); const providers=getConfiguredRecordsLlmProviders(); if(providers.length<2) return deterministic
    const policy={minimumProviders:2,agreementThreshold:0.67,maxProviders:3} as const; const analyzed=await Promise.all(records.slice(0,20).map(async record=>({id:record.id,classification:await classifyPoliceRecord(providers,record,policy),facts:await extractPoliceIncidentFacts(providers,record,policy)}))); const contradictions:Array<{leftId:string;rightId:string;result:Awaited<ReturnType<typeof assessPoliceContradiction>>}>=[]
    for(let i=0;i<Math.min(records.length,8);i+=1){for(let j=i+1;j<Math.min(records.length,8);j+=1){contradictions.push({leftId:records[i].id,rightId:records[j].id,result:await assessPoliceContradiction(providers,records[i],records[j],policy)})}}
    const strategy=await recommendPoliceFollowUp(providers,{workflow:'dispatch-911-records',deterministic,requestedItems:source.requestedItems??[],identifiers:source.identifiers??{},records:records.slice(0,20).map(record=>({id:record.id,filename:record.filename,category:record.category,text:record.text??''})),extracted:analyzed.map(item=>({id:item.id,classification:item.classification.value,facts:item.facts.value})),contradictions:contradictions.filter(item=>item.result.value.contradictory).map(item=>({leftId:item.leftId,rightId:item.rightId,analysis:item.result.value}))},policy)
    return {...deterministic,aiStrategy:strategy.value,aiProvenance:{providers:strategy.providers,confidence:strategy.confidence,disagreements:strategy.disagreements,warnings:strategy.warnings},aiRecordAnalysis:analyzed.map(item=>({id:item.id,classification:item.classification.value,facts:item.facts.value,classificationProvenance:item.classification.providers,factProvenance:item.facts.providers})),aiContradictions:contradictions.filter(item=>item.result.value.contradictory).map(item=>({leftId:item.leftId,rightId:item.rightId,analysis:item.result.value,providers:item.result.providers}))}
  }},
})
