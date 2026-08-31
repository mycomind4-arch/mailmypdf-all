/**
 * I-130 Family Petition Response Domain Model
 *
 * Key architectural decision: I-130 does NOT duplicate the RFE/NOID/Denial engines.
 * It detects the notice type and hands off to the shared engines while preserving
 * I-130 relationship context.
 *
 * I-130-specific intelligence:
 * - Relationship type detection (spouse, parent, child, sibling)
 * - Relationship evidence matrix (what evidence proves this relationship)
 * - Bona fide marriage analysis (for spouse cases)
 * - Foreign document / translation detection
 * - Discrepancy detection (name, date, address mismatches)
 * - Notice type classification → handoff to shared engine
 */

// ─── Relationship Types ───────────────────────────────────────────────────────

export type RelationshipType = 'spouse' | 'parent' | 'child' | 'sibling' | 'unknown';

export type NoticeType = 'rfe' | 'noid' | 'denial' | 'receipt' | 'evidence_request' | 'unknown';

export type EvidenceCategory =
  | 'marriage_certificate'
  | 'birth_certificate'
  | 'adoption_records'
  | 'shared_residence'
  | 'shared_finances'
  | 'insurance'
  | 'taxes'
  | 'photographs'
  | 'correspondence'
  | 'affidavits'
  | 'children_records'
  | 'travel_records'
  | 'identity_documents'
  | 'prior_marriage_termination'
  | 'name_change_records'
  | 'translation'
  | 'other';

export type EvidenceStatus = 'confirmed' | 'supporting' | 'contradictory' | 'missing' | 'unverified' | 'not_applicable' | 'user_unsure';

export interface RelationshipEvidenceItem {
  id: string;
  category: EvidenceCategory;
  description: string;
  status: EvidenceStatus;
  uploadedDocumentIds: string[];
  addressesFinding?: string;
}

export interface DiscrepancyFinding {
  id: string;
  type: 'name_mismatch' | 'date_mismatch' | 'address_mismatch' | 'relationship_inconsistency' | 'case_number_mismatch' | 'missing_translation' | 'duplicate_evidence' | 'missing_pages' | 'contradiction';
  description: string;
  source: string;
  severity: 'low' | 'moderate' | 'high';
  requiresExplanation: boolean;
}

export interface ForeignDocument {
  id: string;
  documentType: string;
  issuingCountry: string;
  language: string;
  translationStatus: 'not_needed' | 'needed' | 'in_progress' | 'completed' | 'unknown';
  certifiedTranslation: boolean;
}

// ─── I-130 Case Context ─────────────────────────────────────────────────────────

export interface I130CaseContext {
  relationshipType: RelationshipType;
  petitionerName?: string;
  beneficiaryName?: string;
  marriageDate?: string;
  relationshipStartDate?: string;
  priorMarriages: { name: string; terminatedDate: string }[];
  children: { name: string; birthDate: string }[];
  receiptNumber?: string;
  aNumber?: string;
  noticeType: NoticeType;
  deadline?: string;
  deadlineDays?: number;
  requestedEvidence: string[];
  evidenceMatrix: RelationshipEvidenceItem[];
  discrepancies: DiscrepancyFinding[];
  foreignDocuments: ForeignDocument[];
  hasTranslationNeeds: boolean;
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  hasAttorneyRecommendation: boolean;
  summaryEn: string;
  summaryEs?: string;
  recommendedActions: string[];
}

// ─── Detection ──────────────────────────────────────────────────────────────────

export function detectRelationshipType(text: string): RelationshipType {
  if (/spouse|husband|wife|marriage|married/i.test(text) && /I-?130/i.test(text)) return 'spouse';
  if (/sibling|brother|sister|common parent/i.test(text) && /I-?130/i.test(text)) return 'sibling';
  if (/parent|father|mother|son of|daughter of/i.test(text) && /I-?130/i.test(text)) return 'parent';
  if (/child|son|daughter|minor child/i.test(text) && /I-?130/i.test(text)) return 'child';
  // Without I-130 context, use relationship words alone
  if (/spouse|husband|wife|marriage|married/i.test(text)) return 'spouse';
  if (/sibling|brother|sister/i.test(text)) return 'sibling';
  if (/parent|father|mother/i.test(text)) return 'parent';
  if (/\bchild\b|\bson\b|\bdaughter\b/i.test(text)) return 'child';
  return 'unknown';
}

export function detectNoticeType(text: string): NoticeType {
  if (/request for evidence|rfe|additional evidence/i.test(text)) return 'rfe';
  if (/notice of intent to deny|noid|intent to deny/i.test(text)) return 'noid';
  if (/denial|denied|decision to deny/i.test(text)) return 'denial';
  if (/receipt|received|I-797/i.test(text) && !/rfe|noid|denial/i.test(text)) return 'receipt';
  if (/evidence|documents?|submit|provide/i.test(text)) return 'evidence_request';
  return 'unknown';
}

// ─── Evidence Matrix Builder ───────────────────────────────────────────────────

export function buildEvidenceMatrix(relationshipType: RelationshipType, requestedEvidence: string[]): RelationshipEvidenceItem[] {
  const matrix: RelationshipEvidenceItem[] = [];
  let id = 0;

  // Always required: identity documents
  matrix.push({
    id: `evidence-${++id}`,
    category: 'identity_documents',
    description: 'Proof of petitioner and beneficiary identity (passports, birth certificates, government IDs)',
    status: 'missing',
    uploadedDocumentIds: [],
  });

  switch (relationshipType) {
    case 'spouse':
      matrix.push(
        { id: `evidence-${++id}`, category: 'marriage_certificate', description: 'Marriage certificate', status: 'missing', uploadedDocumentIds: [] },
        { id: `evidence-${++id}`, category: 'prior_marriage_termination', description: 'Proof of termination of any prior marriages (divorce decrees, death certificates)', status: 'missing', uploadedDocumentIds: [] },
        { id: `evidence-${++id}`, category: 'shared_residence', description: 'Proof of shared residence (lease, mortgage, utility bills)', status: 'missing', uploadedDocumentIds: [] },
        { id: `evidence-${++id}`, category: 'shared_finances', description: 'Proof of shared finances (joint bank accounts, joint ownership)', status: 'missing', uploadedDocumentIds: [] },
        { id: `evidence-${++id}`, category: 'insurance', description: 'Insurance documents showing spouse as beneficiary', status: 'missing', uploadedDocumentIds: [] },
        { id: `evidence-${++id}`, category: 'taxes', description: 'Joint tax returns', status: 'missing', uploadedDocumentIds: [] },
        { id: `evidence-${++id}`, category: 'photographs', description: 'Photographs showing relationship over time', status: 'missing', uploadedDocumentIds: [] },
        { id: `evidence-${++id}`, category: 'affidavits', description: 'Affidavits from family and friends confirming bona fide marriage', status: 'missing', uploadedDocumentIds: [] },
        { id: `evidence-${++id}`, category: 'children_records', description: 'Birth certificates of children together (if applicable)', status: 'not_applicable', uploadedDocumentIds: [] },
        { id: `evidence-${++id}`, category: 'correspondence', description: 'Communications and correspondence between spouses', status: 'missing', uploadedDocumentIds: [] },
      );
      break;
    case 'parent':
      matrix.push(
        { id: `evidence-${++id}`, category: 'birth_certificate', description: "Petitioner's birth certificate showing parent's name", status: 'missing', uploadedDocumentIds: [] },
        { id: `evidence-${++id}`, category: 'identity_documents', description: "Parent's identity and birth documentation", status: 'missing', uploadedDocumentIds: [] },
        { id: `evidence-${++id}`, category: 'other', description: 'Proof of legal parent-child relationship (adoption records, legitimation if applicable)', status: 'missing', uploadedDocumentIds: [] },
      );
      break;
    case 'child':
      matrix.push(
        { id: `evidence-${++id}`, category: 'birth_certificate', description: "Child's birth certificate showing petitioner as parent", status: 'missing', uploadedDocumentIds: [] },
        { id: `evidence-${++id}`, category: 'adoption_records', description: 'Adoption records (if applicable)', status: 'not_applicable', uploadedDocumentIds: [] },
        { id: `evidence-${++id}`, category: 'identity_documents', description: "Child's identity documents", status: 'missing', uploadedDocumentIds: [] },
      );
      break;
    case 'sibling':
      matrix.push(
        { id: `evidence-${++id}`, category: 'birth_certificate', description: 'Birth certificates showing common parent(s)', status: 'missing', uploadedDocumentIds: [] },
        { id: `evidence-${++id}`, category: 'identity_documents', description: 'Identity documents for both siblings', status: 'missing', uploadedDocumentIds: [] },
        { id: `evidence-${++id}`, category: 'name_change_records', description: 'Name change records if either sibling changed their name', status: 'missing', uploadedDocumentIds: [] },
      );
      break;
    case 'unknown':
      matrix.push(
        { id: `evidence-${++id}`, category: 'other', description: 'Evidence establishing the qualifying family relationship', status: 'missing', uploadedDocumentIds: [] },
      );
      break;
  }

  // Map requested evidence items from the notice
  for (const req of requestedEvidence) {
    const matching = matrix.find(m => req.toLowerCase().includes(m.category.replace(/_/g, ' ')));
    if (matching) {
      matching.status = 'missing'; // Explicitly requested by USCIS
      matching.addressesFinding = req;
    } else {
      matrix.push({
        id: `evidence-${++id}`,
        category: 'other',
        description: req,
        status: 'missing',
        uploadedDocumentIds: [],
        addressesFinding: req,
      });
    }
  }

  return matrix;
}

// ─── Discrepancy Detection ───────────────────────────────────────────────────

export function detectDiscrepancies(text: string): DiscrepancyFinding[] {
  const findings: DiscrepancyFinding[] = [];
  let id = 0;

  // Name mismatches
  if (/name.*mismatch|name.*discrepancy|name.*different|name.*inconsisten/i.test(text)) {
    findings.push({
      id: `discrepancy-${++id}`,
      type: 'name_mismatch',
      description: 'Name mismatch detected between documents',
      source: text.slice(text.search(/name.*mismatch|name.*discrepancy|name.*different|name.*inconsisten/i), 200),
      severity: 'moderate',
      requiresExplanation: true,
    });
  }

  // Date mismatches
  if (/date.*mismatch|date.*discrepancy|date.*inconsisten|birth.*date.*differ/i.test(text)) {
    findings.push({
      id: `discrepancy-${++id}`,
      type: 'date_mismatch',
      description: 'Date mismatch detected between documents',
      source: text.slice(text.search(/date.*mismatch|date.*discrepancy|date.*inconsisten|birth.*date.*differ/i), 200),
      severity: 'moderate',
      requiresExplanation: true,
    });
  }

  // Address mismatches
  if (/address.*mismatch|address.*discrepancy|address.*different/i.test(text)) {
    findings.push({
      id: `discrepancy-${++id}`,
      type: 'address_mismatch',
      description: 'Address mismatch detected',
      source: text.slice(text.search(/address.*mismatch|address.*discrepancy|address.*different/i), 200),
      severity: 'low',
      requiresExplanation: true,
    });
  }

  return findings;
}

// ─── Foreign Document / Translation Detection ────────────────────────────────

export function detectForeignDocuments(text: string): ForeignDocument[] {
  const docs: ForeignDocument[] = [];
  let id = 0;

  // Common foreign document indicators
  const foreignDocPatterns = [
    { type: 'marriage certificate', patterns: [/marriage certificate.*foreign/i, /foreign.*marriage certificate/i] },
    { type: 'birth certificate', patterns: [/birth certificate.*foreign/i, /foreign.*birth certificate/i] },
    { type: 'divorce decree', patterns: [/divorce.*foreign/i, /foreign.*divorce/i] },
  ];

  for (const { type, patterns } of foreignDocPatterns) {
    for (const p of patterns) {
      if (p.test(text)) {
        docs.push({
          id: `foreign-doc-${++id}`,
          documentType: type,
          issuingCountry: 'unknown',
          language: 'unknown',
          translationStatus: 'needed',
          certifiedTranslation: false,
        });
        break;
      }
    }
  }

  // If text mentions translation requirement
  if (/translat/i.test(text) && docs.length === 0) {
    docs.push({
      id: `foreign-doc-${++id}`,
      documentType: 'unspecified foreign document',
      issuingCountry: 'unknown',
      language: 'non-English',
      translationStatus: 'needed',
      certifiedTranslation: false,
    });
  }

  return docs;
}

export function hasTranslationNeeds(foreignDocs: ForeignDocument[]): boolean {
  return foreignDocs.some(d => d.translationStatus === 'needed' && d.certifiedTranslation === false);
}

// ─── Risk Assessment ──────────────────────────────────────────────────────────

export function assessI130Risk(
  discrepancies: DiscrepancyFinding[],
  evidenceMatrix: RelationshipEvidenceItem[],
  noticeType: NoticeType,
): 'low' | 'moderate' | 'high' | 'critical' {
  let risk: 'low' | 'moderate' | 'high' | 'critical' = 'low';

  if (noticeType === 'noid') risk = 'high';
  if (noticeType === 'denial') risk = 'critical';

  if (discrepancies.some(d => d.severity === 'high')) risk = risk === 'critical' ? 'critical' : 'high';
  if (discrepancies.length > 2) risk = risk === 'low' ? 'moderate' : risk;

  const missingCritical = evidenceMatrix.filter(e =>
    e.status === 'missing' && ['marriage_certificate', 'birth_certificate', 'identity_documents'].includes(e.category)
  );
  if (missingCritical.length > 0 && risk === 'low') risk = 'moderate';

  return risk;
}

export function shouldRecommendAttorney(
  risk: 'low' | 'moderate' | 'high' | 'critical',
  noticeType: NoticeType,
  discrepancies: DiscrepancyFinding[],
): boolean {
  if (risk === 'critical' || risk === 'high') return true;
  if (noticeType === 'noid' || noticeType === 'denial') return true;
  if (discrepancies.some(d => d.severity === 'high')) return true;
  return false;
}

// ─── Full I-130 Analysis ──────────────────────────────────────────────────────

export function analyzeI130(text: string): I130CaseContext {
  const relationshipType = detectRelationshipType(text);
  const noticeType = detectNoticeType(text);
  const discrepancies = detectDiscrepancies(text);
  const foreignDocs = detectForeignDocuments(text);
  const translationNeeds = hasTranslationNeeds(foreignDocs);

  // Extract requested evidence from RFE/NOID text
  const requestedEvidence: string[] = [];
  const evidenceMatches = text.match(/(?:submit|provide|include)\s+([^.]{10,100})/gi);
  if (evidenceMatches) {
    for (const m of evidenceMatches.slice(0, 10)) {
      requestedEvidence.push(m.replace(/^(submit|provide|include)\s+/i, '').trim());
    }
  }

  const evidenceMatrix = buildEvidenceMatrix(relationshipType, requestedEvidence);
  const overallRisk = assessI130Risk(discrepancies, evidenceMatrix, noticeType);
  const hasAttorneyRec = shouldRecommendAttorney(overallRisk, noticeType, discrepancies);

  // Extract receipt number
  const receiptMatch = text.match(/\b([A-Z]{3}\d{10})\b/);
  const receiptNumber = receiptMatch?.[1];

  // Extract A-number
  const aNumberMatch = text.match(/\bA\s*\d{8,9}\b/);
  const aNumber = aNumberMatch?.[0];

  // Extract deadline
  const deadlineMatch = text.match(/no later than\s+([A-Z][a-z]+ \d{1,2},?\s*\d{4})/i) ??
    text.match(/within\s+(\d+)\s+days/i);
  const deadline = deadlineMatch && deadlineMatch[1].match(/^\d+$/) ? undefined : deadlineMatch?.[1];
  const deadlineDays = deadlineMatch && deadlineMatch[1].match(/^\d+$/) ? parseInt(deadlineMatch[1]) : undefined;

  // Extract marriage date
  const marriageMatch = text.match(/married\s*:?\s*([A-Z][a-z]+ \d{1,2},?\s*\d{4})/i) ??
    text.match(/marriage\s*(?:date)?\s*:?\s*([A-Z][a-z]+ \d{1,2},?\s*\d{4})/i);

  const relLabel = relationshipType === 'spouse' ? 'spouse' :
    relationshipType === 'parent' ? 'parent' :
    relationshipType === 'child' ? 'child' :
    relationshipType === 'sibling' ? 'sibling' : 'family relationship';

  const noticeLabel = noticeType === 'rfe' ? 'Request for Evidence' :
    noticeType === 'noid' ? 'Notice of Intent to Deny' :
    noticeType === 'denial' ? 'Denial' :
    noticeType === 'receipt' ? 'Receipt Notice' : 'correspondence';

  const summaryEn = `This appears to be an I-130 family petition for a ${relLabel}. ` +
    `The notice type is: ${noticeLabel}. ` +
    (requestedEvidence.length > 0 ? `${requestedEvidence.length} item(s) requested by USCIS. ` : '') +
    (discrepancies.length > 0 ? `${discrepancies.length} discrepancy/discrepancies detected. ` : '') +
    (translationNeeds ? 'Translation is needed for foreign documents. ' : '') +
    `Overall risk: ${overallRisk}. ` +
    (hasAttorneyRec ? 'An attorney is recommended.' : 'You may be able to respond on your own.');

  const summaryEs = `Esto parece ser una petición familiar I-130 para ${relLabel === 'spouse' ? 'un cónyuge' : relLabel === 'parent' ? 'un padre' : relLabel === 'child' ? 'un hijo' : 'una relación familiar'}. ` +
    `Tipo de aviso: ${noticeLabel}. ` +
    (discrepancies.length > 0 ? `${discrepancies.length} discrepancia(s) detectada(s). ` : '') +
    (translationNeeds ? 'Se necesita traducción. ' : '') +
    `Riesgo: ${overallRisk}. ` +
    (hasAttorneyRec ? 'Se recomienda un abogado.' : 'Puede responder por su cuenta.');

  const recommendedActions: string[] = [];
  recommendedActions.push(`Gather evidence proving the ${relLabel} relationship.`);
  if (noticeType === 'rfe') recommendedActions.push('Submit the specific evidence requested in the RFE.');
  if (noticeType === 'noid') recommendedActions.push('Address every denial ground in the NOID.');
  if (noticeType === 'denial') recommendedActions.push('Consider an appeal or motion (I-290B).');
  if (translationNeeds) recommendedActions.push('Obtain certified English translations for foreign documents.');
  if (discrepancies.length > 0) recommendedActions.push('Prepare explanations for any name, date, or address discrepancies.');
  if (hasAttorneyRec) recommendedActions.push('Consult an immigration attorney.');
  recommendedActions.push('Organize evidence with a cover letter and evidence index.');
  recommendedActions.push('Mail with certified mail and keep proof of delivery.');

  // Add translation evidence item if translation needed
  if (translationNeeds) {
    evidenceMatrix.push({
      id: `evidence-translation`,
      category: 'translation',
      description: 'Certified English translation of all foreign-language documents',
      status: 'missing',
      uploadedDocumentIds: [],
    });
  }

  return {
    relationshipType, noticeType, receiptNumber, aNumber,
    marriageDate: marriageMatch?.[1],
    deadline, deadlineDays,
    requestedEvidence, evidenceMatrix, discrepancies, foreignDocuments: foreignDocs,
    hasTranslationNeeds: translationNeeds,
    overallRisk, hasAttorneyRecommendation: hasAttorneyRec,
    summaryEn, summaryEs, recommendedActions,
    priorMarriages: [], children: [],
  };
}

// ─── I-130 Strategy ────────────────────────────────────────────────────────────

export interface I130Strategy {
  type: 'evidence_submission' | 'rfe_response' | 'noid_response' | 'denial_response' | 'general';
  description: string;
  steps: { action: string; rationale: string; status: 'supported' | 'conditional' | 'uncertain' | 'blocked' }[];
  attorneyRequired: boolean;
  handsOffTo?: NoticeType;
}

export function buildI130Strategy(context: I130CaseContext): I130Strategy {
  const type: I130Strategy['type'] =
    context.noticeType === 'rfe' ? 'rfe_response' :
    context.noticeType === 'noid' ? 'noid_response' :
    context.noticeType === 'denial' ? 'denial_response' :
    context.noticeType === 'evidence_request' ? 'evidence_submission' : 'general';

  const steps: I130Strategy['steps'] = [];

  // Evidence steps
  for (const item of context.evidenceMatrix) {
    if (item.status === 'missing') {
      steps.push({
        action: `Obtain: ${item.description}`,
        rationale: item.addressesFinding ? `Requested by USCIS: ${item.addressesFinding}` : 'Required for relationship proof',
        status: 'uncertain',
      });
    }
  }

  // Discrepancy steps
  for (const d of context.discrepancies) {
    if (d.requiresExplanation) {
      steps.push({
        action: `Explain discrepancy: ${d.description}`,
        rationale: 'USCIS may question inconsistencies',
        status: 'conditional',
      });
    }
  }

  // Translation steps
  if (context.hasTranslationNeeds) {
    steps.push({
      action: 'Obtain certified English translations for all foreign documents',
      rationale: 'USCIS requires certified English translations of foreign-language documents',
      status: 'supported',
    });
  }

  // Handoff
  if (context.noticeType === 'rfe') {
    steps.push({ action: 'Prepare RFE response packet', rationale: 'Hand off to shared RFE engine', status: 'supported' });
  } else if (context.noticeType === 'noid') {
    steps.push({ action: 'Prepare NOID response packet', rationale: 'Hand off to shared NOID engine', status: 'supported' });
  } else if (context.noticeType === 'denial') {
    steps.push({ action: 'Prepare denial response / appeal', rationale: 'Hand off to shared Denial engine', status: 'supported' });
  }

  return {
    type,
    description: `I-130 ${type.replace(/_/g, ' ')} strategy for ${context.relationshipType} relationship`,
    steps,
    attorneyRequired: context.hasAttorneyRecommendation,
    handsOffTo: context.noticeType === 'unknown' ? undefined : context.noticeType,
  };
}
