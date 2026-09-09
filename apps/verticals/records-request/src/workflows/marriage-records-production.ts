import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import type { RecordsDomainCapability } from './domain-pack'
import { analyzeGenericProduction, type GenericProductionRecord } from './generic-records-analysis'
import { assessGenericRecordContradiction, classifyGenericRecord, extractGenericRecordFacts, recommendGenericRecordFollowUp } from './generic-records-ai'
import { getConfiguredRecordsLlmProviders } from '../ai/records-llm-providers'

export const MARRIAGE_RECORD_CATEGORIES = [
  'license-certificate-copy-type-and-availability',
  'index-registration-and-search-result-records',
  'public-confidential-and-restricted-access-status',
  'eligibility-relationship-and-authorization-requirements',
  'application-order-and-submission-requirements',
  'identity-verification-notarization-and-supporting-document-requirements',
  'license-issuance-solemnization-return-and-recording-status',
  'amendment-correction-and-status-records',
  'fees-processing-delivery-and-order-status-records',
  'agency-custodian-referral-and-jurisdiction-records',
  'denial-restriction-no-record-found-and-review-status',
] as const

export const MARRIAGE_RECORD_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification','extraction','deadline','contradiction','findings','evidence','research','risk','strategy','draft','draftProvenance','validation','review','approval','mailing','tracking','proofAudit',
]

export const MARRIAGE_RECORD_INTAKE = [
  { id: 'agency', label: 'Clerk / recorder / vital records office', required: true, helpText: 'County clerk, recorder, state vital records office, or other lawful custodian.' },
  { id: 'jurisdiction', label: 'Jurisdiction', required: true, helpText: 'State, county, territory, or other jurisdiction where the marriage was licensed or registered.' },
  { id: 'party1Name', label: 'First party name', required: true, helpText: 'Name of one party as it appears, or likely appears, on the record.' },
  { id: 'party2Name', label: 'Second party name', helpText: 'Name of the other party when known.' },
  { id: 'marriageYear', label: 'Marriage / license year', required: true, helpText: 'Year of marriage, license issuance, or registration.' },
  { id: 'licenseNumber', label: 'License / certificate number', helpText: 'License, certificate, book/page, instrument, or registration number when known.' },
  { id: 'requesterCapacity', label: 'Requester capacity', required: true, helpText: 'For example: party to the marriage, authorized representative, genealogical requester, or member of the public where the jurisdiction permits public access.' },
  { id: 'relationship', label: 'Relationship / authority', helpText: 'Relationship or legal authority supporting access if the requested record or copy is restricted.' },
  { id: 'copyType', label: 'Desired copy / record type', helpText: 'Certified, informational, public, confidential, verification, genealogical, or other jurisdiction-specific option where offered.' },
  { id: 'existingOrderNumber', label: 'Existing order / application number', helpText: 'Order, application, tracking, or correspondence number for a follow-up.' },
  { id: 'dateStart', label: 'Request / search period start', required: true, helpText: 'Beginning of the relevant search, order, or status period.' },
  { id: 'dateEnd', label: 'Request / search period end', required: true, helpText: 'End of the relevant search, order, or status period.' },
  { id: 'subjectMatter', label: 'Objective', required: true, helpText: 'Plain-English description of the license, certificate, verification, correction, or order-status objective.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined { const raw=input[key]; if(typeof raw!=='string')return undefined; const v=raw.trim(); return v||undefined }
function selectedCategories(input: Record<string, unknown>): string[] { const raw=input.categories; if(!Array.isArray(raw))return [...MARRIAGE_RECORD_CATEGORIES]; const known=new Set(MARRIAGE_RECORD_CATEGORIES); const selected=raw.filter((e):e is string=>typeof e==='string'&&known.has(e as typeof MARRIAGE_RECORD_CATEGORIES[number])); return selected.length?selected:[...MARRIAGE_RECORD_CATEGORIES] }
function scopeText(input: Record<string, unknown>): string {
  const identifiers=[text(input,'party1Name')&&`first party ${text(input,'party1Name')}`,text(input,'party2Name')&&`second party ${text(input,'party2Name')}`,text(input,'marriageYear')&&`marriage/license year ${text(input,'marriageYear')}`,text(input,'licenseNumber')&&`license/certificate number ${text(input,'licenseNumber')}`,text(input,'existingOrderNumber')&&`order/application number ${text(input,'existingOrderNumber')}`].filter(Boolean)
  const start=text(input,'dateStart'), end=text(input,'dateEnd')
  return `${identifiers.length?` Identify the matter using: ${identifiers.join('; ')}.`:''}${start&&end?` Cover request/search activity from ${start} through ${end}.`:''}`
}
function accessText(input: Record<string, unknown>): string { return `${text(input,'requesterCapacity')?` Requester capacity: ${text(input,'requesterCapacity')}.`:''}${text(input,'relationship')?` Relationship/authority: ${text(input,'relationship')}.`:''}${text(input,'copyType')?` Desired copy/record type: ${text(input,'copyType')}.`:''}` }
function describe(category: string, input: Record<string, unknown>): string {
  const scope=scopeText(input), access=accessText(input), objective=text(input,'subjectMatter')?` Objective: ${text(input,'subjectMatter')}.`:''
  const descriptions: Record<string,string> = {
    'license-certificate-copy-type-and-availability': `Records or written information sufficient to identify which marriage-license, certificate, verification, abstract, informational, certified, genealogical, or other copy types are available for this record and requester. Do not assume every copy type is public or available in every jurisdiction.${scope}${access}`,
    'index-registration-and-search-result-records': `Lawfully accessible marriage indexes, registration/search results, verification records, and no-record-found information sufficient to identify whether the office located the marriage record and which identifiers may lawfully be disclosed.${scope}${access}`,
    'public-confidential-and-restricted-access-status': `Written information sufficient to determine whether the identified marriage record or copy is public, confidential, restricted, sealed, or subject to requester-specific access limits in this jurisdiction, including the applicable request path. Request status and lawful access conditions, not a circumvention of them.${scope}${access}`,
    'eligibility-relationship-and-authorization-requirements': `Current written requester-eligibility, relationship, authorization, representative, court-order, or other access requirements for the requested marriage-record product.${scope}${access}`,
    'application-order-and-submission-requirements': `Current application/order forms, required fields, signatures, submission instructions, accepted channels, and records sufficient to identify how a lawful marriage-record request must be submitted.${scope}${access}`,
    'identity-verification-notarization-and-supporting-document-requirements': `Current written requirements for identity verification, notarization, sworn statements, authorization, relationship proof, or supporting documents. Request the requirements and status only; do not request authentication secrets or another person's protected identity documents.${scope}${access}`,
    'license-issuance-solemnization-return-and-recording-status': `Lawfully accessible status and record information concerning license issuance, solemnization/officiant return, filing/recording, registration, and certificate creation sufficient to identify where the marriage-record process stands or stood. Do not request confidential application details beyond lawful access.${scope}${access}`,
    'amendment-correction-and-status-records': `Lawfully accessible amendment, correction, replacement, or change-status records and procedures sufficient to identify whether a correction exists, what process applies, and the current status of a submitted correction matter.${scope}${access}`,
    'fees-processing-delivery-and-order-status-records': `Current fee schedule, processing guidance, delivery options, expedite options if offered, and lawfully accessible order/application status for the identified request. Do not request payment-card, bank-account, or authentication credentials.${scope}${access}`,
    'agency-custodian-referral-and-jurisdiction-records': `Records or written information sufficient to identify the correct issuing office, recorder, clerk, archive, state office, or referral destination when the current office does not maintain or issue the requested marriage record.${scope}${access}`,
    'denial-restriction-no-record-found-and-review-status': `Written denial, restriction, no-record-found, incomplete-application, insufficient-eligibility, or other nonproduction status; the stated reason; available cure or review procedure; and any segregable status information the requester may lawfully receive.${scope}${access}`,
  }
  return `${descriptions[category]??`Records concerning ${category}.${scope}${access}`}${objective}`
}
function validateMarriageRecords(request: ValidatedRequest): readonly {field:string;message:string}[] {
  const issues:{field:string;message:string}[]=[]; const corpus=request.items.map(i=>i.description.toLowerCase()).join(' ')
  if(!corpus.includes('first party '))issues.push({field:'party1Name',message:'Provide at least one party name.'})
  if(!corpus.includes('marriage/license year '))issues.push({field:'marriageYear',message:'Provide the marriage or license year.'})
  if(!corpus.includes('requester capacity:'))issues.push({field:'requesterCapacity',message:'State the requester capacity so access can be evaluated.'})
  if(!corpus.includes('cover request/search activity'))issues.push({field:'dateRange',message:'Provide the relevant request or search period.'})
  if(!corpus.includes('objective:'))issues.push({field:'subjectMatter',message:'Describe the marriage-record objective.'})
  return issues
}
export function buildMarriageRecordsRequest(input: Record<string, unknown>) {
  const p1=text(input,'party1Name'), p2=text(input,'party2Name'), year=text(input,'marriageYear'), start=text(input,'dateStart'), end=text(input,'dateEnd'), categories=selectedCategories(input)
  return {
    title:`Marriage Records — ${p1&&p2?`${p1} & ${p2}`:p1??'Record'}${year?` (${year})`:''}`,
    agency:text(input,'agency')??'', jurisdiction:text(input,'jurisdiction'),
    purpose:text(input,'purpose')??'Determine lawful access and obtain, verify, correct, or track the appropriate marriage-license or marriage-record product/status for the identified parties.',
    scope:JSON.stringify({workflow:'marriage-records',party1Name:p1,party2Name:p2,marriageYear:year,licenseNumber:text(input,'licenseNumber'),requesterCapacity:text(input,'requesterCapacity'),relationship:text(input,'relationship'),copyType:text(input,'copyType'),existingOrderNumber:text(input,'existingOrderNumber'),dateStart:start,dateEnd:end,jurisdiction:text(input,'jurisdiction'),subjectMatter:text(input,'subjectMatter')}),
    items:categories.map(category=>({category,description:describe(category,input),dateStart:start,dateEnd:end,custodian:text(input,'agency'),systemHint:category==='fees-processing-delivery-and-order-status-records'||category==='application-order-and-submission-requirements'?'marriage-record order / application system':category==='index-registration-and-search-result-records'||category==='license-issuance-solemnization-return-and-recording-status'?'marriage-license / vital-registration index system':undefined})),
  }
}
export const MARRIAGE_RECORD_FINDINGS=['MISSING_REQUESTED_CATEGORY','REFERENCED_RECORD_NOT_PRODUCED','IDENTIFIER_MISMATCH','DATE_GAP','DUPLICATE_RECORD','MISSING_ATTACHMENT','UNEXPLAINED_WITHHOLDING','REDACTION_REVIEW','PARTIAL_PRODUCTION','UNRESPONSIVE_ITEM'] as const
export const productionMarriageRecordsWorkflow: RecordsWorkflow=createRecordsWorkflow({
  id:'marriage-records',name:'Marriage Records Request',description:'Determine lawful access and build a marriage-record request covering copy availability, public/confidential status, eligibility, applications, recording status, corrections, fees/order status, referrals, and restrictions.',searchIntent:'marriage records request',
  seo:{title:'Marriage Records Request — Licenses, Certificates, Access & Order Status',description:'Build a lawful marriage-record request for licenses, certificates, access status, eligibility, application requirements, recording status, corrections, fees, and order status.',canonicalPath:'/workflows/marriage-records'},
  intakeVersion:'2.0.0',intake:MARRIAGE_RECORD_INTAKE,capabilities:MARRIAGE_RECORD_CAPABILITIES,request:{categories:MARRIAGE_RECORD_CATEGORIES,build:buildMarriageRecordsRequest},validate:validateMarriageRecords,
  policies:[{jurisdiction:'all',version:'2.0.0',rules:{determinePublicConfidentialOrRestrictedStatusBeforeRequestingRestrictedContent:true,doNotAssumeMarriageRecordsOrCertifiedCopiesArePublic:true,doNotImpersonateOrBypassAuthorizationIdentityNotarizationOrCourtOrderRequirements:true,doNotRequestAuthenticationSecretsOrAnotherPersonsProtectedIdentityDocuments:true,requestOnlyLawfullyAccessibleProductsStatusAndSegregableInformation:true,distinguishLicenseCertificateVerificationCertifiedInformationalGenealogicalAndOtherProductsWhereOffered:true,preserveLicenseOrderAndRecordIdentifiers:true,requireHumanReviewBeforeSubmissionWhenConfidentialityEligibilityOrAuthorizationIsUnclear:true}}],
  responseAnalysis:{findingTypes:MARRIAGE_RECORD_FINDINGS,async analyze(input:unknown){
    if(!input||typeof input!=='object')throw new Error('MARRIAGE_PRODUCTION_ANALYSIS_INPUT_INVALID')
    const source=input as {requestedItems?:readonly {category:string;description:string}[];records?:readonly GenericProductionRecord[]}; const records=source.records??[]; const requested=(source.requestedItems??[]).map(item=>({id:item.category,label:item.category,keywords:item.description.split(/\W+/).filter(w=>w.length>=4).slice(0,20)})); const deterministic=analyzeGenericProduction(requested,records,'marriage-record request record'); const providers=getConfiguredRecordsLlmProviders(); if(providers.length<2)return deterministic
    const policy={minimumProviders:2,agreementThreshold:0.67,maxProviders:3} as const; const requestedCategories=requested.map(i=>i.id); const analyzed=await Promise.all(records.slice(0,20).map(async record=>({id:record.id,classification:await classifyGenericRecord(providers,record,'marriage-records',requestedCategories,policy),facts:await extractGenericRecordFacts(providers,record,'marriage-records',policy)}))); const contradictions:Array<{leftId:string;rightId:string;result:Awaited<ReturnType<typeof assessGenericRecordContradiction>>}>=[]
    for(let i=0;i<Math.min(records.length,10);i+=1)for(let j=i+1;j<Math.min(records.length,10);j+=1)contradictions.push({leftId:records[i].id,rightId:records[j].id,result:await assessGenericRecordContradiction(providers,records[i],records[j],'marriage-records',policy)})
    const strategy=await recommendGenericRecordFollowUp(providers,'marriage-records',{deterministic,requestedItems:source.requestedItems??[],records:records.slice(0,20).map(r=>({id:r.id,filename:r.filename,category:r.category,text:r.text??''})),extracted:analyzed.map(i=>({id:i.id,classification:i.classification.value,facts:i.facts.value})),contradictions:contradictions.filter(i=>i.result.value.contradictory).map(i=>({leftId:i.leftId,rightId:i.rightId,analysis:i.result.value}))},policy)
    return {...deterministic,aiStrategy:strategy.value,aiProvenance:{providers:strategy.providers,confidence:strategy.confidence,disagreements:strategy.disagreements,warnings:strategy.warnings},aiRecordAnalysis:analyzed.map(i=>({id:i.id,classification:i.classification.value,facts:i.facts.value,classificationProvenance:i.classification.providers,factProvenance:i.facts.providers})),aiContradictions:contradictions.filter(i=>i.result.value.contradictory).map(i=>({leftId:i.leftId,rightId:i.rightId,analysis:i.result.value,providers:i.result.providers}))}
  }},
})
