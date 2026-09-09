import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import { analyzePoliceProduction, type PoliceProductionRecord, type PoliceProductionIdentifiers } from './police-records-analysis'
import { buildPoliceRecordsTimeline } from './police-records-timeline'
import type { RecordsDomainCapability } from './domain-pack'
import { assessGenericRecordContradiction, classifyGenericRecord, extractGenericRecordFacts, recommendGenericRecordFollowUp } from './generic-records-ai'
import { getConfiguredRecordsLlmProviders } from '../ai/records-llm-providers'

export const POLICE_RECORD_CATEGORIES = [
  'incident-report',
  'arrest-records',
  'dispatch-cad',
  'body-camera',
  'dash-camera',
  '911-calls',
  'photographs-and-video',
  'witness-and-victim-statements',
  'supplemental-reports',
  'correspondence-and-case-notes',
  'evidence-and-property-records',
  'referenced-and-cross-indexed-records',
  'withholding-redaction-no-records-and-request-status',
] as const

export const POLICE_RECORD_CAPABILITIES: readonly RecordsDomainCapability[] = ['classification','extraction','deadline','contradiction','findings','evidence','research','risk','strategy','draft','draftProvenance','validation','review','approval','mailing','tracking','proofAudit']

export const POLICE_INTAKE = [
  { id:'agency', label:'Law-enforcement agency', required:true, helpText:'Police department, sheriff, state police, campus police, transit police, or other public law-enforcement custodian.' },
  { id:'jurisdiction', label:'Jurisdiction', required:true, helpText:'Federal, state, county, city, district, campus, transit, or other jurisdiction whose access and records rules may apply.' },
  { id:'department', label:'Likely unit / custodian', helpText:'Patrol, investigations, records, traffic, communications, evidence/property, professional standards, or another likely unit.' },
  { id:'incidentDateStart', label:'Incident start date', required:true, helpText:'Beginning of the relevant incident or search window.' },
  { id:'incidentDateEnd', label:'Incident end date', required:true, helpText:'End of the relevant incident or search window.' },
  { id:'incidentNumber', label:'Incident / report / CAD number', helpText:'Incident, case, CAD, call-for-service, report, event, or other known identifier.' },
  { id:'arrestNumber', label:'Arrest / booking identifier', helpText:'Arrest, booking, jail, citation, or custody identifier when known.' },
  { id:'location', label:'Incident location', helpText:'Exact address, intersection, business, parcel, facility, road segment, or other identifiable location.' },
  { id:'person', label:'Person / entity involved', helpText:'Requester-supplied name of a subject, reporting party, victim, witness, officer, business, vehicle owner, or other involved person/entity when lawfully appropriate.' },
  { id:'vehicle', label:'Vehicle identifier', helpText:'Plate, VIN, unit number, make/model, fleet number, or another vehicle identifier when relevant.' },
  { id:'subjectMatter', label:'Incident / subject matter', required:true, helpText:'Plain-English description of the incident or event. Describe disputed allegations as allegations rather than established facts.' },
  { id:'requesterRelationship', label:'Requester relationship / access context', helpText:'Optional requester-supplied context such as involved party, parent/guardian, attorney, insurer, property owner, media, researcher, or general public. This does not establish legal entitlement by itself.' },
  { id:'preferredFormat', label:'Preferred format', helpText:'Native media, original digital files, PDF, CSV, audio, video, image files, CAD export, or another available format.' },
  { id:'exclusions', label:'Scope exclusions / narrowing', helpText:'Optional exclusions that reduce noise without changing the incident-record objective.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed || undefined
}

function categories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...POLICE_RECORD_CATEGORIES]
  const known = new Set(POLICE_RECORD_CATEGORIES)
  const selected = raw.filter((entry): entry is string => typeof entry === 'string' && known.has(entry as typeof POLICE_RECORD_CATEGORIES[number]))
  return selected.length ? selected : [...POLICE_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const identifiers = [
    text(input, 'incidentNumber') && `incident/report/CAD identifier ${text(input, 'incidentNumber')}`,
    text(input, 'arrestNumber') && `arrest/booking/citation identifier ${text(input, 'arrestNumber')}`,
    text(input, 'location') && `location ${text(input, 'location')}`,
    text(input, 'person') && `requester-supplied person/entity identifier ${text(input, 'person')}`,
    text(input, 'vehicle') && `vehicle identifier ${text(input, 'vehicle')}`,
    text(input, 'department') && `likely unit/custodian ${text(input, 'department')}`,
  ].filter(Boolean)
  const dates = text(input, 'incidentDateStart') && text(input, 'incidentDateEnd') ? ` Cover ${text(input, 'incidentDateStart')} through ${text(input, 'incidentDateEnd')}.` : ''
  const identifiersText = identifiers.length ? ` Search using these requester-supplied identifiers: ${identifiers.join('; ')}.` : ''
  const format = text(input, 'preferredFormat') ? ` Preferred format: ${text(input, 'preferredFormat')}.` : ''
  const exclusions = text(input, 'exclusions') ? ` Scope exclusions/narrowing: ${text(input, 'exclusions')}.` : ''
  const relationship = text(input, 'requesterRelationship') ? ` Requester-supplied relationship/access context: ${text(input, 'requesterRelationship')} (not treated as verified entitlement unless established by applicable authority or agency records).` : ''
  return `${dates}${identifiersText}${format}${exclusions}${relationship}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const subject = text(input, 'subjectMatter') ? ` Incident description supplied by requester: ${text(input, 'subjectMatter')}. Preserve whether a statement is an allegation, reported observation, officer narrative/conclusion, arrest/citation, charge, disposition, or adjudicated finding; do not convert police-record content into an established fact beyond what the record supports.` : ''
  const descriptions: Record<string, string> = {
    'incident-report': `Existing incident, offense, event, case, collision, traffic, or other primary police reports, including maintained versions, amendments, corrections, narrative pages, diagrams, and report-status records tied to the identified event.${scope}`,
    'arrest-records': `Lawfully accessible arrest, citation, booking, custody, charging, release, transport, and related records tied to the identified event. An arrest, citation, accusation, or booking record is not proof of guilt or adjudication.${scope}`,
    'dispatch-cad': `Existing computer-aided dispatch records, calls-for-service, event logs, unit assignments, timestamps, response/disposition codes, location history, dispatcher notes where lawfully accessible, and related CAD exports or indexes.${scope}`,
    'body-camera': `Lawfully accessible body-worn-camera recordings and associated event indexes, filenames, timestamps, metadata, evidence references, retention/status records, redaction/withholding records, and records sufficient to identify responsive files. Do not request credentials, evidence-system secrets, private keys, internal security configuration, or authentication data.${scope}`,
    'dash-camera': `Lawfully accessible in-car, dash-camera, vehicle-camera, ALPR-linked incident media where actually within lawful scope, and associated indexes, timestamps, metadata, evidence references, retention/status records, and redaction/withholding records. Do not assume all security-sensitive or unrelated location data is public.${scope}`,
    '911-calls': `Lawfully accessible 911 or emergency-call recordings, call logs, telecommunicator records, timestamps, CAD-linked audio, transcripts where maintained, and related emergency-communications records. Do not assume protected caller, victim/witness, medical, juvenile, or location information is publicly disclosable.${scope}`,
    'photographs-and-video': `Existing scene photographs, surveillance or agency-maintained incident video, evidence images, audio/video files, diagrams, maps, screenshots, and associated indexes/metadata tied to the incident where lawfully accessible.${scope}`,
    'witness-and-victim-statements': `Lawfully accessible witness, victim, reporting-party, subject, officer, or other interview/statement records, recordings, summaries, and related documentation. Preserve speaker/source attribution and do not assume confidential-source, victim/witness, juvenile, medical, address/contact, or other protected details are public.${scope}`,
    'supplemental-reports': `Existing supplemental reports, follow-up reports, investigative supplements, amended reports, addenda, detective follow-up, evidence submissions, later-added narratives, correction records, and disposition updates associated with the incident.${scope}`,
    'correspondence-and-case-notes': `Lawfully accessible correspondence, emails, attachments, documented communications, case-management notes, referrals, interagency communications, supervisor review, and outside-party communications maintained with or referenced by the incident file. Do not assume privileged, personnel, internal deliberative, confidential-source, or security-sensitive material is disclosable.${scope}`,
    'evidence-and-property-records': `Lawfully accessible evidence/property logs, item indexes, evidence receipt and release records, chain/status records, property-room references, photographs, disposition records, and records linking physical/digital evidence to the incident. Request record evidence only; do not request evidence-system credentials or security-sensitive access details.${scope}`,
    'referenced-and-cross-indexed-records': `Existing attachments, enclosures, referenced reports, CAD events, media identifiers, related incident/case numbers, linked citations/arrests, evidence references, cross-indexed files, external-agency referrals, and records expressly identified within responsive material but not otherwise produced.${scope}`,
    'withholding-redaction-no-records-and-request-status': `Existing acknowledgment, identity/access-verification requirements, clarification, search/status, fee, transfer/referral, no-records, retention/deletion status, withholding, redaction, exemption, privilege, partial-production, closure, and review/appeal instructions where actually stated. Preserve the agency's stated basis rather than inventing a deadline, exemption, privilege, disclosure right, violation, completeness conclusion, or review route.${scope}`,
  }
  return `${descriptions[category] ?? `Existing police records concerning ${category}.${scope}`}${subject}`
}

function validatePolice(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const descriptions = request.items.map(item => item.description.toLowerCase()).join(' ')
  if (!request.agency?.trim()) issues.push({ field:'agency', message:'Identify the law-enforcement agency or public body.' })
  if (!request.jurisdiction?.trim()) issues.push({ field:'jurisdiction', message:'Identify the relevant jurisdiction.' })
  if (!descriptions.includes('incident description supplied by requester:')) issues.push({ field:'subjectMatter', message:'Describe the incident or subject matter in plain language.' })
  if (!descriptions.includes('cover ')) issues.push({ field:'dateRange', message:'Provide the relevant incident or search period.' })
  const hasIdentifier = ['incident/report/cad identifier','arrest/booking/citation identifier','location ','requester-supplied person/entity identifier','vehicle identifier'].some(marker => descriptions.includes(marker))
  if (!hasIdentifier) issues.push({ field:'identifiers', message:'Provide at least one incident/report/CAD number, arrest/booking/citation identifier, location, involved person/entity, or vehicle identifier.' })
  return issues
}

export function buildPoliceRecordsRequest(input: Record<string, unknown>) {
  const agency = text(input, 'agency') ?? ''
  const incidentNumber = text(input, 'incidentNumber')
  const location = text(input, 'location')
  const person = text(input, 'person')
  const subject = text(input, 'subjectMatter')
  const start = text(input, 'incidentDateStart')
  const end = text(input, 'incidentDateEnd')
  const selected = categories(input)
  return {
    title:`Police Records — ${incidentNumber ?? location ?? person ?? subject ?? 'Incident'}`,
    agency,
    jurisdiction:text(input, 'jurisdiction'),
    purpose:text(input, 'purpose') ?? 'Identify and obtain the lawfully accessible police records associated with the specified incident while preserving record status, source attribution, access limits, media completeness, and production evidence.',
    scope:JSON.stringify({
      workflow:'police-records',
      incidentNumber,
      arrestNumber:text(input, 'arrestNumber'),
      location,
      person,
      vehicle:text(input, 'vehicle'),
      department:text(input, 'department'),
      incidentDateStart:start,
      incidentDateEnd:end,
      subjectMatter:subject,
      requesterRelationship:text(input, 'requesterRelationship'),
      preferredFormat:text(input, 'preferredFormat'),
      exclusions:text(input, 'exclusions'),
    }),
    items:selected.map(category => ({
      category,
      description:describe(category, input),
      dateStart:start,
      dateEnd:end,
      custodian:text(input, 'department'),
      systemHint:category === 'dispatch-cad' ? 'CAD / call-for-service system' : category === 'body-camera' || category === 'dash-camera' ? 'law-enforcement digital evidence / media index' : category === '911-calls' ? '911 / emergency communications system' : undefined,
      format:text(input, 'preferredFormat') ?? (['body-camera','dash-camera','911-calls','photographs-and-video'].includes(category) ? 'native digital files where available' : undefined),
    })),
  }
}

export const POLICE_ANALYSIS_FINDINGS = ['MISSING_REQUESTED_CATEGORY','REFERENCED_RECORD_NOT_PRODUCED','INCIDENT_IDENTIFIER_MISMATCH','DATE_GAP','DUPLICATE_RECORD','MISSING_MEDIA','UNEXPLAINED_WITHHOLDING','REDACTION_REVIEW','PARTIAL_PRODUCTION','UNRESPONSIVE_ITEM'] as const

export const policeRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id:'police-records',
  name:'Police Records Request',
  description:'Build a broad incident-centered police records request for reports, CAD, arrests, body/dash camera, 911, media, statements, supplements, evidence/property records, cross-references, and response-status records.',
  searchIntent:'police records request',
  seo:{
    title:'Police Records Request — Incident Reports, CAD, Body Camera & 911 Records',
    description:'Build an incident-centered police records request using report/CAD numbers, dates, locations, people, vehicles, record categories, media formats, and production-completeness controls.',
    canonicalPath:'/workflows/police-records',
  },
  intakeVersion:'2.0.0',
  intake:POLICE_INTAKE,
  capabilities:POLICE_RECORD_CAPABILITIES,
  request:{categories:POLICE_RECORD_CATEGORIES, build:buildPoliceRecordsRequest},
  validate:validatePolice,
  policies:[{
    jurisdiction:'all',
    version:'2.0.0',
    rules:{
      preserveAllegationObservationNarrativeArrestCitationChargeDispositionAndAdjudicationDistinctions:true,
      doNotConvertPoliceReportStatementsArrestsCitationsChargesOrAccusationsIntoEstablishedFactsBeyondRecordEvidence:true,
      preserveRequesterSuppliedIdentifiersRelationshipFormatAndExclusionsAsUnverifiedUnlessSupportedByAuthorityOrRecords:true,
      doNotInventIncidentNumbersArrestNumbersCustodiansSystemsAgencyFactsRecordExistenceMediaExistenceRetentionStatusSearchCompletenessOrRequestStatus:true,
      doNotAssertJurisdictionSpecificDeadlinesExemptionsPrivilegesDisclosureRightsAppealRightsAccessEntitlementOrViolationsWithoutVerifiedAuthority:true,
      doNotTreatVictimWitnessJuvenileMedicalCriminalHistoryConfidentialSourcePersonnelPrivilegedDeliberativeSecurityLocationContactOrAuthenticationDataAsAutomaticallyPublic:true,
      doNotRequestPasswordsSecurityAnswersOneTimeCodesAuthenticationTokensPaymentCredentialsPrivateKeysEvidenceSystemSecretsOrSecuritySensitiveConfiguration:true,
      requireHumanReviewWhenConsequentialAccessPrivacyLegalPrivilegeRetentionIdentityVerificationOrSensitiveInformationQuestionIsUnclear:true,
    },
  }],
  responseAnalysis:{
    findingTypes:POLICE_ANALYSIS_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('POLICE_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const source = input as { requestedItems?: readonly { category:string; description:string }[]; records?: readonly PoliceProductionRecord[]; identifiers?: PoliceProductionIdentifiers }
      const records = source.records ?? []
      const requested = (source.requestedItems ?? []).map(item => ({ id:item.category, label:item.category, keywords:item.description.split(/\W+/).filter(word => word.length >= 4).slice(0, 20) }))
      const deterministic = analyzePoliceProduction(requested, records, source.identifiers ?? {})
      const timeline = buildPoliceRecordsTimeline(records)
      const providers = getConfiguredRecordsLlmProviders()
      if (providers.length < 2) return { ...deterministic, timeline }

      const policy = { minimumProviders:2, agreementThreshold:0.67, maxProviders:3 } as const
      const requestedCategories = requested.map(item => item.id)
      const analyzed = await Promise.all(records.slice(0, 20).map(async record => ({
        id:record.id,
        classification:await classifyGenericRecord(providers, record, 'police-records', requestedCategories, policy),
        facts:await extractGenericRecordFacts(providers, record, 'police-records', policy),
      })))
      const contradictions: Array<{ leftId:string; rightId:string; result:Awaited<ReturnType<typeof assessGenericRecordContradiction>> }> = []
      for (let i = 0; i < Math.min(records.length, 8); i += 1) {
        for (let j = i + 1; j < Math.min(records.length, 8); j += 1) {
          contradictions.push({
            leftId:records[i].id,
            rightId:records[j].id,
            result:await assessGenericRecordContradiction(providers, records[i], records[j], 'police-records', policy),
          })
        }
      }
      const strategy = await recommendGenericRecordFollowUp(providers, 'police-records', {
        deterministic,
        timeline,
        identifiers:source.identifiers ?? {},
        requestedItems:source.requestedItems ?? [],
        records:records.slice(0, 20).map(record => ({ id:record.id, filename:record.filename, category:record.category, text:record.text ?? '' })),
      }, policy)
      return {
        ...deterministic,
        timeline,
        intelligence:{
          providerOrder:providers.map(provider => provider.id),
          analyzed,
          contradictions,
          strategy,
        },
      }
    },
  },
})
