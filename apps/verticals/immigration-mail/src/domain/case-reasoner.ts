/**
 * G3 — Immigration Case Reasoner Engine
 *
 * Transforms canonical Case/Intake data into a conservative, evidence-based
 * case analysis. This is a deterministic engine — it does NOT call an LLM.
 *
 * The reasoner:
 * 1. Analyzes documents for notice types, agencies, deadlines, facts
 * 2. Analyzes user narrative for issue signals
 * 3. Cross-references documents with user claims to detect contradictions
 * 4. Detects compound/multiple simultaneous issues
 * 5. Identifies missing facts and classifies their materiality
 * 6. Selects candidate workflows based on evidence (not keyword matching)
 * 7. Rejects workflows when evidence doesn't support them
 * 8. Preserves UNKNOWN as UNKNOWN — never converts uncertainty to certainty
 * 9. Produces user-facing summaries in the appropriate language
 * 10. Never exposes internal workflow IDs
 *
 * Safety: fail-closed for consequential actions.
 */

import type {
  CaseReasoning,
  ReasonerInput,
  DetectedIssue,
  DeadlineFinding,
  MissingFact,
  EvidenceGap,
  CandidateWorkflow,
  RejectedWorkflow,
  RiskFinding,
  UncertaintyFinding,
  AuthorityFinding,
  RecommendedNextStep,
  KnowledgeState,
  FactReference,
  IssueType,
  Materiality,
} from './case-reasoning';
import type { DocumentUnderstanding } from './document-understanding';
import type { CaseFact, Deadline, ImmigrationDocument, FactSource, SupportedLanguage } from './immigration-case';
import type { LanguageContext } from './multilingual';

// ─── Utilities ────────────────────────────────────────────────────────────────

let issueCounter = 0;
let factCounter = 0;
let deadlineCounter = 0;
let gapCounter = 0;
let riskCounter = 0;
let uncertaintyCounter = 0;
let authorityCounter = 0;

function issueId(): string { return `issue-${++issueCounter}`; }
function factId(): string { return `mf-${++factCounter}`; }
function deadlineId(): string { return `dl-${++deadlineCounter}`; }
function gapId(): string { return `gap-${++gapCounter}`; }
function riskId(): string { return `risk-${++riskCounter}`; }
function uncertaintyId(): string { return `unc-${++uncertaintyCounter}`; }
function authorityId(): string { return `auth-${++authorityCounter}`; }

function resetCounters() {
  issueCounter = 0;
  factCounter = 0;
  deadlineCounter = 0;
  gapCounter = 0;
  riskCounter = 0;
  uncertaintyCounter = 0;
  authorityCounter = 0;
}

function factRef(fact: CaseFact, state: KnowledgeState): FactReference {
  return {
    factKey: fact.key,
    value: fact.value,
    source: fact.source,
    knowledgeState: state,
  };
}

function factRefFromSource(key: string, value: string, source: FactSource, state: KnowledgeState): FactReference {
  return { factKey: key, value, source, knowledgeState: state };
}

// ─── Narrative Analysis ────────────────────────────────────────────────────
// Detects issue signals from the user's free-text narrative.
// Does NOT assume a workflow applies merely because keywords match.

interface NarrativeSignal {
  issueType: IssueType;
  keywords: string[];
  confidence: number;
}

const NARRATIVE_SIGNALS: NarrativeSignal[] = [
  { issueType: 'denial', keywords: ['denied', 'denial', 'rejected my', 'refused', 'turned down', 'fue negada', 'negaron', 'negada'], confidence: 0.7 },
  { issueType: 'rfe', keywords: ['request for evidence', 'rfe', 'requested evidence', 'asked for evidence', 'more evidence', 'solicitud de evidencia'], confidence: 0.75 },
  { issueType: 'noid', keywords: ['notice of intent to deny', 'noid', 'intent to deny', 'intención de negar', 'aviso de intención'], confidence: 0.8 },
  { issueType: 'rejection', keywords: ['rejected', 'returned', 'incomplete', 'incorrect fee', 'wrong fee', 'rechazado', 'devuelto'], confidence: 0.65 },
  { issueType: 'deadline', keywords: ['deadline', 'due date', 'days to respond', 'time limit', 'running out of time', 'have about', 'i have', 'days to', 'fecha límite', 'plazo', 'días'], confidence: 0.7 },
  { issueType: 'missing_evidence', keywords: ['missing document', 'lost document', 'don\'t have', 'can\'t find', 'missing evidence', 'no tengo', 'no tengo los documentos', 'faltan documentos', 'perdí', 'no encuentro'], confidence: 0.6 },
  { issueType: 'duplicate_submission', keywords: ['already sent', 'submitted before', 'sent this before', 'already filed', 'previously submitted', 'ya envié', 'ya mandé', 'ya presenté'], confidence: 0.65 },
  { issueType: 'status_problem', keywords: ['status expired', 'out of status', 'overstayed', 'unlawful presence', 'no status', 'estatus expirado', 'sin estatus'], confidence: 0.7 },
  { issueType: 'language_barrier', keywords: ['can\'t read english', 'don\'t understand english', 'in spanish', 'no entiendo', 'spanish only', 'no entiendo inglés'], confidence: 0.6 },
  { issueType: 'appointment', keywords: ['interview', 'biometrics', 'fingerprint', 'appointment', 'cita', 'huellas'], confidence: 0.6 },
  { issueType: 'fee_issue', keywords: ['fee waiver', 'can\'t afford', 'payment issue', 'fee was wrong', 'tarifa', 'no puedo pagar'], confidence: 0.6 },
  { issueType: 'address_problem', keywords: ['wrong address', 'moved', 'didn\'t receive', 'address change', 'never got the letter', 'dirección incorrecta', 'me mudé', 'no recibí'], confidence: 0.6 },
  { issueType: 'procedural_posture', keywords: ['appeal', 'motion', 'reconsideration', 'reopen', 'what are my options', 'cuáles son mis opciones', 'apelar', 'apelación'], confidence: 0.55 },
];

function analyzeNarrative(narrative: string): NarrativeSignal[] {
  const lower = narrative.toLowerCase();
  return NARRATIVE_SIGNALS.filter(signal =>
    signal.keywords.some(kw => lower.includes(kw))
  );
}

// ─── Contradiction Detection ────────────────────────────────────────────────

interface ContradictionResult {
  factKey: string;
  documentValue: string;
  narrativeSignal: string;
  issueType: 'contradiction';
}

function detectContradictions(
  facts: CaseFact[],
  documentUnderstandings: DocumentUnderstanding[],
  narrative: string,
): ContradictionResult[] {
  const contradictions: ContradictionResult[] = [];
  const lower = narrative.toLowerCase();

  // Check if user narrative contradicts document facts about deadlines
  for (const understanding of documentUnderstandings) {
    for (const dl of understanding.deadlines) {
      // Check both dated and date-less deadline signals from documents
      if (/no deadline|don't have a deadline|there is no deadline/i.test(lower)) {
        contradictions.push({
          factKey: `deadline:${dl.label}`,
          documentValue: dl.date ?? 'deadline referenced in document',
          narrativeSignal: 'User claims no deadline exists',
          issueType: 'contradiction',
        });
      }
    }
  }

  // Check if user says something different about the document type
  for (const understanding of documentUnderstandings) {
    if (understanding.noticeType === 'RFE' && /denial|denied/i.test(lower) && !/rfe/i.test(lower)) {
      contradictions.push({
        factKey: 'notice_type',
        documentValue: 'RFE (Request for Evidence)',
        narrativeSignal: 'User describes it as a denial',
        issueType: 'contradiction',
      });
    }
    if (understanding.noticeType === 'NOID' && /rfe|request for evidence/i.test(lower) && !/noid|intent to deny/i.test(lower)) {
      contradictions.push({
        factKey: 'notice_type',
        documentValue: 'NOID (Notice of Intent to Deny)',
        narrativeSignal: 'User describes it as an RFE',
        issueType: 'contradiction',
      });
    }
  }

  return contradictions;
}

// ─── Deadline Engine ────────────────────────────────────────────────────────

function buildDeadlineFindings(
  caseDeadlines: Deadline[],
  documentUnderstandings: DocumentUnderstanding[],
  narrative: string,
): DeadlineFinding[] {
  const findings: DeadlineFinding[] = [];
  const lower = narrative.toLowerCase();

  // From case deadlines (canonical model)
  for (const dl of caseDeadlines) {
    const hasDocumentSource = dl.source && dl.source.confidence >= 0.8;
    const source: DeadlineFinding['source'] = hasDocumentSource ? 'document' : 'user';
    findings.push({
      id: deadlineId(),
      date: dl.date,
      source,
      sourceDocument: dl.source?.documentId,
      consequence: 'Missing this deadline may result in denial, abandonment of the application, or loss of procedural rights.',
      confidence: dl.source?.confidence ?? 0.5,
      type: dl.label,
      calculationMethod: hasDocumentSource ? 'explicit' : 'user_stated',
      assumptions: hasDocumentSource ? [] : ['Date was provided by the user and has not been verified against the source document.'],
      requiresConfirmation: !hasDocumentSource,
    });
  }

  // From document understandings
  for (const du of documentUnderstandings) {
    for (const dl of du.deadlines) {
      // Avoid duplicates with case deadlines
      if (caseDeadlines.some(cdl => cdl.date === dl.date && cdl.label === dl.label)) continue;

      const confidence = dl.confidence;
      findings.push({
        id: deadlineId(),
        date: dl.date ?? null,
        source: 'document',
        sourceDocument: dl.source?.documentId,
        consequence: 'Missing this deadline may result in denial or loss of procedural rights.',
        confidence,
        type: dl.label,
        calculationMethod: dl.date ? 'explicit' : 'inferred',
        assumptions: dl.date ? [] : ['Deadline was inferred from document text but no explicit date was found.'],
        requiresConfirmation: !dl.date || confidence < 0.8,
      });
    }
  }

  // From narrative — detect user-reported deadlines using multiple patterns
  const narrativeDeadlinePatterns = [
    /within\s+(\d+)\s+days/i,
    /(?:have|about|got|with)\s+(?:about\s+)?(\d+)\s+days/i,
    /(\d+)\s+days\s+to\s+(?:respond|reply|submit|file)/i,
    /tengo\s+(?:unos\s+)?(\d+)\s+d[ií]as/i,
    /(\d+)\s+d[ií]as/i,
  ];
  const narrativeDeadlineMatch = narrativeDeadlinePatterns.find(p => p.test(lower));
  if (narrativeDeadlineMatch && findings.length === 0) {
    findings.push({
      id: deadlineId(),
      date: null,
      source: 'user',
      consequence: 'A stated deadline may limit the time to respond.',
      confidence: 0.5,
      type: 'User-stated deadline',
      calculationMethod: 'user_stated',
      assumptions: ['The user mentioned a time limit but the exact date is not confirmed.'],
      requiresConfirmation: true,
    });
  }

  // If user mentions "deadline" or "fecha límite" but no deadline was found yet
  const mentionsDeadline = /deadline|due date|fecha límite|plazo|días|d[ií]as/i.test(lower);
  if (mentionsDeadline && findings.length === 0) {
    findings.push({
      id: deadlineId(),
      date: null,
      source: 'user',
      consequence: 'A deadline may limit the time to respond, but the exact date is not known.',
      confidence: 0.4,
      type: 'User-mentioned deadline',
      calculationMethod: 'user_stated',
      assumptions: ['The user mentioned a deadline but did not provide a specific date.'],
      requiresConfirmation: true,
    });
  }

  return findings;
}

// ─── Issue Detection ────────────────────────────────────────────────────────

function detectIssues(
  input: ReasonerInput,
  narrativeSignals: NarrativeSignal[],
  contradictions: ContradictionResult[],
  deadlineFindings: DeadlineFinding[],
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const { case: caseData, documentUnderstandings, narrative, userIsUnsure } = input;

  // ── Issues from document understandings ──
  for (const du of documentUnderstandings) {
    const issueType: IssueType = du.noticeType === 'RFE' ? 'rfe'
      : du.noticeType === 'NOID' ? 'noid'
      : du.noticeType === 'decision' ? 'denial'
      : du.noticeType === 'receipt' ? 'status_problem'
      : du.noticeType === 'biometrics' ? 'appointment'
      : du.noticeType === 'interview' ? 'appointment'
      : 'unknown';

    if (issueType !== 'unknown' || du.warnings.length > 0) {
      const confidence = du.warnings.length === 0 ? 0.85 : 0.65;
      const supportingFacts: FactReference[] = [];
      if (du.agency !== 'UNKNOWN') {
        supportingFacts.push(factRefFromSource('agency', du.agency, { documentId: '', confidence: 0.9 }, 'KNOWN'));
      }
      if (du.noticeType !== 'unknown') {
        supportingFacts.push(factRefFromSource('notice_type', du.noticeType, { documentId: '', confidence: 0.85 }, 'KNOWN'));
      }

      issues.push({
        id: issueId(),
        issueType,
        description: describeIssue(issueType, du),
        descriptionEs: describeIssueEs(issueType, du),
        confidence,
        knowledgeState: confidence >= 0.85 ? 'KNOWN' : 'SUPPORTED',
        supportingFacts,
        contradictingFacts: [],
        controllingFacts: supportingFacts.slice(0, 1),
        authorityRequirements: [],
      });
    }
  }

  // ── Issues from narrative signals (only if not already covered by documents) ──
  const documentIssueTypes = new Set(issues.map(i => i.issueType));
  for (const signal of narrativeSignals) {
    if (documentIssueTypes.has(signal.issueType)) continue;

    const confidence = signal.confidence * (narrative.length > 20 ? 1 : 0.7);
    issues.push({
      id: issueId(),
      issueType: signal.issueType,
      description: describeNarrativeIssue(signal.issueType),
      descriptionEs: describeNarrativeIssueEs(signal.issueType),
      confidence,
      knowledgeState: 'SUPPORTED',
      supportingFacts: [factRefFromSource('narrative', narrative.slice(0, 200), { documentId: 'narrative', confidence: signal.confidence }, 'SUPPORTED')],
      contradictingFacts: [],
      controllingFacts: [],
      authorityRequirements: [],
    });
  }

  // ── Deadline issues ──
  for (const dl of deadlineFindings) {
    issues.push({
      id: issueId(),
      issueType: 'deadline',
      description: dl.date
        ? `A deadline was identified: ${dl.type} on ${dl.date}.`
        : `A deadline was mentioned: ${dl.type}. The exact date needs to be confirmed.`,
      descriptionEs: dl.date
        ? `Se identificó una fecha límite: ${dl.type} el ${dl.date}.`
        : `Se mencionó una fecha límite: ${dl.type}. La fecha exacta necesita ser confirmada.`,
      confidence: dl.confidence,
      knowledgeState: dl.confidence >= 0.85 ? 'KNOWN' : dl.requiresConfirmation ? 'REQUIRES_REVIEW' : 'SUPPORTED',
      supportingFacts: dl.sourceDocument
        ? [factRefFromSource('deadline', dl.date ?? 'unknown', { documentId: dl.sourceDocument, confidence: dl.confidence }, 'SUPPORTED')]
        : [factRefFromSource('deadline', dl.date ?? 'unknown', { documentId: 'narrative', confidence: dl.confidence }, 'SUPPORTED')],
      contradictingFacts: [],
      controllingFacts: [],
      authorityRequirements: [],
    });
  }

  // ── Contradiction issues ──
  for (const c of contradictions) {
    issues.push({
      id: issueId(),
      issueType: 'contradiction',
      description: `There is a conflict between what you described and what the document shows regarding: ${c.factKey}.`,
      descriptionEs: `Hay un conflicto entre lo que usted describió y lo que muestra el documento respecto a: ${c.factKey}.`,
      confidence: 0.8,
      knowledgeState: 'CONTRADICTORY',
      supportingFacts: [factRefFromSource(c.factKey, c.documentValue, { documentId: '', confidence: 0.85 }, 'KNOWN')],
      contradictingFacts: [factRefFromSource(c.factKey, c.narrativeSignal, { documentId: 'narrative', confidence: 0.7 }, 'SUPPORTED')],
      controllingFacts: [],
      authorityRequirements: [],
    });
  }

  // ── Vague / insufficient information ──
  if (userIsUnsure || (narrative.trim().length < 15 && documentUnderstandings.length === 0)) {
    issues.push({
      id: issueId(),
      issueType: 'unknown',
      description: 'Not enough information has been provided to identify a specific immigration issue. Please tell us more about what happened or upload your document.',
      descriptionEs: 'No hay suficiente información para identificar un problema de inmigración específico. Por favor cuéntenos más sobre lo que pasó o suba su documento.',
      confidence: 0.9,
      knowledgeState: 'UNKNOWN',
      supportingFacts: [],
      contradictingFacts: [],
      controllingFacts: [],
      authorityRequirements: [],
    });
  }

  // ── Language barrier issue ──
  if (input.language.document !== input.language.assistant && documentUnderstandings.length > 0) {
    issues.push({
      id: issueId(),
      issueType: 'language_barrier',
      description: 'Your document appears to be in a different language than the one you are using. We will explain everything in your language.',
      descriptionEs: 'Su documento parece estar en un idioma diferente al que usted está usando. Le explicaremos todo en su idioma.',
      confidence: 0.85,
      knowledgeState: 'KNOWN',
      supportingFacts: [factRefFromSource('document_language', input.language.document, { documentId: '', confidence: 0.9 }, 'KNOWN')],
      contradictingFacts: [],
      controllingFacts: [],
      authorityRequirements: [],
    });
  }

  return issues;
}

// ─── Issue Descriptions ──────────────────────────────────────────────────────

function describeIssue(type: IssueType, du: DocumentUnderstanding): string {
  switch (type) {
    case 'rfe':
      return `Your document appears to be a Request for Evidence (RFE) from ${du.agency}. This means ${du.agency} is asking for additional evidence to process your case.`;
    case 'noid':
      return `Your document appears to be a Notice of Intent to Deny (NOID) from ${du.agency}. This means ${du.agency} is planning to deny your application and is giving you an opportunity to respond.`;
    case 'denial':
      return `Your document appears to be a decision from ${du.agency}. This may be a denial of your application.`;
    case 'appointment':
      return `Your document appears to be an appointment notice from ${du.agency}. You may need to attend this appointment.`;
    case 'status_problem':
      return `Your document appears to be a receipt or status notice from ${du.agency}.`;
    default:
      return `Your document from ${du.agency} requires review to determine what it means.`;
  }
}

function describeIssueEs(type: IssueType, du: DocumentUnderstanding): string {
  switch (type) {
    case 'rfe':
      return `Su documento parece ser una Solicitud de Evidencia (RFE) de ${du.agency}. Esto significa que ${du.agency} está pidiendo evidencia adicional para procesar su caso.`;
    case 'noid':
      return `Su documento parece ser un Aviso de Intención de Negación (NOID) de ${du.agency}. Esto significa que ${du.agency} planea negar su solicitud y le está dando la oportunidad de responder.`;
    case 'denial':
      return `Su documento parece ser una decisión de ${du.agency}. Puede ser una negación de su solicitud.`;
    case 'appointment':
      return `Su documento parece ser un aviso de cita de ${du.agency}. Es posible que necesite asistir a esta cita.`;
    case 'status_problem':
      return `Su documento parece ser un recibo o aviso de estado de ${du.agency}.`;
    default:
      return `Su documento de ${du.agency} requiere revisión para determinar qué significa.`;
  }
}

function describeNarrativeIssue(type: IssueType): string {
  const map: Record<string, string> = {
    denial: 'You mentioned that something was denied. We need to review the denial to determine what options are available.',
    rfe: 'You mentioned a request for evidence. We need to identify what evidence is being requested.',
    noid: 'You mentioned a notice of intent to deny. This is time-sensitive and requires careful review.',
    rejection: 'You mentioned a rejection. We need to determine whether this is a rejection (returning the filing) or a denial.',
    deadline: 'You mentioned a deadline. We need to confirm the exact date and what it requires.',
    missing_evidence: 'You mentioned missing documents or evidence. We need to identify what is missing and how to obtain it.',
    duplicate_submission: 'You mentioned that you may have already submitted something before. We need to determine whether duplicate submissions could cause a problem.',
    status_problem: 'You mentioned a status problem. We need to understand your current immigration status situation.',
    language_barrier: 'You mentioned difficulty understanding a document. We can help explain it in your language.',
    appointment: 'You mentioned an appointment. We need to confirm the date and what you need to bring.',
    fee_issue: 'You mentioned a fee issue. We need to determine the correct fee and payment options.',
    address_problem: 'You mentioned an address problem. We need to ensure USCIS has your correct address.',
    procedural_posture: 'You asked about your options. We need to review your documents to understand what procedural options are available.',
  };
  return map[type] ?? 'An issue was identified that requires further information.';
}

function describeNarrativeIssueEs(type: IssueType): string {
  const map: Record<string, string> = {
    denial: 'Mencionó que algo fue negado. Necesitamos revisar la negación para determinar qué opciones están disponibles.',
    rfe: 'Mencionó una solicitud de evidencia. Necesitamos identificar qué evidencia se está solicitando.',
    noid: 'Mencionó un aviso de intención de negación. Esto es sensible al tiempo y requiere revisión cuidadosa.',
    rejection: 'Mencionó un rechazo. Necesitamos determinar si esto es un rechazo (devolución de la solicitud) o una negación.',
    deadline: 'Mencionó una fecha límite. Necesitamos confirmar la fecha exacta y qué requiere.',
    missing_evidence: 'Mencionó documentos o evidencia faltante. Necesitamos identificar qué falta y cómo obtenerlo.',
    duplicate_submission: 'Mencionó que puede haber enviado algo antes. Necesitamos determinar si las presentaciones duplicadas podrían causar un problema.',
    status_problem: 'Mencionó un problema de estatus. Necesitamos entender su situación de estatus migratorio actual.',
    language_barrier: 'Mencionó dificultad para entender un documento. Podemos ayudar a explicarlo en su idioma.',
    appointment: 'Mencionó una cita. Necesitamos confirmar la fecha y qué necesita traer.',
    fee_issue: 'Mencionó un problema con la tarifa. Necesitamos determinar la tarifa correcta y las opciones de pago.',
    address_problem: 'Mencionó un problema de dirección. Necesitamos asegurar que USCIS tenga su dirección correcta.',
    procedural_posture: 'Preguntó sobre sus opciones. Necesitamos revisar sus documentos para entender qué opciones procedimentales están disponibles.',
  };
  return map[type] ?? 'Se identificó un problema que requiere más información.';
}

// ─── Missing Fact Engine ──────────────────────────────────────────────────────

function buildMissingFacts(
  input: ReasonerInput,
  issues: DetectedIssue[],
  deadlineFindings: DeadlineFinding[],
): MissingFact[] {
  const missing: MissingFact[] = [];
  const { case: caseData, documentUnderstandings, narrative, userIsUnsure } = input;
  const lower = narrative.toLowerCase();

  // ── Notice date (needed for deadline calculation) ──
  const hasNoticeDate = caseData.facts.some(f => f.key === 'notice_date') ||
    documentUnderstandings.some(du => du.deadlines.some(d => d.date));

  if (!hasNoticeDate && deadlineFindings.length > 0) {
    missing.push({
      id: factId(),
      fact: 'The date on your notice',
      whyItMatters: 'The notice date is needed to confirm or calculate any response deadline.',
      materiality: 'BLOCKING',
      howToObtain: 'Upload the notice or tell us the date shown on the document.',
      relatedIssue: 'deadline',
    });
  }

  // ── Receipt number ──
  const hasReceipt = caseData.facts.some(f => f.key === 'receipt_number');
  if (!hasReceipt && documentUnderstandings.length > 0) {
    missing.push({
      id: factId(),
      fact: 'Your receipt number (usually starts with 3 letters followed by numbers)',
      whyItMatters: 'The receipt number helps identify your case and track its status.',
      materiality: 'HELPFUL',
      howToObtain: 'Look for a 13-character code near the top of your USCIS notice.',
    });
  }

  // ── Previous submissions (duplicate check) ──
  if (/already sent|submitted before|previously|already filed/i.test(lower)) {
    missing.push({
      id: factId(),
      fact: 'What you previously submitted and when',
      whyItMatters: 'If you already sent evidence, we need to know what was sent to avoid duplicate submissions and to determine if it was received.',
      materiality: 'MATERIAL',
      howToObtain: 'Check your records for confirmation of previous submissions, including dates and what was included.',
      relatedIssue: 'duplicate_submission',
    });
  }

  // ── Procedural posture when denial mentioned ──
  if (issues.some(i => i.issueType === 'denial')) {
    if (!/appeal|motion|reconsider|reopen/i.test(lower)) {
      missing.push({
        id: factId(),
        fact: 'Whether you want to appeal, file a motion, or take another action',
        whyItMatters: 'Different procedural responses have different deadlines and requirements. We need to know what action you want to take.',
        materiality: 'MATERIAL',
        howToObtain: 'Tell us whether you want to appeal the decision, ask for reconsideration, or take a different action.',
        relatedIssue: 'procedural_posture',
      });
    }
  }

  // ── Missing evidence ──
  if (issues.some(i => i.issueType === 'rfe' || i.issueType === 'noid')) {
    missing.push({
      id: factId(),
      fact: 'The specific evidence being requested',
      whyItMatters: 'We need to know exactly what evidence is requested to help you prepare a complete response.',
      materiality: 'MATERIAL',
      howToObtain: 'Upload the full notice or tell us what items it lists as required.',
      relatedIssue: 'rfe',
    });
  }

  // ── Address verification ──
  if (issues.some(i => i.issueType === 'address_problem')) {
    missing.push({
      id: factId(),
      fact: 'Your current mailing address',
      whyItMatters: 'USCIS needs your correct address to send you important notices.',
      materiality: 'MATERIAL',
      howToObtain: 'Provide your current address and we can help you update it with USCIS.',
      relatedIssue: 'address_problem',
    });
  }

  // ── The document itself if user mentions a letter but none is uploaded ──
  if (/letter|notice|carta|documento/i.test(lower) && documentUnderstandings.length === 0 && !userIsUnsure) {
    missing.push({
      id: factId(),
      fact: 'The letter or notice you received',
      whyItMatters: 'We need to see the document to identify what it says, what it requires, and any deadlines.',
      materiality: 'MATERIAL',
      howToObtain: 'Upload or photograph the document, or tell us the key details shown on it.',
    });
  }

  return missing;
}

// ─── Evidence Gaps ─────────────────────────────────────────────────────────────

function buildEvidenceGaps(
  input: ReasonerInput,
  issues: DetectedIssue[],
): EvidenceGap[] {
  const gaps: EvidenceGap[] = [];
  const { documentUnderstandings, narrative } = input;
  const lower = narrative.toLowerCase();

  // If user mentions missing documents
  if (/missing|don't have|can't find|lost/i.test(lower)) {
    gaps.push({
      id: gapId(),
      description: 'Documents mentioned by the user that are not available',
      requiredFor: 'A complete response may require these documents as evidence.',
      howToObtain: 'Identify which documents are missing and whether they can be obtained, replaced, or explained.',
    });
  }

  // If RFE but no documents uploaded
  if (issues.some(i => i.issueType === 'rfe') && documentUnderstandings.length === 0) {
    gaps.push({
      id: gapId(),
      description: 'The RFE notice has not been uploaded',
      requiredFor: 'We need the notice to identify what evidence is being requested and any deadline.',
      howToObtain: 'Upload or photograph the RFE notice.',
    });
  }

  // If denial but no decision document
  if (issues.some(i => i.issueType === 'denial') && documentUnderstandings.length === 0) {
    gaps.push({
      id: gapId(),
      description: 'The denial decision has not been uploaded',
      requiredFor: 'We need the decision to identify the basis for denial and any appeal rights.',
      howToObtain: 'Upload or photograph the denial decision.',
    });
  }

  return gaps;
}

// ─── Workflow Selection ──────────────────────────────────────────────────────

function buildWorkflowCandidates(
  issues: DetectedIssue[],
  documentUnderstandings: DocumentUnderstanding[],
  narrative: string,
): { candidates: CandidateWorkflow[]; rejected: RejectedWorkflow[] } {
  const candidates: CandidateWorkflow[] = [];
  const rejected: RejectedWorkflow[] = [];
  const lower = narrative.toLowerCase();

  const hasRfeDoc = documentUnderstandings.some(du => du.noticeType === 'RFE') || issues.some(i => i.issueType === 'rfe');
  const hasNoidDoc = documentUnderstandings.some(du => du.noticeType === 'NOID') || issues.some(i => i.issueType === 'noid');
  const hasDenial = issues.some(i => i.issueType === 'denial');
  const hasAppointment = issues.some(i => i.issueType === 'appointment');
  const hasStatusProblem = issues.some(i => i.issueType === 'status_problem');
  const hasAddressProblem = issues.some(i => i.issueType === 'address_problem');

  // ── Respond to a Notice ──
  if (hasRfeDoc) {
    candidates.push({
      userFacingTitle: 'Respond to a Request for Evidence',
      fit: 'strong',
      evidence: issues.filter(i => i.issueType === 'rfe').flatMap(i => i.supportingFacts),
      limitations: [],
    });
  }

  // ── Respond to a NOID ──
  if (hasNoidDoc) {
    candidates.push({
      userFacingTitle: 'Respond to a Notice of Intent to Deny',
      fit: 'strong',
      evidence: issues.filter(i => i.issueType === 'noid').flatMap(i => i.supportingFacts),
      limitations: ['A NOID response should address the specific grounds for denial stated in the notice.'],
    });
  }

  // ── Explanation Letter ──
  if (!hasRfeDoc && !hasNoidDoc && !hasDenial && (hasStatusProblem || hasAddressProblem || narrative.trim().length > 0)) {
    candidates.push({
      userFacingTitle: 'Prepare a Letter Explaining Your Situation',
      fit: 'moderate',
      evidence: [],
      limitations: ['This helps organize your explanation but does not replace a required response to a formal notice.'],
    });
  }

  // ── Supporting Documents ──
  if (hasRfeDoc || hasNoidDoc) {
    candidates.push({
      userFacingTitle: 'Organize and Submit Supporting Documents',
      fit: 'moderate',
      evidence: [],
      limitations: ['The specific documents needed depend on what the notice requests.'],
    });
  }

  // ── Rejected: Appeal (if no denial) ──
  if (!hasDenial) {
    rejected.push({
      userFacingTitle: 'File an Appeal',
      reason: 'The document does not appear to be a final denial decision. Appeals require a final decision. If you have a denial decision, please upload it so we can verify.',
    });
  }

  // ── Rejected: RFE response (if it's actually a NOID) ──
  if (hasNoidDoc && !hasRfeDoc) {
    rejected.push({
      userFacingTitle: 'Respond to a Request for Evidence',
      reason: 'The document appears to be a Notice of Intent to Deny, not a Request for Evidence. These require different responses.',
    });
  }

  // ── If only appointment, reject response workflows ──
  if (hasAppointment && !hasRfeDoc && !hasNoidDoc && !hasDenial) {
    rejected.push({
      userFacingTitle: 'Respond to a Notice',
      reason: 'This appears to be an appointment notice, not a document that requires a written response. You may need to attend the appointment rather than mail a response.',
    });
  }

  return { candidates, rejected };
}

// ─── Risks ──────────────────────────────────────────────────────────────────────

function buildRisks(
  issues: DetectedIssue[],
  deadlineFindings: DeadlineFinding[],
  missingFacts: MissingFact[],
): RiskFinding[] {
  const risks: RiskFinding[] = [];

  // Deadline risk
  const urgentDeadlines = deadlineFindings.filter(d => d.requiresConfirmation || d.confidence < 0.8);
  for (const dl of urgentDeadlines) {
    risks.push({
      id: riskId(),
      description: `A deadline requires confirmation before any action is taken. Acting on an unconfirmed deadline could result in missing the actual deadline.`,
      severity: 'high',
      mitigation: 'Upload the source document or confirm the deadline date explicitly.',
    });
  }

  // Contradiction risk
  for (const issue of issues) {
    if (issue.knowledgeState === 'CONTRADICTORY') {
      risks.push({
        id: riskId(),
        description: `There is conflicting information about: ${issue.description}`,
        severity: 'high',
        mitigation: 'Review the source document and clarify the discrepancy before proceeding.',
      });
    }
  }

  // Blocking missing facts
  const blockingFacts = missingFacts.filter(f => f.materiality === 'BLOCKING');
  for (const f of blockingFacts) {
    risks.push({
      id: riskId(),
      description: `A critical piece of information is missing: ${f.fact}`,
      severity: 'high',
      mitigation: f.howToObtain,
    });
  }

  return risks;
}

// ─── Uncertainties ──────────────────────────────────────────────────────────────

function buildUncertainties(
  issues: DetectedIssue[],
  missingFacts: MissingFact[],
): UncertaintyFinding[] {
  const uncertainties: UncertaintyFinding[] = [];

  for (const issue of issues) {
    if (issue.knowledgeState === 'UNKNOWN') {
      uncertainties.push({
        id: uncertaintyId(),
        description: issue.description,
        resolution: 'Provide more information or upload relevant documents.',
        blocking: true,
      });
    }
    if (issue.knowledgeState === 'REQUIRES_REVIEW') {
      uncertainties.push({
        id: uncertaintyId(),
        description: `Confirmation needed: ${issue.description}`,
        resolution: 'Upload the source document or confirm the information explicitly.',
        blocking: issue.issueType === 'deadline',
      });
    }
    if (issue.knowledgeState === 'CONTRADICTORY') {
      uncertainties.push({
        id: uncertaintyId(),
        description: `Conflicting information: ${issue.description}`,
        resolution: 'Review the source document and clarify which information is correct.',
        blocking: true,
      });
    }
  }

  for (const f of missingFacts) {
    if (f.materiality === 'BLOCKING' || f.materiality === 'MATERIAL') {
      uncertainties.push({
        id: uncertaintyId(),
        description: `Missing: ${f.fact}`,
        resolution: f.howToObtain,
        blocking: f.materiality === 'BLOCKING',
      });
    }
  }

  return uncertainties;
}

// ─── Authority Findings ──────────────────────────────────────────────────────────
// Conservative: does not invent authority. Only records what is referenced in documents.

function buildAuthorityFindings(
  documentUnderstandings: DocumentUnderstanding[],
): AuthorityFinding[] {
  const findings: AuthorityFinding[] = [];

  for (const du of documentUnderstandings) {
    if (du.agency !== 'UNKNOWN') {
      findings.push({
        id: authorityId(),
        citation: `${du.agency} document — ${du.noticeType}`,
        authorityType: 'agency_guidance',
        applicability: 'direct',
        confidence: du.warnings.length === 0 ? 0.8 : 0.5,
        freshness: 'unknown', // Freshness is G4 — we do not claim current authority now.
      });
    }
  }

  return findings;
}

// ─── Recommended Next Step ──────────────────────────────────────────────────────

function buildRecommendedNextStep(
  issues: DetectedIssue[],
  missingFacts: MissingFact[],
  candidates: CandidateWorkflow[],
  language: LanguageContext,
): RecommendedNextStep {
  const blockingFacts = missingFacts.filter(f => f.materiality === 'BLOCKING' || f.materiality === 'MATERIAL');
  const unknownIssues = issues.filter(i => i.knowledgeState === 'UNKNOWN');
  const contradictoryIssues = issues.filter(i => i.knowledgeState === 'CONTRADICTORY');

  if (unknownIssues.length > 0) {
    return {
      action: 'Tell us more about what happened',
      explanation: 'We need more information before we can identify what immigration issue you may be facing. Please describe what happened or upload your document.',
      requiresInformation: unknownIssues.map(i => i.description),
    };
  }

  if (contradictoryIssues.length > 0) {
    return {
      action: 'Resolve the conflicting information',
      explanation: 'There is conflicting information that needs to be resolved before we can proceed. Please review the document and clarify the discrepancy.',
      requiresInformation: contradictoryIssues.map(i => i.description),
    };
  }

  if (blockingFacts.length > 0) {
    return {
      action: 'Provide the missing information',
      explanation: `We need ${blockingFacts.length} piece(s) of information before we can proceed safely.`,
      requiresInformation: blockingFacts.map(f => f.fact),
    };
  }

  if (candidates.length > 0) {
    const titles = candidates.map(c => c.userFacingTitle).join(', ');
    return {
      action: `Review the suggested action: ${candidates[0].userFacingTitle}`,
      explanation: `Based on what you told us and your documents, we identified ${candidates.length} possible next step(s): ${titles}. Review these and let us know how you'd like to proceed.`,
      requiresInformation: [],
    };
  }

  return {
    action: 'Tell us what happened or upload your document',
    explanation: 'We need more information to help you. Tell us what happened or upload any immigration document you received.',
    requiresInformation: [],
  };
}

// ─── User-Facing Summary ───────────────────────────────────────────────────────

function buildSummary(
  issues: DetectedIssue[],
  candidates: CandidateWorkflow[],
  language: LanguageContext,
): { en: string; es?: string } {
  const issueCount = issues.filter(i => i.issueType !== 'unknown').length;

  if (issueCount === 0 && issues.some(i => i.issueType === 'unknown')) {
    return {
      en: 'I need a bit more information to help you. Tell me what happened or upload your document.',
      es: 'Necesito un poco más de información para ayudarle. Cuéntenos qué pasó o suba su documento.',
    };
  }

  const enParts: string[] = [];
  enParts.push(`I found ${issueCount} ${issueCount === 1 ? 'thing' : 'things'} that may matter.`);

  const topIssues = issues.filter(i => i.issueType !== 'unknown' && i.issueType !== 'contradiction' && i.issueType !== 'language_barrier').slice(0, 5);
  for (const issue of topIssues) {
    enParts.push(`${issue.description}`);
  }

  const contradictions = issues.filter(i => i.issueType === 'contradiction');
  for (const c of contradictions) {
    enParts.push(c.description);
  }

  if (candidates.length > 0) {
    enParts.push(`Based on this, I can help with: ${candidates.map(c => c.userFacingTitle).join(' or ')}.`);
  }

  if (language.assistant === 'es') {
    const esParts: string[] = [];
    esParts.push(`Encontré ${issueCount} ${issueCount === 1 ? 'cosa' : 'cosas'} que pueden ser importantes.`);

    const topIssuesEs = issues.filter(i => i.issueType !== 'unknown' && i.issueType !== 'contradiction' && i.issueType !== 'language_barrier').slice(0, 5);
    for (const issue of topIssuesEs) {
      esParts.push(issue.descriptionEs ?? issue.description);
    }

    const contradictionsEs = issues.filter(i => i.issueType === 'contradiction');
    for (const c of contradictionsEs) {
      esParts.push(c.descriptionEs ?? c.description);
    }

    if (candidates.length > 0) {
      esParts.push(`Basado en esto, puedo ayudar con: ${candidates.map(c => c.userFacingTitle).join(' o ')}.`);
    }

    return { en: enParts.join(' '), es: esParts.join(' ') };
  }

  return { en: enParts.join(' ') };
}

// ─── Main Reasoner Entry Point ─────────────────────────────────────────────────

export function reasonAboutCase(input: ReasonerInput): CaseReasoning {
  resetCounters();

  const { case: caseData, documentUnderstandings, narrative, language, userIsUnsure } = input;

  // 1. Analyze narrative for issue signals
  const narrativeSignals = analyzeNarrative(narrative);

  // 2. Detect contradictions between narrative and documents
  const contradictions = detectContradictions(caseData.facts, documentUnderstandings, narrative);

  // 3. Build deadline findings
  const deadlineFindings = buildDeadlineFindings(caseData.deadlines, documentUnderstandings, narrative);

  // 4. Detect issues
  const issues = detectIssues(input, narrativeSignals, contradictions, deadlineFindings);

  // 5. Build missing facts
  const missingFacts = buildMissingFacts(input, issues, deadlineFindings);

  // 6. Build evidence gaps
  const evidenceGaps = buildEvidenceGaps(input, issues);

  // 7. Build workflow candidates and rejections
  const { candidates, rejected } = buildWorkflowCandidates(issues, documentUnderstandings, narrative);

  // 8. Build risks
  const risks = buildRisks(issues, deadlineFindings, missingFacts);

  // 9. Build uncertainties
  const uncertainties = buildUncertainties(issues, missingFacts);

  // 10. Build authority findings (conservative — G4 will expand this)
  const authorityFindings = buildAuthorityFindings(documentUnderstandings);

  // 11. Build recommended next step
  const recommendedNextStep = buildRecommendedNextStep(issues, missingFacts, candidates, language);

  // 12. Build user-facing summary
  const summary = buildSummary(issues, candidates, language);

  // 13. Determine if safe to act upon
  const hasBlockingUncertainties = uncertainties.some(u => u.blocking);
  const hasContradictory = issues.some(i => i.knowledgeState === 'CONTRADICTORY');
  const hasUnknown = issues.some(i => i.knowledgeState === 'UNKNOWN');
  const safeToActUpon = !hasBlockingUncertainties && !hasContradictory && !hasUnknown;

  return {
    detectedIssues: issues,
    deadlines: deadlineFindings,
    missingFacts,
    evidenceGaps,
    candidateWorkflows: candidates,
    incompatibleWorkflows: rejected,
    risks,
    uncertainties,
    authorityFindings,
    recommendedNextStep,
    language,
    userFacingSummary: summary.en,
    userFacingSummaryEs: summary.es,
    safeToActUpon,
  };
}
