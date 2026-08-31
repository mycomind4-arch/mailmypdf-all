import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import type { RecordsDomainCapability } from './domain-pack'
import { analyzeCodeEnforcementProduction, type ProductionRecord, type RequestedCategory } from './code-enforcement-analysis'
import { assessContradiction, classifyProductionRecord, extractCodeEnforcementFacts, runCodeEnforcementStrategy } from './code-enforcement-ai'
import { getConfiguredRecordsLlmProviders } from '../ai/records-llm-providers'
import { buildCodeEnforcementFollowUps } from './code-enforcement-follow-up'
import { buildCodeEnforcementAuthorityProfile } from './code-enforcement-authority'

export const CODE_ENFORCEMENT_RECORD_CATEGORIES = ['case-file','violations','complaints','inspections','notices-and-orders','photographs-and-video','correspondence','enforcement-actions','abatement-and-compliance','permits-and-related-records'] as const
export const CODE_ENFORCEMENT_CAPABILITIES: readonly RecordsDomainCapability[] = ['classification','extraction','deadline','contradiction','findings','evidence','research','risk','strategy','draft','draftProvenance','validation','review','approval','mailing','tracking','proofAudit']
export const CODE_ENFORCEMENT_INTAKE = [
  { id:'agency', label:'Agency', required:true, helpText:'The city, county, department, or other records custodian.' },
  { id:'department', label:'Likely department or custodian', helpText:'Code enforcement, building, planning, neighborhood services, or another likely custodian.' },
  { id:'propertyAddress', label:'Property address', helpText:'Exact site address, including unit or suite where relevant.' },
  { id:'parcelNumber', label:'Parcel / APN', helpText:'Assessor parcel number or other parcel identifier when known.' },
  { id:'caseNumber', label:'Code enforcement case number', helpText:'Case, complaint, violation, or file number when known.' },
  { id:'violationNumber', label:'Violation / citation number', helpText:'Citation, violation, notice, or order number when known.' },
  { id:'relatedParty', label:'Related person or entity', helpText:'Owner, operator, business, tenant, or other entity associated with the matter.' },
  { id:'dateStart', label:'Records start date', required:true, helpText:'Beginning of the requested records period.' },
  { id:'dateEnd', label:'Records end date', required:true, helpText:'End of the requested records period.' },
  { id:'subjectMatter', label:'Issue or subject matter', required:true, helpText:'Plain-English description of the code issue or enforcement matter.' },
] as const
function value(input: Record<string, unknown>, key: string): string | undefined { const raw=input[key]; if(typeof raw!=='string') return undefined; const trimmed=raw.trim(); return trimmed||undefined }
function buildCategories(input: Record<string, unknown>): string[] { const requested=input.categories; if(!Array.isArray(requested)) return [...CODE_ENFORCEMENT_RECORD_CATEGORIES]; const known=new Set(CODE_ENFORCEMENT_RECORD_CATEGORIES); const selected=requested.filter((entry): entry is string=>typeof entry==='string'&&known.has(entry as typeof CODE_ENFORCEMENT_RECORD_CATEGORIES[number])); return selected.length?selected:[...CODE_ENFORCEMENT_RECORD_CATEGORIES] }
function descriptionForCategory(category:string,input:Record<string,unknown>):string {
  const property=value(input,'propertyAddress'), parcel=value(input,'parcelNumber'), caseNumber=value(input,'caseNumber'), violation=value(input,'violationNumber'), relatedParty=value(input,'relatedParty'), start=value(input,'dateStart'), end=value(input,'dateEnd'), subject=value(input,'subjectMatter')
  const identifiers=[property&&`property address ${property}`,parcel&&`parcel/APN ${parcel}`,caseNumber&&`case number ${caseNumber}`,violation&&`violation/citation number ${violation}`,relatedParty&&`related person or entity ${relatedParty}`].filter(Boolean)
  const scope=identifiers.length?` Search using the following identifiers: ${identifiers.join('; ')}.`:''; const dates=start&&end?` Cover records from ${start} through ${end}.`:''; const subjectText=subject?` The matter concerns: ${subject}.`:''
  const descriptions:Record<string,string>={
    'case-file':`The complete code-enforcement case/file record, including indexing, routing, assignment, status history, and records sufficient to understand the matter.${scope}${dates}`,
    violations:`Violation notices, violation descriptions, citations, code sections cited, correction requirements, and status records.${scope}${dates}`,
    complaints:`Complaints, service requests, referrals, intake records, and complaint narratives relating to the matter.${scope}${dates}`,
    inspections:`Inspection requests, inspection reports, inspection notes, photographs referenced by inspections, reinspection records, and inspection outcomes.${scope}${dates}`,
    'notices-and-orders':`Notices, orders, correction notices, administrative orders, hearing notices, and related service records.${scope}${dates}`,
    'photographs-and-video':`Photographs, video, body-worn or field media where maintained in the code-enforcement file, and associated metadata or indexing records.${scope}${dates}`,
    correspondence:`Correspondence and communications concerning the enforcement matter, including letters, emails, notices of communication, and documented exchanges between the agency and identified parties.${scope}${dates}`,
    'enforcement-actions':`Enforcement actions, citations, hearings, administrative decisions, referrals, liens, or other documented enforcement steps relating to the matter.${scope}${dates}`,
    'abatement-and-compliance':`Abatement, correction, compliance, reinspection, closure, extension, payment, or other resolution records relating to the matter.${scope}${dates}`,
    'permits-and-related-records':`Permits, applications, plan references, inspection records, or related property/building records that are part of or directly referenced by the enforcement matter.${scope}${dates}`,
  }
  return `${descriptions[category]??`Records concerning ${category}.${scope}${dates}`}${subjectText}`
}
function validateCodeEnforcement(request:ValidatedRequest):readonly {field:string;message:string}[]{ const issues:{field:string;message:string}[]=[]; const scope=request.items; const hasProperty=scope.some(i=>i.description.toLowerCase().includes('property address')); const hasCase=scope.some(i=>i.description.toLowerCase().includes('case number')); const hasSubject=scope.some(i=>i.description.toLowerCase().includes('matter concerns')); if(!hasProperty&&!hasCase) issues.push({field:'identifiers',message:'Provide a property address or case number so the agency can identify the enforcement matter.'}); if(!hasSubject) issues.push({field:'subjectMatter',message:'Describe the code issue or enforcement matter so the request is intelligible and searchable.'}); if(!scope.some(i=>i.category==='case-file')) issues.push({field:'categories',message:'The flagship workflow should include the case-file category unless the user deliberately narrows the request.'}); return issues }
export function buildCodeEnforcementRequest(input:Record<string,unknown>){ const agency=value(input,'agency')??''; const property=value(input,'propertyAddress'); const parcel=value(input,'parcelNumber'); const caseNumber=value(input,'caseNumber'); const violation=value(input,'violationNumber'); const subject=value(input,'subjectMatter'); const start=value(input,'dateStart'); const end=value(input,'dateEnd'); const categories=buildCategories(input); return { title:`Code Enforcement Records — ${property??caseNumber??subject??'Matter'}`, agency, jurisdiction:value(input,'jurisdiction'), purpose:value(input,'purpose')??'Research and document the code-enforcement history and agency records for the identified matter.', scope:JSON.stringify({workflow:'code-enforcement-records',propertyAddress:property,parcelNumber:parcel,caseNumber,violationNumber:violation,relatedParty:value(input,'relatedParty'),department:value(input,'department'),dateStart:start,dateEnd:end,subjectMatter:subject}), items:categories.map(category=>({category,description:descriptionForCategory(category,input),dateStart:start,dateEnd:end,custodian:value(input,'department'),systemHint:category==='photographs-and-video'?'code-enforcement field media / inspection systems':undefined,format:category==='photographs-and-video'?'native digital files where available':undefined})) } }

const ANALYSIS_FINDING_TYPES = ['MISSING_REQUESTED_CATEGORY','REFERENCED_RECORD_NOT_PRODUCED','IDENTIFIER_MISMATCH','DATE_GAP','DUPLICATE_RECORD','MISSING_ATTACHMENT','UNEXPLAINED_REDACTION','PARTIAL_PRODUCTION','UNRESPONSIVE_ITEM','PRODUCTION_AMBIGUITY'] as const
function normalizeRequestedCategories(items: readonly {category:string;description:string}[]): RequestedCategory[] { return items.map(item=>({id:item.category,label:item.category,keywords:item.description.split(/\W+/).filter(w=>w.length>=4).slice(0,12)})) }
export const codeEnforcementRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id:'code-enforcement-records', name:'Code Enforcement Records', description:'Build a targeted records request for code violations, complaints, inspections, notices, photographs, correspondence, enforcement actions, and property-linked case records.', searchIntent:'code enforcement records request',
  seo:{title:'Code Enforcement Records Request',description:'Build a targeted code enforcement records request for a property, parcel, violation, complaint, or enforcement case.',canonicalPath:'/workflows/code-enforcement-records'}, intakeVersion:'1.0.0', intake:CODE_ENFORCEMENT_INTAKE, capabilities:CODE_ENFORCEMENT_CAPABILITIES,
  request:{categories:CODE_ENFORCEMENT_RECORD_CATEGORIES,build:buildCodeEnforcementRequest}, validate:validateCodeEnforcement,
  responseAnalysis:{findingTypes:ANALYSIS_FINDING_TYPES, async analyze(input:unknown){
    if(!input||typeof input!=='object') throw new Error('PRODUCTION_ANALYSIS_INPUT_INVALID')
    const source=input as { requestedItems?: readonly {category:string;description:string}[]; records?: readonly ProductionRecord[]; propertyAddress?:string; parcelNumber?:string; caseNumber?:string; violationNumber?:string; dateStart?:string; dateEnd?:string; likelyCustodians?:string[]; jurisdiction?:string; agency?:string; purpose?:string }
    const records=source.records??[]; const requested=normalizeRequestedCategories(source.requestedItems??[])
    const deterministic=analyzeCodeEnforcementProduction(requested,records)
    const authorityProfile=buildCodeEnforcementAuthorityProfile({ jurisdiction:source.jurisdiction, agency:source.agency, purpose:source.purpose, identifiers:{caseNumbers:source.caseNumber?[source.caseNumber]:[],parcelNumbers:source.parcelNumber?[source.parcelNumber]:[],addresses:source.propertyAddress?[source.propertyAddress]:[]} })
    const providers=getConfiguredRecordsLlmProviders()
    if(providers.length<2) throw new Error(`CODE_ENFORCEMENT_LLM_QUORUM_NOT_MET:${providers.length}/2`)
    const policy={minimumProviders:2,agreementThreshold:0.67,maxProviders:3} as const
    const analyzedRecords=await Promise.all(records.slice(0,25).map(async record=>({id:record.id,classification:await classifyProductionRecord(providers,record,policy),facts:await extractCodeEnforcementFacts(providers,record,policy)})))
    const contradictionPairs: {leftId:string;rightId:string;result:Awaited<ReturnType<typeof assessContradiction>>}[]=[]
    const pairLimit=Math.min(records.length,12)
    for(let i=0;i<pairLimit;i+=1){ for(let j=i+1;j<pairLimit;j+=1){ contradictionPairs.push({leftId:records[i].id,rightId:records[j].id,result:await assessContradiction(providers,records[i],records[j],policy)}) } }
    const ai=await runCodeEnforcementStrategy({requestedItems:source.requestedItems??[],authorityProfile,productionSummary:{recordsReviewed:deterministic.recordsReviewed,findings:deterministic.findings,coveredCategoryIds:deterministic.coveredCategoryIds,missingCategoryIds:deterministic.missingCategoryIds,identifierReconciliation:deterministic.identifierReconciliation},records:records.slice(0,25).map(record=>({id:record.id,filename:record.filename,category:record.category,text:record.text??''})),extractedFacts:analyzedRecords.map(item=>({id:item.id,classification:item.classification.value,facts:item.facts.value})),contradictions:contradictionPairs.filter(item=>item.result.value.contradictory).map(item=>({leftId:item.leftId,rightId:item.rightId,analysis:item.result.value}))})
    const followUps=buildCodeEnforcementFollowUps(deterministic.findings,{propertyAddress:source.propertyAddress,parcelNumber:source.parcelNumber,caseNumber:source.caseNumber,violationNumber:source.violationNumber,dateStart:source.dateStart,dateEnd:source.dateEnd,likelyCustodians:[...authorityProfile.likelyCustodianRoles,...(source.likelyCustodians??[])]})
    return {...deterministic,authorityProfile,aiStrategy:ai.value,aiProvenance:{providers:ai.providers,agreement:ai.confidence,disagreements:ai.disagreements,warnings:ai.warnings},aiRecordAnalysis:analyzedRecords.map(item=>({id:item.id,classification:item.classification.value,facts:item.facts.value,classificationProvenance:item.classification.providers,factProvenance:item.facts.providers})),aiContradictions:contradictionPairs.filter(item=>item.result.value.contradictory).map(item=>({leftId:item.leftId,rightId:item.rightId,analysis:item.result.value,providers:item.result.providers})),followUps}
  }},
})
