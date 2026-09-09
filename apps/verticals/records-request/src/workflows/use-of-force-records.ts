import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import type { RecordsDomainCapability } from './domain-pack'
import { analyzePoliceProduction, type PoliceProductionIdentifiers, type PoliceProductionRecord } from './police-records-analysis'
import { assessPoliceContradiction, classifyPoliceRecord, extractPoliceIncidentFacts, recommendPoliceFollowUp } from './police-records-ai'
import { getConfiguredRecordsLlmProviders } from '../ai/records-llm-providers'

export const USE_OF_FORCE_RECORD_CATEGORIES = [
  'use-of-force-reports',
  'incident-and-supplemental-reports',
  'body-camera-recordings',
  'dash-and-other-video',
  'dispatch-and-cad',
  'supervisor-review-and-approval',
  'photographs-and-evidence',
  'injury-and-medical-documentation',
  'complaint-and-administrative-review',
  'redaction-withholding-and-retention-records',
] as const

export const USE_OF_FORCE_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const USE_OF_FORCE_INTAKE = [
  { id:'agency', label:'Law-enforcement agency', required:true, helpText:'Police department, sheriff, state police, campus police, or other responding agency.' },
  { id:'department', label:'Likely records / professional standards unit', helpText:'Records, internal affairs, professional standards, investigations, evidence, or another likely custodian.' },
  { id:'incidentDate', label:'Incident date', required:true, helpText:'Date of the force event.' },
  { id:'timeStart', label:'Approximate start time', helpText:'Beginning of the relevant event window.' },
  { id:'timeEnd', label:'Approximate end time', helpText:'End of the relevant event window.' },
  { id:'incidentNumber', label:'Incident / report / CAD number', helpText:'Incident, case, report, CAD, or call-for-service number when known.' },
  { id:'location', label:'Incident location', required:true, helpText:'Address, intersection, business, parcel, or other specific location.' },
  { id:'person', label:'Person subjected to force', helpText:'Name or other identifier for the person involved.' },
  { id:'officerNames', label:'Officer names / badge numbers', helpText:'Known officers, badge numbers, unit numbers, or other identifiers.' },
  { id:'forceDescription', label:'Force or restraint involved', required:true, helpText:'Plain-English description of the force, restraint, weapon, takedown, pursuit, or other event.' },
] as const

function text(input:Record<string,unknown>, key:string):string|undefined {
  const raw=input[key]
  if(typeof raw!=='string') return undefined
  const value=raw.trim()
  return value||undefined
}

function selectedCategories(input:Record<string,unknown>):string[] {
  const raw=input.categories
  if(!Array.isArray(raw)) return [...USE_OF_FORCE_RECORD_CATEGORIES]
  const known=new Set(USE_OF_FORCE_RECORD_CATEGORIES)
  const selected=raw.filter((entry):entry is string=>typeof entry==='string'&&known.has(entry as typeof USE_OF_FORCE_RECORD_CATEGORIES[number]))
  return selected.length?selected:[...USE_OF_FORCE_RECORD_CATEGORIES]
}

function scopeText(input:Record<string,unknown>):string {
  const identifiers=[
    text(input,'incidentNumber')&&`incident/report/CAD number ${text(input,'incidentNumber')}`,
    text(input,'location')&&`location ${text(input,'location')}`,
    text(input,'person')&&`person ${text(input,'person')}`,
    text(input,'officerNames')&&`officer identifiers ${text(input,'officerNames')}`,
  ].filter(Boolean)
  const date=text(input,'incidentDate')
  const start=text(input,'timeStart')
  const end=text(input,'timeEnd')
  const time=start||end?`, approximately ${start??'unknown start'} through ${end??'unknown end'}`:''
  return `${identifiers.length?` Search using: ${identifiers.join('; ')}.`:''}${date?` Incident date: ${date}${time}.`:''}`
}

function describe(category:string,input:Record<string,unknown>):string {
  const scope=scopeText(input)
  const force=text(input,'forceDescription')?` Force/event description: ${text(input,'forceDescription')}.`:''
  const descriptions:Record<string,string>={
    'use-of-force-reports':`Use-of-force reports, force forms, weapon/discharge reports, restraint reports, pursuit-related force records, and officer narratives documenting the identified force event.${scope}`,
    'incident-and-supplemental-reports':`Incident, arrest, offense, supplemental, field-contact, pursuit, or other reports associated with the same event, including later supplements and corrections.${scope}`,
    'body-camera-recordings':`Body-worn camera recordings from each involved or observing officer that depict or capture the force event, including associated file identifiers and retained pre/post-event footage.${scope}`,
    'dash-and-other-video':`Dash-camera, in-car, fixed-site, evidence, surveillance, drone, or other agency-held video depicting the event, together with associated indexes or metadata.${scope}`,
    'dispatch-and-cad':`CAD, call-for-service, dispatch, radio-event, unit-assignment, timestamp, and disposition records associated with the event.${scope}`,
    'supervisor-review-and-approval':`Supervisor reviews, command reviews, force-review forms, approval records, findings, routing history, corrective-action referrals, and documented supervisory comments concerning the force event.${scope}`,
    'photographs-and-evidence':`Scene photographs, injury photographs, evidence photographs, evidence indexes, property/evidence logs, weapon or equipment records, and other evidentiary materials associated with the event.${scope}`,
    'injury-and-medical-documentation':`Agency-maintained records documenting reported or observed injuries, requests for medical assistance, EMS response, medical-clearance references, injury forms, and related non-privileged incident documentation.${scope}`,
    'complaint-and-administrative-review':`Complaints, intake records, administrative or professional-standards review records, referral records, disposition records, and investigation indexes concerning the identified force event where maintained and disclosable.${scope}`,
    'redaction-withholding-and-retention-records':`Records identifying redactions, withheld material, stated withholding bases, retention classifications, preservation holds, deletion schedules, or deletion events affecting responsive force records or media.${scope}`,
  }
  return `${descriptions[category]??`Records concerning ${category}.${scope}`}${force}`
}

function validateUseOfForce(request:ValidatedRequest):readonly {field:string;message:string}[] {
  const issues:{field:string;message:string}[]=[]
  const corpus=request.items.map(item=>item.description.toLowerCase()).join(' ')
  if(!corpus.includes('location ')) issues.push({field:'location',message:'Provide the incident location so the force event can be identified.'})
  if(!corpus.includes('incident date:')) issues.push({field:'incidentDate',message:'Provide the incident date so responsive records and media can be located.'})
  if(!corpus.includes('force/event description:')) issues.push({field:'forceDescription',message:'Describe the force, restraint, weapon, pursuit, or other event in plain language.'})
  return issues
}

export function buildUseOfForceRecordsRequest(input:Record<string,unknown>) {
  const incidentNumber=text(input,'incidentNumber')
  const location=text(input,'location')
  const incidentDate=text(input,'incidentDate')
  const forceDescription=text(input,'forceDescription')
  const categories=selectedCategories(input)
  return {
    title:`Use of Force Records — ${incidentNumber??location??incidentDate??'Incident'}`,
    agency:text(input,'agency')??'',
    jurisdiction:text(input,'jurisdiction'),
    purpose:text(input,'purpose')??'Identify, preserve, obtain, and compare the reports, media, dispatch records, supervisory review, evidence, injury documentation, and administrative records associated with the specified force event.',
    scope:JSON.stringify({workflow:'use-of-force-records',incidentDate,timeStart:text(input,'timeStart'),timeEnd:text(input,'timeEnd'),incidentNumber,location,person:text(input,'person'),officerNames:text(input,'officerNames'),department:text(input,'department'),forceDescription}),
    items:categories.map(category=>({
      category,
      description:describe(category,input),
      dateStart:incidentDate,
      dateEnd:incidentDate,
      custodian:text(input,'department'),
      systemHint:category==='dispatch-and-cad'?'CAD / call-for-service system':category.includes('camera')||category.includes('video')?'digital evidence management system':category==='complaint-and-administrative-review'||category==='supervisor-review-and-approval'?'professional standards / force review system':undefined,
      format:category.includes('camera')||category.includes('video')?'native digital media files where available, with associated metadata preserved separately':category==='dispatch-and-cad'?'native export, CSV, JSON, or other structured format where maintained':undefined,
    })),
  }
}

export const USE_OF_FORCE_FINDINGS=[
  'MISSING_REQUESTED_CATEGORY','REFERENCED_RECORD_NOT_PRODUCED','INCIDENT_IDENTIFIER_MISMATCH','DATE_GAP','DUPLICATE_RECORD','MISSING_MEDIA','UNEXPLAINED_WITHHOLDING','REDACTION_REVIEW','PARTIAL_PRODUCTION','UNRESPONSIVE_ITEM',
] as const

export const useOfForceRecordsWorkflow:RecordsWorkflow=createRecordsWorkflow({
  id:'use-of-force-records',
  name:'Use of Force Records Request',
  description:'Build an incident-specific request for force reports, related reports, body-camera and other video, CAD, supervisor review, evidence, injury documentation, administrative review, and withholding/retention records.',
  searchIntent:'police use of force records request',
  seo:{title:'Use of Force Records Request — Reports, Body Camera & Review Records',description:'Request police use-of-force reports, body-camera video, CAD, supervisor review, evidence, injury documentation, and related records for a specific incident.',canonicalPath:'/workflows/use-of-force-records'},
  intakeVersion:'1.0.0',
  intake:USE_OF_FORCE_INTAKE,
  capabilities:USE_OF_FORCE_CAPABILITIES,
  request:{categories:USE_OF_FORCE_RECORD_CATEGORIES,build:buildUseOfForceRecordsRequest},
  validate:validateUseOfForce,
  policies:[{jurisdiction:'all',version:'1.0.0',rules:{requestIncidentSpecificRecords:true,requestNativeMedia:true,requestSupervisoryReviewSeparately:true,requestRetentionAndWithholdingRecords:true,preserveIdentifiersAndTimeline:true,doNotTreatReferencedMediaAsProduced:true}}],
  responseAnalysis:{
    findingTypes:USE_OF_FORCE_FINDINGS,
    async analyze(input:unknown){
      if(!input||typeof input!=='object') throw new Error('USE_OF_FORCE_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const source=input as {requestedItems?:readonly {category:string;description:string}[];records?:readonly PoliceProductionRecord[];identifiers?:PoliceProductionIdentifiers}
      const records=source.records??[]
      const requested=(source.requestedItems??[]).map(item=>({id:item.category,label:item.category,keywords:item.description.split(/\W+/).filter(word=>word.length>=4).slice(0,20)}))
      const deterministic=analyzePoliceProduction(requested,records,source.identifiers??{})
      const providers=getConfiguredRecordsLlmProviders()
      if(providers.length<2) return deterministic
      const policy={minimumProviders:2,agreementThreshold:0.67,maxProviders:3} as const
      const analyzed=await Promise.all(records.slice(0,20).map(async record=>({id:record.id,classification:await classifyPoliceRecord(providers,record,policy),facts:await extractPoliceIncidentFacts(providers,record,policy)})))
      const contradictions:Array<{leftId:string;rightId:string;result:Awaited<ReturnType<typeof assessPoliceContradiction>>}>=[]
      for(let i=0;i<Math.min(records.length,10);i+=1){for(let j=i+1;j<Math.min(records.length,10);j+=1){contradictions.push({leftId:records[i].id,rightId:records[j].id,result:await assessPoliceContradiction(providers,records[i],records[j],policy)})}}
      const strategy=await recommendPoliceFollowUp(providers,{workflow:'use-of-force-records',deterministic,requestedItems:source.requestedItems??[],identifiers:source.identifiers??{},records:records.slice(0,20).map(record=>({id:record.id,filename:record.filename,category:record.category,text:record.text??''})),extracted:analyzed.map(item=>({id:item.id,classification:item.classification.value,facts:item.facts.value})),contradictions:contradictions.filter(item=>item.result.value.contradictory).map(item=>({leftId:item.leftId,rightId:item.rightId,analysis:item.result.value}))},policy)
      return {...deterministic,aiStrategy:strategy.value,aiProvenance:{providers:strategy.providers,confidence:strategy.confidence,disagreements:strategy.disagreements,warnings:strategy.warnings},aiRecordAnalysis:analyzed.map(item=>({id:item.id,classification:item.classification.value,facts:item.facts.value,classificationProvenance:item.classification.providers,factProvenance:item.facts.providers})),aiContradictions:contradictions.filter(item=>item.result.value.contradictory).map(item=>({leftId:item.leftId,rightId:item.rightId,analysis:item.result.value,providers:item.result.providers}))}
    },
  },
})
