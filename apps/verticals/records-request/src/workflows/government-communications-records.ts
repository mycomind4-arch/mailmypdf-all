import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import type { RecordsDomainCapability } from './domain-pack'
import { analyzeGovernmentCommunicationProduction, type GovernmentCommunicationRecord } from './government-communications-analysis'
import { assessGenericRecordContradiction, classifyGenericRecord, extractGenericRecordFacts, recommendGenericRecordFollowUp } from './generic-records-ai'
import { getConfiguredRecordsLlmProviders } from '../ai/records-llm-providers'

export const GOVERNMENT_COMMUNICATION_RECORD_CATEGORIES = [
  'emails',
  'email-attachments',
  'text-messages',
  'agency-messaging',
  'letters-and-memos',
  'internal-correspondence',
  'meeting-follow-up',
  'calendar-and-invitation-records',
  'communications-with-outside-parties',
  'communication-search-metadata',
  'withholding-redaction-no-records-and-request-status',
] as const

export const GOVERNMENT_COMMUNICATION_CAPABILITIES: readonly RecordsDomainCapability[] = ['classification','extraction','deadline','contradiction','findings','evidence','research','risk','strategy','draft','draftProvenance','validation','review','approval','mailing','tracking','proofAudit']

export const GOVERNMENT_COMMUNICATION_INTAKE = [
  { id:'agency', label:'Agency / public body', required:true, helpText:'Government agency or public body holding the communications.' },
  { id:'jurisdiction', label:'Jurisdiction', required:true, helpText:'Federal, state, county, city, district, court, or other jurisdiction whose records rules and procedures may apply.' },
  { id:'department', label:'Likely office / division', helpText:'Department, division, project team, board, records office, or other likely maintaining office.' },
  { id:'custodians', label:'People / custodians', helpText:'Officials, employees, contractors, board members, roles, or other custodians likely to have responsive communications.' },
  { id:'dateStart', label:'Communication start date', required:true, helpText:'Beginning of the requested communication period.' },
  { id:'dateEnd', label:'Communication end date', required:true, helpText:'End of the requested communication period.' },
  { id:'subjectMatter', label:'Subject / project / decision', required:true, helpText:'Plain-English description of the project, decision, property, case, contract, meeting, or issue.' },
  { id:'keywords', label:'Search terms', helpText:'Names, exact phrases, addresses, project names, case/file numbers, contract numbers, or other distinctive search terms.' },
  { id:'externalParties', label:'Outside parties', helpText:'Contractors, consultants, applicants, attorneys, developers, vendors, lobbyists, organizations, or other outside parties relevant to the matter.' },
  { id:'systems', label:'Known communication systems', helpText:'Known system names or types such as agency email, SMS, collaboration/chat, calendar, or project messaging. Do not provide credentials, account secrets, tokens, server addresses, or security-sensitive configuration.' },
  { id:'preferredFormat', label:'Preferred format', helpText:'Native email/message export with metadata where available, PDF, CSV, EML/MSG, native attachments, or another available format.' },
  { id:'exclusions', label:'Scope exclusions / narrowing', helpText:'Optional exclusions that reduce noise without changing the communications objective.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function list(input: Record<string, unknown>, key: string): string[] {
  const raw = input[key]
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string').map(v => v.trim()).filter(Boolean)
  if (typeof raw === 'string') return raw.split(/[\n,;]+/).map(v => v.trim()).filter(Boolean)
  return []
}

function categories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...GOVERNMENT_COMMUNICATION_RECORD_CATEGORIES]
  const known = new Set(GOVERNMENT_COMMUNICATION_RECORD_CATEGORIES)
  const selected = raw.filter((v): v is string => typeof v === 'string' && known.has(v as typeof GOVERNMENT_COMMUNICATION_RECORD_CATEGORIES[number]))
  return selected.length ? selected : [...GOVERNMENT_COMMUNICATION_RECORD_CATEGORIES]
}

function describe(category: string, input: Record<string, unknown>): string {
  const custodians = list(input, 'custodians')
  const keywords = list(input, 'keywords')
  const outside = list(input, 'externalParties')
  const systems = list(input, 'systems')
  const dates = text(input, 'dateStart') && text(input, 'dateEnd') ? ` Cover ${text(input, 'dateStart')} through ${text(input, 'dateEnd')}.` : ''
  const constraints = [
    custodians.length ? `custodians ${custodians.join(', ')}` : '',
    keywords.length ? `search terms ${keywords.join(', ')}` : '',
    outside.length ? `outside parties ${outside.join(', ')}` : '',
    systems.length ? `known system names/types ${systems.join(', ')}` : '',
  ].filter(Boolean)
  const scoped = constraints.length ? ` Search using these requester-supplied constraints: ${constraints.join('; ')}.` : ''
  const subject = text(input, 'subjectMatter') ? ` The communications concern: ${text(input, 'subjectMatter')}.` : ''
  const format = text(input, 'preferredFormat') ? ` Preferred format: ${text(input, 'preferredFormat')}.` : ''
  const exclusions = text(input, 'exclusions') ? ` Scope exclusions/narrowing: ${text(input, 'exclusions')}.` : ''
  const map: Record<string, string> = {
    'emails': `Existing emails sent or received by the identified custodians concerning the specified subject, including complete responsive message context where maintained, header metadata, and related thread records.${scoped}${dates}${format}${exclusions}`,
    'email-attachments': `Existing attachments to responsive emails, including documents, spreadsheets, PDFs, images, plans, reports, and other files that form part of the communication record. Treat attachments as a separate completeness check rather than assuming they were produced with the parent message.${scoped}${dates}${format}${exclusions}`,
    'text-messages': `Lawfully accessible SMS/MMS or equivalent text-message records maintained on agency-managed systems/devices or otherwise maintained as agency records within scope. Do not assume personal phone contents, unrelated private conversations, victim/witness information, or authentication data are publicly disclosable.${scoped}${dates}${format}${exclusions}`,
    'agency-messaging': `Existing responsive messages from agency collaboration or messaging platforms, including channels, direct messages, project workspaces, and associated files where maintained. Request known system names/types only; do not demand credentials, tokens, server addresses, private keys, or security-sensitive configuration.${scoped}${dates}${format}${exclusions}`,
    'letters-and-memos': `Existing letters, memoranda, notices, and formal written communications concerning the identified subject or matter.${scoped}${dates}${format}${exclusions}`,
    'internal-correspondence': `Lawfully accessible internal emails and written correspondence among agency personnel concerning the identified subject, project, case, contract, or decision. Do not assume attorney-client, work-product, deliberative, personnel, medical, whistleblower, security-sensitive, or other protected material is disclosable.${scoped}${dates}${format}${exclusions}`,
    'meeting-follow-up': `Existing post-meeting emails, action items, follow-up correspondence, shared notes where maintained and lawfully accessible, and communications documenting decisions, assignments, unresolved issues, or next steps.${scoped}${dates}${format}${exclusions}`,
    'calendar-and-invitation-records': `Existing calendar entries, meeting invitations, attendee records, scheduling metadata, linked agendas/materials, and related communication records concerning the identified subject or matter, subject to lawful privacy/security limits.${scoped}${dates}${format}${exclusions}`,
    'communications-with-outside-parties': `Existing communications between agency personnel and identified contractors, consultants, applicants, vendors, developers, attorneys, organizations, or other outside parties concerning the matter.${scoped}${dates}${format}${exclusions}`,
    'communication-search-metadata': `Existing search logs, message indexes, export manifests, mailbox/account identifiers at a non-secret operational level, custodian lists, date/search-scope records, thread identifiers, attachment inventories, or equivalent records sufficient to evaluate the communication search where maintained and lawfully accessible. Do not request passwords, tokens, internal server addresses, security controls, or other secrets.${scoped}${dates}${format}${exclusions}`,
    'withholding-redaction-no-records-and-request-status': `Existing acknowledgment, search/status, clarification, fee, transfer/referral, no-records, withholding, redaction, exemption, privilege, partial-production, closure, and review/appeal instructions where actually stated. Preserve the agency's stated basis rather than inventing a deadline, exemption, privilege, disclosure right, violation, search failure, or review route.${scoped}${dates}${format}${exclusions}`,
  }
  return `${map[category] ?? `Existing communications concerning ${category}.${scoped}${dates}${format}${exclusions}`}${subject}`
}

function validateCommunications(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  let scope: { custodians?: unknown; keywords?: unknown[]; externalParties?: unknown[]; systems?: unknown[] } = {}
  try {
    const parsed = JSON.parse(request.scope ?? '{}') as Record<string, unknown>
    scope = {
      custodians: parsed.custodians,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      externalParties: Array.isArray(parsed.externalParties) ? parsed.externalParties : [],
      systems: Array.isArray(parsed.systems) ? parsed.systems : [],
    }
  } catch { scope = {} }
  if (!request.agency?.trim()) issues.push({ field:'agency', message:'Identify the agency or public body.' })
  if (!request.jurisdiction?.trim()) issues.push({ field:'jurisdiction', message:'Identify the relevant jurisdiction.' })
  const hasMeaningfulConstraint = [scope.custodians, scope.keywords, scope.externalParties, scope.systems].some(value => Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0)
  if (!hasMeaningfulConstraint) issues.push({ field:'searchConstraints', message:'Provide at least one meaningful search constraint such as a custodian, distinctive keyword, outside party, project identifier, or known communication-system name/type.' })
  const descriptions = request.items.map(i => i.description.toLowerCase()).join(' ')
  if (!descriptions.includes('communications concern')) issues.push({ field:'subjectMatter', message:'Describe the subject, project, decision, case, property, contract, or issue the communications concern.' })
  if (!descriptions.includes('cover ')) issues.push({ field:'dateRange', message:'Provide the communication date range.' })
  return issues
}

export function buildGovernmentCommunicationsRequest(input: Record<string, unknown>) {
  const subject = text(input, 'subjectMatter')
  const selected = categories(input)
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const title = `Government Communications — ${subject ?? 'Subject Matter'}`
  const agency = text(input, 'agency') ?? ''
  return {
    title,
    normalizedTitle: title.trim().replace(/\s+/g, ' '),
    agency,
    normalizedAgency: agency.trim().replace(/\s+/g, ' '),
    jurisdiction: text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Identify and obtain responsive government communications using explicit custodians, search terms, outside parties, systems, date range, formats, and production-review controls.',
    scope: JSON.stringify({
      workflow:'government-communications-records',
      department:text(input, 'department'),
      custodians:list(input, 'custodians'),
      dateStart:start,
      dateEnd:end,
      subjectMatter:subject,
      keywords:list(input, 'keywords'),
      externalParties:list(input, 'externalParties'),
      systems:list(input, 'systems'),
      preferredFormat:text(input, 'preferredFormat'),
      exclusions:text(input, 'exclusions'),
    }),
    items: selected.map(category => ({
      category,
      description: describe(category, input),
      dateStart:start,
      dateEnd:end,
      custodian:text(input, 'department'),
      systemHint:list(input, 'systems').join(', ') || undefined,
      format:text(input, 'preferredFormat') ?? (['emails','email-attachments','text-messages','agency-messaging'].includes(category) ? 'native electronic format with metadata where available' : undefined),
    })),
  }
}

export const GOVERNMENT_COMMUNICATION_FINDINGS = ['MISSING_REQUESTED_CATEGORY','CUSTODIAN_GAP','SEARCH_SCOPE_AMBIGUITY','REFERENCED_ATTACHMENT_NOT_PRODUCED','DATE_GAP','DUPLICATE_RECORD','THREAD_GAP','MISSING_ATTACHMENT','UNEXPLAINED_WITHHOLDING','REDACTION_REVIEW','PARTIAL_PRODUCTION','UNRESPONSIVE_ITEM'] as const

export const governmentCommunicationsRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id:'government-communications-records',
  name:'Government Emails & Communications Records Request',
  description:'Build a targeted request for government emails, attachments, texts, messaging, letters, calendars, meeting follow-up, and outside-party communications using explicit custodians, search terms, system names/types, date ranges, formats, and production-review controls.',
  searchIntent:'government email records request',
  seo:{
    title:'Government Emails & Communications Records Request',
    description:'Build a targeted government communications request for emails, attachments, texts, messaging, calendars, outside-party communications, custodians, keywords, systems, dates, formats, and production completeness.',
    canonicalPath:'/workflows/government-communications-records',
  },
  intakeVersion:'2.0.0',
  intake:GOVERNMENT_COMMUNICATION_INTAKE,
  capabilities:GOVERNMENT_COMMUNICATION_CAPABILITIES,
  request:{categories:GOVERNMENT_COMMUNICATION_RECORD_CATEGORIES, build:buildGovernmentCommunicationsRequest},
  validate:validateCommunications,
  policies:[{
    jurisdiction:'all',
    version:'2.0.0',
    rules:{
      preserveRequesterCustodiansSearchTermsOutsidePartiesSystemsDateRangeFormatsAndExclusions:true,
      requestKnownCommunicationSystemNamesAndTypesButNeverCredentialsSecretsTokensServerAddressesOrSecurityConfiguration:true,
      doNotInventCustodiansMessagesThreadsAttachmentsSearchesSystemsAgencyFactsSearchCompletenessOrRequestStatus:true,
      doNotTreatPersonalAccountContentsPrivateMessagesVictimWitnessJuvenileMedicalPersonnelWhistleblowerPrivilegedDeliberativeSecurityOrAuthenticationDataAsAutomaticallyPublic:true,
      doNotAssertJurisdictionSpecificDeadlinesExemptionsPrivilegesDisclosureRightsAppealRightsViolationsOrSearchFailuresWithoutVerifiedAuthority:true,
      doNotRequestPasswordsSecurityAnswersOneTimeCodesAuthenticationTokensPaymentCredentialsPrivateKeysOrOtherSecrets:true,
      requireHumanReviewWhenConsequentialLegalPrivilegePrivacySearchCompletenessOrSensitiveAccessQuestionIsUnclear:true,
    },
  }],
  responseAnalysis:{
    findingTypes:GOVERNMENT_COMMUNICATION_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('GOVERNMENT_COMMUNICATION_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const source = input as { requestedItems?: readonly { category:string; description:string }[]; records?: readonly GovernmentCommunicationRecord[] }
      const records = source.records ?? []
      const requested = (source.requestedItems ?? []).map(item => ({ id:item.category, label:item.category, keywords:item.description.split(/\W+/).filter(word => word.length >= 4).slice(0, 20) }))
      const deterministic = analyzeGovernmentCommunicationProduction(requested, records)
      const providers = getConfiguredRecordsLlmProviders()
      if (providers.length < 2) return deterministic
      const policy = { minimumProviders:2, agreementThreshold:0.67, maxProviders:3 } as const
      const requestedCategories = requested.map(item => item.id)
      const analyzed = await Promise.all(records.slice(0, 20).map(async record => ({
        id:record.id,
        classification:await classifyGenericRecord(providers, record, 'government-communications-records', requestedCategories, policy),
        facts:await extractGenericRecordFacts(providers, record, 'government-communications-records', policy),
      })))
      const contradictions: Array<{ leftId:string; rightId:string; result:Awaited<ReturnType<typeof assessGenericRecordContradiction>> }> = []
      for (let i = 0; i < Math.min(records.length, 10); i += 1) {
        for (let j = i + 1; j < Math.min(records.length, 10); j += 1) {
          contradictions.push({ leftId:records[i].id, rightId:records[j].id, result:await assessGenericRecordContradiction(providers, records[i], records[j], 'government-communications-records', policy) })
        }
      }
      const strategy = await recommendGenericRecordFollowUp(providers, 'government-communications-records', {
        deterministic,
        requestedItems:source.requestedItems ?? [],
        records:records.slice(0, 20).map(record => ({ id:record.id, filename:record.filename, category:record.category, text:record.text ?? '', threadId:record.threadId })),
        extracted:analyzed.map(item => ({ id:item.id, classification:item.classification.value, facts:item.facts.value })),
        contradictions:contradictions.filter(item => item.result.value.contradictory).map(item => ({ leftId:item.leftId, rightId:item.rightId, analysis:item.result.value })),
      }, policy)
      return {
        ...deterministic,
        aiStrategy:strategy.value,
        aiProvenance:{ providers:strategy.providers, confidence:strategy.confidence, disagreements:strategy.disagreements, warnings:strategy.warnings },
        aiRecordAnalysis:analyzed.map(item => ({ id:item.id, classification:item.classification.value, facts:item.facts.value, classificationProvenance:item.classification.providers, factProvenance:item.facts.providers })),
        aiContradictions:contradictions.filter(item => item.result.value.contradictory).map(item => ({ leftId:item.leftId, rightId:item.rightId, analysis:item.result.value, providers:item.result.providers })),
      }
    },
  },
})
