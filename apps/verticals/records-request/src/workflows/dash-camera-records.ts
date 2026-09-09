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
] as const

export const DASH_CAMERA_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const DASH_CAMERA_INTAKE = [
  { id:'agency', label:'Law-enforcement agency', required:true, helpText:'Police department, sheriff, state police, highway patrol, campus police, or other agency likely to hold in-car video.' },
  { id:'department', label:'Likely records / evidence unit', helpText:'Records, evidence, fleet, digital evidence, traffic, or another likely custodian.' },
  { id:'incidentDate', label:'Incident date', required:true, helpText:'Date of the stop, pursuit, collision, or other event.' },
  { id:'timeStart', label:'Approximate start time', helpText:'Beginning of the relevant recording window.' },
  { id:'timeEnd', label:'Approximate end time', helpText:'End of the relevant recording window.' },
  { id:'incidentNumber', label:'Incident / report / CAD number', helpText:'Case, report, CAD, call-for-service, citation, or event number when known.' },
  { id:'location', label:'Incident location', required:true, helpText:'Roadway, address, intersection, mile marker, business, or other location.' },
  { id:'person', label:'Person involved', helpText:'Driver, passenger, subject, victim, witness, or another person associated with the event.' },
  { id:'vehicle', label:'Vehicle identifier', helpText:'Plate, VIN, make/model, patrol unit, fleet number, or other identifier.' },
  { id:'officerNames', label:'Officer names / badge numbers', helpText:'Known officer names, badge numbers, or unit numbers.' },
  { id:'subjectMatter', label:'What happened', required:true, helpText:'Plain-English description of the stop, pursuit, collision, transport, or encounter.' },
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
    text(input,'incidentNumber')&&`incident/report/CAD number ${text(input,'incidentNumber')}`,
    text(input,'location')&&`location ${text(input,'location')}`,
    text(input,'person')&&`person ${text(input,'person')}`,
    text(input,'vehicle')&&`vehicle identifier ${text(input,'vehicle')}`,
    text(input,'officerNames')&&`officer/unit identifiers ${text(input,'officerNames')}`,
  ].filter(Boolean)
  const date=text(input,'incidentDate')
  const start=text(input,'timeStart')
  const end=text(input,'timeEnd')
  const time=start||end?`, approximately ${start??'unknown start'} through ${end??'unknown end'}`:''
  return `${ids.length?` Search using: ${ids.join('; ')}.`:''}${date?` Incident date: ${date}${time}.`:''}`
}

function describe(category:string,input:Record<string,unknown>):string {
  const scope=scopeText(input)
  const subject=text(input,'subjectMatter')?` Event description: ${text(input,'subjectMatter')}.`:''
  const descriptions:Record<string,string>={
    'dash-camera-recordings':`All in-car, dash-camera, mobile-video, forward-facing, rear-facing, cabin, or synchronized patrol-vehicle recordings depicting or capturing the identified event, including separate files from each involved vehicle where maintained.${scope}`,
    'dash-camera-metadata':`Native metadata for responsive in-car video, including recording identifiers, vehicle/unit identifiers, device identifiers, assigned officer, capture timestamps, duration, upload timestamps, file names, file hashes where maintained, GPS/location metadata, and evidence-system identifiers.${scope}`,
    'activation-and-event-logs':`Activation, deactivation, event-trigger, buffering, synchronization, upload, tagging, categorization, fault, or other system logs associated with responsive in-car recordings.${scope}`,
    'audit-and-access-logs':`Audit or access records showing viewing, export, copying, modification, redaction, sharing, download, or other access to responsive in-car recordings.${scope}`,
    'vehicle-and-unit-assignment-records':`Patrol vehicle, fleet/unit, officer assignment, shift, equipment assignment, and related records needed to identify which vehicle-camera systems may have captured the event.${scope}`,
    'dispatch-and-cad':`CAD, call-for-service, dispatch, radio-event, unit-assignment, timestamp, and disposition records associated with the event.${scope}`,
    'incident-and-supplemental-reports':`Incident, traffic-stop, citation, arrest, collision, pursuit, supplemental, field-contact, or other reports associated with the same event.${scope}`,
    'evidence-indexes':`Digital-evidence inventories, media indexes, attachment lists, evidence-property records, and cross-references showing in-car video associated with the event.${scope}`,
    'retention-and-deletion-records':`Retention classifications, preservation holds, deletion schedules, deletion events, overwrite records, or other records showing the preservation status of responsive in-car media.${scope}`,
    'redaction-and-withholding-records':`Records identifying redactions, withheld segments, exemption or withholding determinations, redaction logs, redacted-export history, and the stated basis for material not produced.${scope}`,
  }
  return `${descriptions[category]??`Records concerning ${category}.${scope}`}${subject}`
}

function validateDashCamera(request:ValidatedRequest):readonly {field:string;message:string}[] {
  const issues:{field:string;message:string}[]=[]
  const corpus=request.items.map(item=>item.description.toLowerCase()).join(' ')
  if(!corpus.includes('location ')) issues.push({field:'location',message:'Provide the event location so responsive vehicle-camera records can be identified.'})
  if(!corpus.includes('incident date:')) issues.push({field:'incidentDate',message:'Provide the incident date so responsive recordings can be located.'})
  if(!corpus.includes('event description:')) issues.push({field:'subjectMatter',message:'Describe the stop, pursuit, collision, transport, or encounter in plain language.'})
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
    purpose:text(input,'purpose')??'Identify, preserve, obtain, and review in-car camera recordings and the metadata, assignments, logs, dispatch records, and evidence indexes needed to determine whether the production is complete.',
    scope:JSON.stringify({workflow:'dash-camera-records',incidentDate,timeStart:text(input,'timeStart'),timeEnd:text(input,'timeEnd'),incidentNumber,location,person:text(input,'person'),vehicle:text(input,'vehicle'),officerNames:text(input,'officerNames'),department:text(input,'department'),subjectMatter}),
    items:categories.map(category=>({
      category,
      description:describe(category,input),
      dateStart:incidentDate,
      dateEnd:incidentDate,
      custodian:text(input,'department'),
      systemHint:category.includes('dash-camera')||category.includes('activation')||category.includes('audit')?'in-car video / digital evidence management system':category==='dispatch-and-cad'?'CAD / call-for-service system':category==='vehicle-and-unit-assignment-records'?'fleet / scheduling / unit assignment system':undefined,
      format:category==='dash-camera-recordings'?'native digital video files where available, with associated metadata preserved separately':category==='dash-camera-metadata'||category.includes('logs')?'native export, CSV, JSON, or other structured format where maintained':undefined,
    })),
  }
}

export const DASH_CAMERA_FINDINGS=['MISSING_REQUESTED_CATEGORY','REFERENCED_RECORD_NOT_PRODUCED','INCIDENT_IDENTIFIER_MISMATCH','DATE_GAP','DUPLICATE_RECORD','MISSING_MEDIA','UNEXPLAINED_WITHHOLDING','REDACTION_REVIEW','PARTIAL_PRODUCTION','UNRESPONSIVE_ITEM'] as const

export const dashCameraRecordsWorkflow:RecordsWorkflow=createRecordsWorkflow({
  id:'dash-camera-records',
  name:'Dash Camera Records Request',
  description:'Build an incident-specific request for in-car video, metadata, activation and audit logs, unit assignments, CAD, reports, evidence indexes, retention records, and withholding records.',
  searchIntent:'dash camera records request',
  seo:{title:'Dash Camera Records Request — Police In-Car Video & Metadata',description:'Request police dash-camera and in-car video plus metadata, activation logs, unit assignments, CAD, reports, retention records, and withholding records for a specific incident.',canonicalPath:'/workflows/dash-camera-records'},
  intakeVersion:'1.0.0',
  intake:DASH_CAMERA_INTAKE,
  capabilities:DASH_CAMERA_CAPABILITIES,
  request:{categories:DASH_CAMERA_RECORD_CATEGORIES,build:buildDashCameraRecordsRequest},
  validate:validateDashCamera,
  policies:[{jurisdiction:'all',version:'1.0.0',rules:{requestNativeMedia:true,requestMetadataSeparately:true,requestUnitAssignments:true,requestRetentionAndDeletionRecords:true,requestRedactionAndWithholdingRecords:true,preserveIncidentIdentifiers:true,doNotTreatReferencedMediaAsProduced:true}}],
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
      for(let i=0;i<Math.min(records.length,10);i+=1){for(let j=i+1;j<Math.min(records.length,10);j+=1){contradictions.push({leftId:records[i].id,rightId:records[j].id,result:await assessPoliceContradiction(providers,records[i],records[j],policy)})}}
      const strategy=await recommendPoliceFollowUp(providers,{workflow:'dash-camera-records',deterministic,requestedItems:source.requestedItems??[],identifiers:source.identifiers??{},records:records.slice(0,20).map(record=>({id:record.id,filename:record.filename,category:record.category,text:record.text??''})),extracted:analyzed.map(item=>({id:item.id,classification:item.classification.value,facts:item.facts.value})),contradictions:contradictions.filter(item=>item.result.value.contradictory).map(item=>({leftId:item.leftId,rightId:item.rightId,analysis:item.result.value}))},policy)
      return {...deterministic,aiStrategy:strategy.value,aiProvenance:{providers:strategy.providers,confidence:strategy.confidence,disagreements:strategy.disagreements,warnings:strategy.warnings},aiRecordAnalysis:analyzed.map(item=>({id:item.id,classification:item.classification.value,facts:item.facts.value,classificationProvenance:item.classification.providers,factProvenance:item.facts.providers})),aiContradictions:contradictions.filter(item=>item.result.value.contradictory).map(item=>({leftId:item.leftId,rightId:item.rightId,analysis:item.result.value,providers:item.result.providers}))}
    },
  },
})
