/**
 * USCIS FOIA / A-File Records Request Domain Model
 *
 * Fundamentally different from RFE/NOID/Denial/I-130:
 * - User INITIATES this (not responding to a USCIS notice)
 * - Requesting government records, not submitting evidence
 * - Identity verification is critical (proving you are entitled to your own records)
 * - Different authority: FOIA statute (5 U.S.C. § 552), USCIS records policies
 * - No USCIS deadline — but statutory response timelines exist
 * - Different output: FOIA request letter, identity documents
 */

// ─── FOIA Request Types ────────────────────────────────────────────────────────

export type FOIAType = 'uscis' | 'eoir' | 'ice' | 'g-639' | 'generic';

export type RecordScope =
  | 'a_file'              // Complete Alien file
  | 'immigration_history' // Full immigration history
  | 'specific_records'    // Specific documents (I-130, I-485, N-400, etc.)
  | 'case_file'           // Case-specific records
  | 'tracking_history'    // USCIS case tracking history
  | 'biometrics'          // Biometrics records
  | 'correspondence'      // All USCIS correspondence
  | 'other';

export type RequestUrgency = 'standard' | 'expedited' | 'urgent';

export type IdentityDocType =
  | 'passport'
  | 'drivers_license'
  | 'state_id'
  | 'permanent_resident_card'
  | 'employment_authorization'
  | 'birth_certificate'
  | 'naturalization_certificate'
  | 'other';

export interface FOIARequestItem {
  id: string;
  scope: RecordScope;
  description: string;
  caseNumber?: string;
  formType?: string;
  dateRange?: { from?: string; to?: string };
  reason?: string;
}

export interface IdentityVerification {
  id: string;
  documentType: IdentityDocType;
  documentNumber?: string;
  issuingAuthority?: string;
  expiryDate?: string;
  uploaded: boolean;
}

export interface FOIAAnalysis {
  type: FOIAType;
  recordScope: RecordScope[];
  requestItems: FOIARequestItem[];
  urgency: RequestUrgency;
  identityVerified: boolean;
  identityDocuments: IdentityVerification[];
  aNumber?: string;
  receiptNumbers: string[];
  hasCompleteIdentity: boolean;
  statutoryDeadline: string;
  estimatedResponse: string;
  overallRisk: 'low' | 'moderate' | 'high';
  summaryEn: string;
  summaryEs?: string;
  recommendedActions: string[];
}

// ─── Detection ──────────────────────────────────────────────────────────────────

export function detectFOIAType(text: string): FOIAType {
  if (/g-?639/i.test(text)) return 'g-639';
  if (/uscis/i.test(text) && /foia/i.test(text)) return 'uscis';
  if (/eoir/i.test(text) && /foia/i.test(text)) return 'eoir';
  if (/\bice\b/i.test(text) && /foia/i.test(text)) return 'ice';
  if (/foia|freedom of information/i.test(text)) return 'generic';
  return 'generic';
}

export function detectRecordScope(text: string): RecordScope[] {
  const scopes: RecordScope[] = [];
  if (/a-file|a file|alien file/i.test(text)) scopes.push('a_file');
  if (/immigration history|complete history|full history/i.test(text)) scopes.push('immigration_history');
  if (/specific records|specific document|particular record/i.test(text)) scopes.push('specific_records');
  if (/case file|case records/i.test(text)) scopes.push('case_file');
  if (/tracking/i.test(text)) scopes.push('tracking_history');
  if (/biometrics|fingerprint/i.test(text)) scopes.push('biometrics');
  if (/correspondence|all communication/i.test(text)) scopes.push('correspondence');
  if (scopes.length === 0) scopes.push('a_file'); // Default to A-file request
  return [...new Set(scopes)];
}

export function detectUrgency(text: string): RequestUrgency {
  if (/expedited|urgent|emergency|immediate/i.test(text)) {
    if (/emergency|life.*threatening|immediate danger/i.test(text)) return 'urgent';
    return 'expedited';
  }
  return 'standard';
}

export function detectRequestItems(text: string): FOIARequestItem[] {
  const items: FOIARequestItem[] = [];
  let id = 0;

  // Detect A-number
  const aNumberMatch = text.match(/\bA\s*\d{8,9}\b/);
  const aNumber = aNumberMatch?.[0];

  // Detect receipt numbers
  const receiptMatches = text.match(/\b[A-Z]{3}\d{10}\b/g) ?? [];
  const receiptNumbers = [...new Set(receiptMatches)];

  // Detect form types
  const formMatches = text.match(/\bI-?\d{3}\b|\bN-?\d{3}\b|\bI-?\d{3}[A-Z]?\b/gi) ?? [];
  const forms = [...new Set(formMatches.map(f => f.toUpperCase()))];

  // Detect case numbers
  const caseMatches = text.match(/\bcase\s*(?:no\.?|number)?\s*:?\s*([A-Z0-9-]+)/gi) ?? [];
  const caseNumbers = caseMatches.map(m => m.replace(/case\s*(?:no\.?|number)?\s*:?\s*/i, '').trim());

  // Build request items from detected forms
  for (const form of forms) {
    items.push({
      id: `request-${++id}`,
      scope: form.startsWith('N') ? 'specific_records' : 'specific_records',
      description: `Records related to Form ${form}`,
      formType: form,
    });
  }

  // If no specific items detected, add a general A-file request
  if (items.length === 0) {
    items.push({
      id: `request-${++id}`,
      scope: 'a_file',
      description: 'Complete A-File (alien file)',
    });
  }

  // Add case number references
  for (const caseNum of caseNumbers.slice(0, 5)) {
    if (!items.some(i => i.caseNumber === caseNum)) {
      items.push({
        id: `request-${++id}`,
        scope: 'case_file',
        description: `Case file for ${caseNum}`,
        caseNumber: caseNum,
      });
    }
  }

  return items;
}

export function detectIdentityDocuments(text: string): IdentityVerification[] {
  const docs: IdentityVerification[] = [];
  let id = 0;

  if (/passport/i.test(text)) docs.push({ id: `id-${++id}`, documentType: 'passport', uploaded: false });
  if (/driver.?s license/i.test(text)) docs.push({ id: `id-${++id}`, documentType: 'drivers_license', uploaded: false });
  if (/state id/i.test(text)) docs.push({ id: `id-${++id}`, documentType: 'state_id', uploaded: false });
  if (/permanent resident|green card/i.test(text)) docs.push({ id: `id-${++id}`, documentType: 'permanent_resident_card', uploaded: false });
  if (/employment authorization|work permit|ead/i.test(text)) docs.push({ id: `id-${++id}`, documentType: 'employment_authorization', uploaded: false });
  if (/birth certificate/i.test(text)) docs.push({ id: `id-${++id}`, documentType: 'birth_certificate', uploaded: false });
  if (/naturalization certificate/i.test(text)) docs.push({ id: `id-${++id}`, documentType: 'naturalization_certificate', uploaded: false });

  if (docs.length === 0) {
    // Default recommendation
    docs.push({ id: `id-${++id}`, documentType: 'passport', uploaded: false });
    docs.push({ id: `id-${++id}`, documentType: 'drivers_license', uploaded: false });
  }

  return docs;
}

// ─── Full Analysis ────────────────────────────────────────────────────────────

export function analyzeFOIARequest(text: string): FOIAAnalysis {
  const type = detectFOIAType(text);
  const scopes = detectRecordScope(text);
  const urgency = detectUrgency(text);
  const requestItems = detectRequestItems(text);
  const identityDocs = detectIdentityDocuments(text);

  const aNumberMatch = text.match(/\bA\s*\d{8,9}\b/);
  const aNumber = aNumberMatch?.[0];

  const receiptMatches = text.match(/\b[A-Z]{3}\d{10}\b/g) ?? [];
  const receiptNumbers = [...new Set(receiptMatches)];

  const hasCompleteIdentity = identityDocs.length >= 1; // At least one ID

  const statutoryDeadline = urgency === 'expedited'
    ? 'Expedited: typically 20 business days (may be longer)'
    : urgency === 'urgent'
    ? 'Urgent: expedited processing requested, typically 20 business days'
    : 'Standard: typically 20-30 business days (may be extended)';

  const estimatedResponse = urgency === 'standard'
    ? '4-8 weeks (may be longer for complex requests)'
    : '2-4 weeks (expedited)';

  const risk: 'low' | 'moderate' | 'high' = urgency === 'urgent' ? 'high' : urgency === 'expedited' ? 'moderate' : 'low';

  const summaryEn = `This is a ${type === 'uscis' ? 'USCIS' : type === 'eoir' ? 'EOIR' : type === 'ice' ? 'ICE' : type === 'g-639' ? 'G-639' : 'FOIA'} records request. ` +
    `Scope: ${scopes.map(s => s.replace(/_/g, ' ')).join(', ')}. ` +
    `${requestItems.length} item(s) requested. ` +
    `${identityDocs.length} identity document(s) identified. ` +
    `Urgency: ${urgency}. ` +
    `Estimated response: ${estimatedResponse}.`;

  const summaryEs = `Esta es una solicitud de registros de ${type === 'uscis' ? 'USCIS' : type === 'eoir' ? 'EOIR' : type === 'ice' ? 'ICE' : 'FOIA'}. ` +
    `${requestItems.length} elemento(s) solicitado(s). ` +
    `Urgencia: ${urgency === 'standard' ? 'estándar' : urgency === 'expedited' ? 'acelerada' : 'urgente'}. ` +
    `Respuesta estimada: ${estimatedResponse}.`;

  const recommendedActions: string[] = [
    'Gather identity documents (at least one government-issued photo ID).',
    'Identify the specific records you are requesting.',
    'Include your A-number if known.',
    'Include receipt numbers for specific case records.',
    'Submit the request to the correct agency.',
    'Keep proof of submission and track the response.',
  ];

  if (urgency !== 'standard') {
    recommendedActions.unshift('Expedited processing requires justification — include your reason for urgency.');
  }

  return {
    type, recordScope: scopes, requestItems, urgency,
    identityVerified: hasCompleteIdentity, identityDocuments: identityDocs,
    aNumber, receiptNumbers, hasCompleteIdentity,
    statutoryDeadline, estimatedResponse,
    overallRisk: risk,
    summaryEn, summaryEs, recommendedActions,
  };
}

// ─── FOIA Strategy ──────────────────────────────────────────────────────────────

export interface FOIAStrategy {
  type: 'records_request' | 'expedited_request' | 'appeal_request' | 'follow_up';
  description: string;
  steps: { action: string; rationale: string; status: 'supported' | 'conditional' | 'uncertain' }[];
  agencyAddress: string;
  formRequired?: string;
  feeExpected: boolean;
}

export function buildFOIAStrategy(analysis: FOIAAnalysis): FOIAStrategy {
  const steps: FOIAStrategy['steps'] = [];

  steps.push({ action: 'Verify identity with government-issued photo ID', rationale: 'Required to prove entitlement to records', status: 'supported' });

  for (const item of analysis.requestItems) {
    steps.push({
      action: `Request: ${item.description}`,
      rationale: item.caseNumber ? `Case: ${item.caseNumber}` : item.formType ? `Form: ${item.formType}` : 'Requested scope',
      status: 'supported',
    });
  }

  if (analysis.urgency !== 'standard') {
    steps.push({ action: 'Include expedited processing justification', rationale: 'Required for expedited review', status: 'conditional' });
  }

  if (analysis.aNumber) {
    steps.push({ action: `Include A-number: ${analysis.aNumber}`, rationale: 'Helps locate records', status: 'supported' });
  }

  steps.push({ action: 'Submit to correct agency address', rationale: 'Different agencies handle different records', status: 'supported' });
  steps.push({ action: 'Keep proof of submission', rationale: 'Track response timeline', status: 'supported' });

  const agencyAddress = analysis.type === 'uscis'
    ? 'USCIS FOIA/PA Office, National Records Center, P.O. Box 648010, Lee\'s Summit, MO 64064-8010'
    : analysis.type === 'eoir'
    ? 'EOIR FOIA/PA Office, Office of the General Counsel, 5107 Leesburg Pike, Falls Church, VA 22041'
    : analysis.type === 'ice'
    ? 'ICE FOIA Office, 500 12th Street SW, Washington, DC 20536'
    : 'USCIS FOIA/PA Office, National Records Center, P.O. Box 648010, Lee\'s Summit, MO 64064-8010';

  return {
    type: analysis.urgency !== 'standard' ? 'expedited_request' : 'records_request',
    description: `FOIA ${analysis.urgency} records request for ${analysis.requestItems.length} item(s)`,
    steps,
    agencyAddress,
    formRequired: analysis.type === 'g-639' ? 'G-639' : undefined,
    feeExpected: false, // Most FOIA requests for personal records are free
  };
}
