/**
 * McKinleyville Fixture — Development/Test Data
 *
 * This is a DEVELOPMENT FIXTURE only. It populates the typed view models
 * with the real-world McKinleyville scenario data for testing and demo.
 *
 * Production case data must flow through the same view model interfaces.
 * Do not import this fixture from production code paths.
 */

import type {
  CaseViewModel, OverviewViewModel, TimelineEventViewModel, EvidenceViewModel,
  FindingViewModel, ViolationViewModel, PropertyViewModel, ActionViewModel,
  CommunicationViewModel, WorkflowProgressViewModel, WorkflowOptionViewModel,
  SidebarItemViewModel, HighConsequenceReviewViewModel,
} from '../types/view-models'

// ─── Colors for sidebar badges (imported from tokens, not hardcoded) ────────
import { colors } from '../tokens/tokens'

// ─── Case ──────────────────────────────────────────────────────────────────────

export const fixtureCase: CaseViewModel = {
  caseId: 'case-mck-001',
  propertyAddress: '1234 McKinleyville Rd, McKinleyville, CA 95519',
  caseNumber: 'CE-2026-001',
  agency: 'Humboldt County Code Enforcement Division',
  jurisdiction: 'Humboldt County',
  status: 'open',
  urgency: 'high',
  urgencyReason: 'Inspection response deadline in 10 days. Notice addressed to a reportedly deceased recipient.',
  deadline: {
    date: 'September 3, 2026',
    label: 'Response deadline',
    daysRemaining: 10,
    source: 'Code enforcement notice, page 1',
    submitted: false,
  },
  activeWorkflow: {
    name: 'Respond to Inspection Request',
    step: 5,
    totalSteps: 14,
    stepName: 'Recipient reconciliation',
  },
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export const fixtureSidebar: SidebarItemViewModel[] = [
  { view: 'overview', label: 'Overview', icon: '⌂' },
  { view: 'timeline', label: 'Timeline', icon: '⏱', count: 5 },
  { view: 'violations', label: 'Violations', icon: '⚠', count: 5 },
  { view: 'evidence', label: 'Evidence', icon: '📎', count: 3 },
  { view: 'findings', label: 'Findings', icon: '!', count: 4, badge: { color: colors.statusCritical, label: '1 CRITICAL' } },
  { view: 'property', label: 'Property', icon: '⌂' },
  { view: 'actions', label: 'Actions', icon: '→', count: 3 },
  { view: 'communications', label: 'Communications', icon: '✉' },
  { view: 'workflows', label: 'Workflows', icon: '⚙' },
]

// ─── Overview ──────────────────────────────────────────────────────────────────

export const fixtureOverview: OverviewViewModel = {
  urgency: {
    level: 'high',
    reason: 'Inspection response deadline in 10 days. Notice addressed to a reportedly deceased recipient.',
  },
  deadline: {
    date: 'September 3, 2026',
    label: 'Response deadline',
    daysRemaining: 10,
    source: 'Code enforcement notice, page 1',
    submitted: false,
  },
  topFindings: [
    {
      id: 'finding-001',
      title: 'Recipient Identity Discrepancy',
      severity: 'critical',
      status: 'open',
      briefDescription: 'The inspection request is addressed to a person reportedly deceased approximately six months before the notice date.',
      evidenceCount: 3,
      recommendedAction: 'Start Correction Workflow',
    },
    {
      id: 'finding-002',
      title: 'Missing Inspection Authority',
      severity: 'high',
      status: 'open',
      briefDescription: 'No specific ordinance, statute, or regulation cited as authority for the inspection.',
      evidenceCount: 1,
      recommendedAction: 'Request clarification',
    },
    {
      id: 'finding-003',
      title: 'Missing Complaint Reference',
      severity: 'medium',
      status: 'open',
      briefDescription: 'No complaint number is referenced in the notice.',
      evidenceCount: 1,
    },
    {
      id: 'finding-004',
      title: 'Prior Law Enforcement Visit — Unverified',
      severity: 'medium',
      status: 'reviewing',
      briefDescription: 'User reports a prior law enforcement visit. No matching public record found.',
      evidenceCount: 1,
    },
  ],
  evidenceStatus: {
    total: 3,
    byType: { Notice: 1, 'Property Record': 1, 'User Statement': 1 },
    completeness: 35,
  },
  workflowProgress: {
    workflowName: 'Respond to Inspection Request',
    completedSteps: 4,
    totalSteps: 14,
    currentStepName: 'Recipient reconciliation',
    blockedSteps: [],
    steps: [],
  },
  nextBestAction: {
    id: 'action-001',
    title: 'Resolve recipient discrepancy before responding',
    description: 'The notice is addressed to Jane Doe, who is reportedly deceased. The current property owner per county records is John Doe.',
    reason: 'The agency\'s responsible-party record may not reflect current ownership. Sending a response under the wrong recipient name could cause procedural confusion.',
    priority: 'critical',
    sourceFindingId: 'finding-001',
    workflowId: 'correction',
    actionType: 'start_workflow',
    status: 'pending',
    actionLabel: 'Start Correction Workflow',
  },
  recentTimeline: [],
  recentCommunications: [],
}

// ─── Timeline ──────────────────────────────────────────────────────────────────

export const fixtureTimeline: TimelineEventViewModel[] = [
  {
    id: 'tl-001',
    date: '2026-08-15',
    event: 'Code enforcement inspection request received',
    description: 'Notice dated August 15, 2026, addressed to Jane Doe (reportedly deceased). Case: CE-2026-001.',
    factCategory: 'verified_fact',
    source: 'document',
    documentId: 'doc-001',
    excerpt: 'NOTICE OF INSPECTION REQUEST — Humboldt County Code Enforcement Division — Property: 1234 McKinleyville Rd',
    relatedEvidence: ['doc-001'],
    actor: 'Humboldt County Code Enforcement Division',
    confidence: 0.95,
  },
  {
    id: 'tl-002',
    dateApproximate: true,
    event: 'Prior law enforcement visit — multiple officers entered property',
    description: 'Approximately 2 weeks before notice. Officers said they were investigating stolen property. User disputes the stolen-property allegation. Nothing was found. Officers did not enter home.',
    factCategory: 'user_assertion',
    source: 'user',
    relatedEvidence: ['stmt-001'],
    actor: 'Law enforcement (user reported)',
    confidence: 0.7,
  },
  {
    id: 'tl-003',
    dateApproximate: true,
    event: 'Officer mentioned open Code Enforcement case',
    description: 'During the prior law enforcement visit, an officer reportedly referenced an open Code Enforcement case.',
    factCategory: 'user_assertion',
    source: 'user',
    relatedEvidence: ['stmt-001'],
    confidence: 0.7,
  },
  {
    id: 'tl-004',
    event: 'No matching public call-for-service record found',
    description: 'User searched for a matching public record of the prior law enforcement visit but could not find one.',
    factCategory: 'user_assertion',
    source: 'user',
    confidence: 0.7,
  },
  {
    id: 'tl-005',
    date: '2026-09-03',
    event: 'Response deadline — September 3, 2026',
    description: 'Failure to respond by this date will be considered a denial of consent. The County may then seek an inspection warrant.',
    factCategory: 'verified_fact',
    source: 'document',
    documentId: 'doc-001',
    excerpt: 'Failure to respond by September 3, 2026 will be considered a denial',
    relatedEvidence: ['doc-001'],
    confidence: 0.95,
  },
]

// ─── Evidence ──────────────────────────────────────────────────────────────────

export const fixtureEvidence: EvidenceViewModel[] = [
  {
    id: 'doc-001',
    title: 'Inspection Request Notice — CE-2026-001',
    type: 'notice',
    source: 'Humboldt County Code Enforcement Division',
    date: '2026-08-15',
    hash: 'a1b2c3d4e5f6',
    provenance: 'strong',
    confidence: 0.95,
    relatedFacts: ['notice-date', 'deadline', 'case-number', 'property-address'],
    relatedTimelineEvents: ['tl-001', 'tl-005'],
    relatedFindings: ['finding-001', 'finding-002', 'finding-003'],
    whyItMatters: 'This is the primary notice that triggered the case. All deadlines and allegations originate from this document.',
    excerpt: 'NOTICE OF INSPECTION REQUEST — Property: 1234 McKinleyville Rd, McKinleyville, CA 95519 — Case: CE-2026-001 — Response required by September 3, 2026...',
    pageCount: 2,
  },
  {
    id: 'doc-002',
    title: 'Property Record — 1234 McKinleyville Rd',
    type: 'property_record',
    source: 'Humboldt County Assessor',
    date: '2026-08-20',
    provenance: 'strong',
    confidence: 1.0,
    relatedFacts: ['property-owner', 'apn', 'zoning'],
    relatedFindings: ['finding-001'],
    whyItMatters: 'Confirms the current legal owner is John Doe, not Jane Doe (the notice recipient). This is the key evidence for the recipient discrepancy finding.',
  },
  {
    id: 'stmt-001',
    title: 'User Statement — Prior Law Enforcement Visit',
    type: 'user_statement',
    source: 'User',
    date: '2026-08-24',
    provenance: 'none',
    confidence: 0.7,
    relatedFacts: ['prior-visit', 'stolen-property-claim', 'ce-case-mention'],
    relatedTimelineEvents: ['tl-002', 'tl-003', 'tl-004'],
    relatedFindings: ['finding-004'],
    whyItMatters: 'Documents the user\'s account of a prior law enforcement visit. This is a user assertion and has not been verified against public records.',
  },
]

// ─── Findings ──────────────────────────────────────────────────────────────────

export const fixtureFindings: FindingViewModel[] = [
  {
    id: 'finding-001',
    type: 'recipient_discrepancy',
    title: 'Recipient Identity Discrepancy — Deceased Recipient',
    severity: 'critical',
    status: 'open',
    description: 'The inspection request is addressed to Jane Doe, who is reportedly deceased.',
    whatThisMeans: 'The agency\'s current responsible-party record may not reflect current ownership. The current property owner per county records is John Doe. This may indicate an ownership transition, estate/probate issue, or outdated agency records.',
    evidence: ['Inspection request', 'Death record', 'Property record'],
    sources: ['doc-001', 'doc-002', 'external-death-record'],
    recommendedAction: 'Request correction/confirmation of responsible party',
    humanReviewRequired: true,
    aiReview: {
      modelsCompared: 2,
      agreement: 'AGREEMENT',
      confidence: 'high',
      sourceCount: 3,
    },
    relatedWorkflowId: 'correction',
  },
  {
    id: 'finding-002',
    type: 'authority_uncertainty',
    title: 'Missing Inspection Authority',
    severity: 'high',
    status: 'open',
    description: 'No specific ordinance, statute, or regulation cited as authority for the inspection.',
    whatThisMeans: 'The notice requests inspection but does not cite the legal basis. Without knowing the specific authority, the scope and limits of the agency\'s inspection power cannot be determined.',
    evidence: ['Inspection request notice'],
    sources: ['doc-001'],
    recommendedAction: 'Request clarification of inspection authority',
    humanReviewRequired: false,
    aiReview: {
      modelsCompared: 2,
      agreement: 'DISAGREEMENT',
      confidence: 'medium',
      sourceCount: 1,
      disagreementDetail: 'Gemini found no authority cited. Claude noted the agency header implies code enforcement authority but no specific statute was referenced.',
    },
  },
  {
    id: 'finding-003',
    type: 'missing_complaint_reference',
    title: 'Missing Complaint Reference',
    severity: 'medium',
    status: 'open',
    description: 'No complaint number is referenced in the notice.',
    whatThisMeans: 'Without a complaint number, the original complaint and its basis cannot be independently verified.',
    evidence: ['Inspection request notice'],
    sources: ['doc-001'],
    humanReviewRequired: false,
  },
  {
    id: 'finding-004',
    type: 'timeline_anomaly',
    title: 'Prior Law Enforcement Visit — Unverified',
    severity: 'medium',
    status: 'reviewing',
    description: 'User reports a prior law enforcement visit approximately 2 weeks before the notice. No matching public record has been found.',
    whatThisMeans: 'The prior visit may be related to the subsequent code enforcement notice, but this cannot be confirmed without matching public records.',
    evidence: ['User statement'],
    sources: ['stmt-001'],
    humanReviewRequired: false,
  },
]

// ─── Violations ────────────────────────────────────────────────────────────────

export const fixtureViolations: ViolationViewModel[] = [
  { id: 'viol-001', allegation: 'Crowing rooster', source: 'Inspection request notice', evidenceCount: 1, status: 'alleged' },
  { id: 'viol-002', allegation: 'Unpermitted structure', source: 'Inspection request notice', evidenceCount: 1, status: 'alleged' },
  { id: 'viol-003', allegation: 'Broken/inoperable vehicles', source: 'Inspection request notice', evidenceCount: 1, status: 'alleged' },
  { id: 'viol-004', allegation: 'Improper disposal of solid waste', source: 'Inspection request notice', evidenceCount: 1, status: 'alleged' },
  { id: 'viol-005', allegation: 'Maintaining a junkyard', source: 'Inspection request notice', evidenceCount: 1, status: 'alleged' },
]

// ─── Property ──────────────────────────────────────────────────────────────────

export const fixtureProperty: PropertyViewModel = {
  address: '1234 McKinleyville Rd, McKinleyville, CA 95519',
  apn: '502-15-012',
  parcelNumber: '502-15-012',
  legalDescription: 'Lot 15, Block 2, McKinleyville',
  zoning: 'Residential Agricultural',
  landUse: 'Residential',
  acreage: 1.2,
  source: 'Humboldt County Assessor',
  sourceLabel: 'County Assessor Records',
  openCases: 1,
  priorNotices: 0,
  permits: 3,
  dataStatus: 'verified',
}

// ─── Actions ───────────────────────────────────────────────────────────────────

export const fixtureActions: ActionViewModel[] = [
  {
    id: 'action-001',
    title: 'Resolve recipient discrepancy',
    description: 'Request correction of the recipient identity from the agency before responding to the inspection request.',
    priority: 'critical',
    source: 'Finding: Recipient Identity Discrepancy',
    sourceFindingId: 'finding-001',
    relatedWorkflow: 'Correction Workflow',
    workflowId: 'correction',
    status: 'pending',
    actionType: 'start_workflow',
  },
  {
    id: 'action-002',
    title: 'Upload death certificate or estate documentation',
    description: 'Provide documentation supporting the claim that the notice recipient is deceased.',
    priority: 'high',
    source: 'Finding: Recipient Identity Discrepancy',
    sourceFindingId: 'finding-001',
    status: 'pending',
    actionType: 'upload_evidence',
  },
  {
    id: 'action-003',
    title: 'Request inspection authority clarification',
    description: 'Ask the agency to specify the ordinance, statute, or regulation authorizing the inspection.',
    priority: 'high',
    source: 'Finding: Missing Inspection Authority',
    sourceFindingId: 'finding-002',
    relatedWorkflow: 'Records Request',
    workflowId: 'records-request',
    status: 'pending',
    actionType: 'start_workflow',
  },
]

// ─── Communications ────────────────────────────────────────────────────────────

export const fixtureCommunications: CommunicationViewModel[] = []

// ─── Workflow Progress ───────────────────────────────────────────────────────

export const fixtureWorkflowProgress: WorkflowProgressViewModel = {
  workflowName: 'Respond to Inspection Request',
  completedSteps: 4,
  totalSteps: 14,
  currentStepName: 'Recipient reconciliation',
  blockedSteps: [],
  steps: [
    { id: 'secure_ingest', title: 'Secure Document Ingestion', status: 'complete', required: true, description: 'Accept and validate uploaded documents with prompt-injection defenses.', evidenceCount: 1 },
    { id: 'classify', title: 'Document Classification', status: 'complete', required: true, description: 'Classify document type with confidence and source provenance.' },
    { id: 'extract', title: 'Notice Extraction', status: 'complete', required: true, description: 'Extract all fields from the notice with provenance.', evidenceCount: 30 },
    { id: 'complaint_provenance', title: 'Complaint Provenance', status: 'complete', required: true, description: 'Distinguish complaint allegation from verified condition.' },
    { id: 'recipient_reconciliation', title: 'Recipient / Ownership Reconciliation', status: 'active', required: true, description: 'Reconcile notice recipient with property ownership.' },
    { id: 'property_intelligence', title: 'Property Intelligence', status: 'pending', required: true, description: 'Resolve address, APN, zoning, permits, prior cases.' },
    { id: 'jurisdiction_identification', title: 'Jurisdiction Identification', status: 'pending', required: true, description: 'Identify the exact governing jurisdiction.' },
    { id: 'jurisdiction_research', title: 'Authoritative Research', status: 'pending', required: true, description: 'Research official sources for inspection procedure.' },
    { id: 'scope_analysis', title: 'Inspection Scope Analysis', status: 'pending', required: true, description: 'Identify exactly what the agency wants access to.' },
    { id: 'authority_analysis', title: 'Consent / Authority Analysis', status: 'pending', required: true, description: 'Analyze consent request, authority claimed, consequences.' },
    { id: 'warrant_analysis', title: 'Warrant Language Analysis', status: 'pending', required: false, description: 'Extract and analyze warrant references.' },
    { id: 'timeline', title: 'Timeline Construction', status: 'pending', required: true, description: 'Build deterministic timeline with fact classification.' },
    { id: 'evidence_graph', title: 'Evidence Graph', status: 'pending', required: true, description: 'Create traceability from complaint to draft.' },
    { id: 'discrepancies', title: 'Discrepancy Engine', status: 'pending', required: true, description: 'Detect mismatches and conflicts across all data.' },
  ],
}

// ─── Workflow Options ───────────────────────────────────────────────────────

export const fixtureWorkflowOptions: WorkflowOptionViewModel[] = [
  {
    id: 'correction',
    name: 'Request Correction',
    description: 'Request correction of errors in the notice — wrong recipient, missing authority, missing complaint reference.',
    available: true,
    contextPreserved: ['Case', 'Property', 'Evidence', 'Timeline', 'Jurisdiction'],
  },
  {
    id: 'records-request',
    name: 'Request Records',
    description: 'Request agency records related to the inspection, complaint, or case file.',
    available: true,
    contextPreserved: ['Case', 'Property', 'Jurisdiction'],
  },
  {
    id: 'respond-to-violation',
    name: 'Respond to Violation',
    description: 'Prepare a detailed response to each alleged violation.',
    available: false,
    reason: 'Complete authority analysis first',
  },
  {
    id: 'request-extension',
    name: 'Request Extension',
    description: 'Request an extension of the response deadline.',
    available: true,
    contextPreserved: ['Case', 'Deadline'],
  },
]

// ─── High-Consequence Review (recipient discrepancy) ──────────────────────────

export const fixtureReview: HighConsequenceReviewViewModel = {
  subject: 'Recipient Identity Discrepancy',
  summary: 'The inspection request is addressed to Jane Doe, who is reportedly deceased approximately six months before the notice date. The current property owner per county records is John Doe.',
  facts: [
    { label: 'Notice recipient', value: 'Jane Doe (reportedly deceased)', factCategory: 'verified_fact', source: 'doc-001' },
    { label: 'Current property owner', value: 'John Doe', factCategory: 'verified_fact', source: 'doc-002' },
    { label: 'Notice date', value: 'August 15, 2026', factCategory: 'verified_fact', source: 'doc-001' },
    { label: 'Reported date of death', value: 'Approximately February 2026', factCategory: 'user_assertion', source: 'User statement' },
  ],
  evidence: ['doc-001', 'doc-002', 'external-death-record'],
  rules: [
    'Agency must serve notice on the correct responsible party.',
    'Ownership changes must be reflected in agency records.',
  ],
  conflicts: [
    {
      description: 'The notice recipient (Jane Doe) does not match the current property owner (John Doe) per county records.',
      sources: ['doc-001', 'doc-002'],
    },
  ],
  unknowns: [
    'Whether the agency has been notified of the ownership change.',
    'Whether estate/probate proceedings are complete.',
    'Whether John Doe has been formally served.',
  ],
  risks: [
    'Responding under the wrong name may create procedural confusion.',
    'The agency may proceed to warrant if no response is received.',
    'Deadline pressure may force action before the discrepancy is resolved.',
  ],
  aiAgreement: 'AGREEMENT',
}
