/**
 * NOID Domain Model — Notice of Intent to Deny
 *
 * A NOID is more serious than an RFE:
 * - RFE = "we need more evidence" (opportunity to strengthen)
 * - NOID = "we intend to deny" (must overcome the denial ground)
 *
 * NOID-specific capabilities:
 * - Denial ground extraction
 * - Issue decomposition (what specifically must be rebutted)
 * - Procedural analysis (was the NOID properly issued?)
 * - Higher-risk escalation (should recommend attorney)
 * - NOID-specific evidence reasoning
 * - Rebuttal strategy (not just supplement)
 * - NOID-specific drafting
 */

// ─── NOID Form Types ──────────────────────────────────────────────────────────

export type NOIDFormType =
  | 'I-485'
  | 'I-130'
  | 'I-140'
  | 'I-751'
  | 'N-400'
  | 'I-601'
  | 'I-290B'
  | 'generic';

// ─── Denial Ground Classification ─────────────────────────────────────────────

export type DenialGroundCategory =
  | 'eligibility'           // applicant doesn't meet a basic eligibility requirement
  | 'inadmissibility'       // found inadmissible under a specific ground
  | 'insufficient_evidence' // evidence submitted was not sufficient
  | 'procedural'            // procedural issue (untimely filing, etc.)
  | 'discretionary'         // adverse exercise of discretion
  | 'statutory_bar'         // statutory bar to relief
  | 'fraud_misrepresentation' // fraud or willful misrepresentation
  | 'public_charge'         // likely to become a public charge
  | 'unauthorized_employment' // worked without authorization
  | 'unlawful_presence'    // accrued unlawful presence
  | 'criminal_ground'      // criminal inadmissibility
  | 'other';

export interface DenialGround {
  id: string;
  category: DenialGroundCategory;
  description: string;
  statutoryBasis?: string;     // e.g., "INA § 212(a)(6)(C)(i)"
  uscisFinding: string;        // what USCIS specifically found
  rebuttable: boolean;         // can this ground be rebutted?
  evidenceRequired: string;    // what evidence is needed to rebut
  legalArgumentRequired: boolean; // does rebutting require legal argument?
  severity: 'low' | 'moderate' | 'high' | 'critical';
  recommendation: 'self_respond' | 'attorney_recommended' | 'attorney_required';
}

// ─── NOID Analysis ────────────────────────────────────────────────────────────

export interface NOIDAnalysis {
  formType: NOIDFormType;
  receiptNumber?: string;
  denialGrounds: DenialGround[];
  proceduralIssues: ProceduralIssue[];
  deadline: string | undefined;
  deadlineDays: number | undefined;
  hasAttorneyRecommendation: boolean;
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  summaryEn: string;
  summaryEs?: string;
  recommendedActions: string[];
}

export interface ProceduralIssue {
  type: 'improper_notice' | 'missing_required_language' | 'wrong_form_type' | 'untimely_noid' | 'missing_finding' | 'other';
  description: string;
  impact: 'procedural_defect' | 'substantive_defect' | 'minor_irregularity';
  potential_challenge: boolean;
}

// ─── Denial Ground Detection ─────────────────────────────────────────────────

const GROUND_PATTERNS: { category: DenialGroundCategory; patterns: RegExp[]; statutoryBasis?: string; severity: DenialGround['severity'] }[] = [
  { category: 'fraud_misrepresentation', patterns: [/fraud/i, /willful misrepresentation/i, /material misrepresentation/i], statutoryBasis: 'INA § 212(a)(6)(C)(i)', severity: 'critical' },
  { category: 'public_charge', patterns: [/public charge/i, /likely to become a public charge/i], statutoryBasis: 'INA § 212(a)(4)', severity: 'moderate' },
  { category: 'unauthorized_employment', patterns: [/unauthorized employment/i, /worked without authorization/i, /unauthorized work/i], statutoryBasis: 'INA § 245(c)(2)', severity: 'high' },
  { category: 'unlawful_presence', patterns: [/unlawful presence/i, /overstay/i], statutoryBasis: 'INA § 212(a)(9)(B)', severity: 'high' },
  { category: 'criminal_ground', patterns: [/criminal/i, /conviction/i, /moral turpitude/i, /controlled substance/i], statutoryBasis: 'INA § 212(a)(2)', severity: 'critical' },
  { category: 'inadmissibility', patterns: [/inadmissible/i, /inadmissibility/i], severity: 'high' },
  { category: 'discretionary', patterns: [/discretion/i, /unfavorable exercise/i, /denied .* discretion/i], severity: 'moderate' },
  { category: 'statutory_bar', patterns: [/statutory bar/i, /permanent bar/i, /barred from/i], statutoryBasis: 'INA § 212(a)(9)(C)', severity: 'critical' },
  { category: 'insufficient_evidence', patterns: [/insufficient evidence/i, /evidence .* insufficient/i, /not sufficient/i, /inadequate evidence/i], severity: 'low' },
  { category: 'eligibility', patterns: [/not eligible/i, /does not qualify/i, /fails to meet/i, /not met .* requirement/i], severity: 'moderate' },
  { category: 'procedural', patterns: [/untimely/i, /late filing/i, /improperly filed/i], severity: 'moderate' },
];

export function detectDenialGrounds(text: string): DenialGround[] {
  const grounds: DenialGround[] = [];
  let id = 0;

  for (const { category, patterns, statutoryBasis, severity } of GROUND_PATTERNS) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // Extract surrounding context (±200 chars)
        const idx = match.index ?? 0;
        const start = Math.max(0, idx - 200);
        const end = Math.min(text.length, idx + match[0].length + 200);
        const context = text.slice(start, end).trim();

        const isRebuttable = category !== 'statutory_bar' || !text.match(/permanent/i);
        const requiresLegalArg = ['fraud_misrepresentation', 'criminal_ground', 'discretionary', 'statutory_bar', 'inadmissibility'].includes(category);
        const recommendation: DenialGround['recommendation'] =
          severity === 'critical' ? 'attorney_required' :
          severity === 'high' ? 'attorney_recommended' :
          'self_respond';

        grounds.push({
          id: `ground-${++id}`,
          category,
          description: match[0],
          statutoryBasis,
          uscisFinding: context.slice(0, 500),
          rebuttable: isRebuttable,
          evidenceRequired: determineEvidenceRequired(category),
          legalArgumentRequired: requiresLegalArg,
          severity,
          recommendation,
        });
        break; // one match per category
      }
    }
  }

  return grounds;
}

function determineEvidenceRequired(category: DenialGroundCategory): string {
  switch (category) {
    case 'fraud_misrepresentation': return 'Evidence of truthfulness, original documents, witness statements, affidavits';
    case 'public_charge': return 'Updated Affidavit of Support (I-864), proof of income, assets, employment';
    case 'unauthorized_employment': return 'Proof of work authorization, employment records, I-765 approval';
    case 'unlawful_presence': return 'Proof of lawful status, departure records, waiver evidence (I-601)';
    case 'criminal_ground': return 'Certified court dispositions, police records, rehabilitation evidence, waiver application';
    case 'inadmissibility': return 'Evidence addressing the specific inadmissibility ground, waiver if available';
    case 'insufficient_evidence': return 'Additional evidence addressing the specific deficiency';
    case 'eligibility': return 'Evidence of meeting the specific eligibility requirement';
    case 'procedural': return 'Proof of timely filing, proper fee payment, correct form';
    case 'discretionary': return 'Positive factors, evidence of rehabilitation, community ties, hardship';
    case 'statutory_bar': return 'Waiver application (if available), proof that bar does not apply';
    default: return 'Evidence addressing the specific denial ground';
  }
}

// ─── Procedural Analysis ─────────────────────────────────────────────────────

export function analyzeProceduralIssues(text: string): ProceduralIssue[] {
  const issues: ProceduralIssue[] = [];

  // Check for required NOID language
  if (!/notice of intent to deny/i.test(text) && !/intend to deny/i.test(text)) {
    issues.push({
      type: 'missing_required_language',
      description: 'The notice does not contain standard "Notice of Intent to Deny" or "intend to deny" language.',
      impact: 'substantive_defect',
      potential_challenge: true,
    });
  }

  // Check for deadline
  if (!/deadline|respond|within \d+ days|no later than/i.test(text)) {
    issues.push({
      type: 'missing_finding',
      description: 'No response deadline is specified in the notice.',
      impact: 'procedural_defect',
      potential_challenge: true,
    });
  }

  // Check for specific findings
  if (!/specifically|finds that|determined that|based on/i.test(text)) {
    issues.push({
      type: 'missing_finding',
      description: 'The notice does not clearly state the specific findings supporting the denial.',
      impact: 'substantive_defect',
      potential_challenge: true,
    });
  }

  return issues;
}

// ─── Risk Assessment ──────────────────────────────────────────────────────────

export function assessOverallRisk(grounds: DenialGround[]): DenialGround['severity'] {
  if (grounds.length === 0) return 'low';
  if (grounds.some(g => g.severity === 'critical')) return 'critical';
  if (grounds.some(g => g.severity === 'high')) return 'high';
  if (grounds.some(g => g.severity === 'moderate')) return 'moderate';
  return 'low';
}

export function shouldRecommendAttorney(grounds: DenialGround[], risk: DenialGround['severity']): boolean {
  if (risk === 'critical' || risk === 'high') return true;
  if (grounds.some(g => g.recommendation === 'attorney_required' || g.recommendation === 'attorney_recommended')) return true;
  if (grounds.some(g => g.legalArgumentRequired)) return true;
  return false;
}

// ─── Form Type Detection ─────────────────────────────────────────────────────

export function detectNOIDFormType(text: string): NOIDFormType {
  const patterns: Record<string, RegExp[]> = {
    'I-485': [/\bI-?485\b/i, /\badjustment of status\b/i, /\bpermanent residence\b/i],
    'I-130': [/\bI-?130\b/i, /\bfamily petition\b/i, /\brelative petition\b/i],
    'I-140': [/\bI-?140\b/i, /\bemployment petition\b/i, /\balien worker\b/i],
    'I-751': [/\bI-?751\b/i, /\bremoval of conditions\b/i, /\bconditional resident\b/i],
    'N-400': [/\bN-?400\b/i, /\bnaturalization\b/i, /\bcitizenship application\b/i],
    'I-601': [/\bI-?601\b/i, /\bwaiver of inadmissibility\b/i],
    'I-290B': [/\bI-?290B\b/i, /\bmotion to reopen\b/i, /\bmotion to reconsider\b/i, /\bappeal\b/i],
  };

  for (const [formType, pats] of Object.entries(patterns)) {
    for (const pat of pats) {
      if (pat.test(text)) return formType as NOIDFormType;
    }
  }
  return 'generic';
}

// ─── Full NOID Analysis ────────────────────────────────────────────────────────

export function analyzeNOID(text: string): NOIDAnalysis {
  const formType = detectNOIDFormType(text);
  const grounds = detectDenialGrounds(text);
  const proceduralIssues = analyzeProceduralIssues(text);
  const overallRisk = assessOverallRisk(grounds);
  const hasAttorneyRec = shouldRecommendAttorney(grounds, overallRisk);

  // Extract receipt number
  const receiptMatch = text.match(/\b([A-Z]{3}\d{10})\b/);
  const receiptNumber = receiptMatch ? receiptMatch[1] : undefined;

  // Extract deadline
  const deadlineMatch = text.match(/no later than\s+([A-Z][a-z]+ \d{1,2},?\s*\d{4})/i) ??
    text.match(/within\s+(\d+)\s+days/i);
  let deadline: string | undefined;
  let deadlineDays: number | undefined;
  if (deadlineMatch) {
    if (deadlineMatch[1].match(/^\d+$/)) {
      deadlineDays = parseInt(deadlineMatch[1]);
    } else {
      deadline = deadlineMatch[1];
    }
  }

  const recommendedActions: string[] = [];
  if (hasAttorneyRec) recommendedActions.push('Consult an immigration attorney — this NOID involves complex legal issues.');
  recommendedActions.push('Read every denial ground carefully.');
  recommendedActions.push('Gather evidence addressing each ground.');
  if (grounds.some(g => g.legalArgumentRequired)) recommendedActions.push('Prepare legal arguments for each rebuttable ground.');
  recommendedActions.push('Respond before the deadline — missing it will result in denial.');

  const summaryEn = `This is a Notice of Intent to Deny for ${formType === 'generic' ? 'an immigration application' : `Form ${formType}`}. ` +
    (grounds.length > 0 ? `USCIS identified ${grounds.length} denial ground(s): ${grounds.map(g => g.category.replace(/_/g, ' ')).join(', ')}. ` : '') +
    `Overall risk: ${overallRisk}. ` +
    (hasAttorneyRec ? 'An attorney is strongly recommended.' : 'You may be able to respond on your own.') +
    ` ${proceduralIssues.length > 0 ? `${proceduralIssues.length} procedural issue(s) detected.` : ''}`;

  const summaryEs = `Este es un Aviso de Intención de Denegar para ${formType === 'generic' ? 'una solicitud de inmigración' : `el Formulario ${formType}`}. ` +
    (grounds.length > 0 ? `USCIS identificó ${grounds.length} motivo(s) de denegación. ` : '') +
    `Riesgo general: ${overallRisk === 'low' ? 'bajo' : overallRisk === 'moderate' ? 'moderado' : overallRisk === 'high' ? 'alto' : 'crítico'}. ` +
    (hasAttorneyRec ? 'Se recomienda encarecidamente un abogado.' : 'Puede responder por su cuenta.');

  return {
    formType,
    receiptNumber,
    denialGrounds: grounds,
    proceduralIssues,
    deadline,
    deadlineDays,
    hasAttorneyRecommendation: hasAttorneyRec,
    overallRisk,
    summaryEn,
    summaryEs,
    recommendedActions,
  };
}

// ─── NOID-Specific Evidence Reasoning ──────────────────────────────────────────

export interface NOIDEvidenceRequirement {
  groundId: string;
  groundCategory: DenialGroundCategory;
  description: string;
  evidenceTypes: string[];
  sufficiency: 'sufficient' | 'insufficient' | 'unknown';
  gapDescription?: string;
}

export function buildEvidenceRequirements(grounds: DenialGround[]): NOIDEvidenceRequirement[] {
  return grounds.map(g => ({
    groundId: g.id,
    groundCategory: g.category,
    description: g.evidenceRequired,
    evidenceTypes: getEvidenceTypesForGround(g.category),
    sufficiency: 'unknown' as const,
  }));
}

function getEvidenceTypesForGround(category: DenialGroundCategory): string[] {
  switch (category) {
    case 'fraud_misrepresentation': return ['affidavits', 'original documents', 'witness statements', 'marriage evidence'];
    case 'public_charge': return ['I-864', 'tax returns', 'pay stubs', 'bank statements', 'employment letter'];
    case 'unauthorized_employment': return ['I-765 approval', 'employment authorization', 'work history'];
    case 'unlawful_presence': return ['I-94', 'departure records', 'waiver evidence', 'proof of lawful status'];
    case 'criminal_ground': return ['certified court dispositions', 'police records', 'rehabilitation evidence'];
    case 'inadmissibility': return ['evidence addressing specific ground', 'waiver application'];
    case 'insufficient_evidence': return ['evidence addressing deficiency'];
    case 'eligibility': return ['evidence of eligibility requirement'];
    case 'procedural': return ['proof of timely filing', 'fee receipt', 'filing receipt'];
    case 'discretionary': return ['positive factors', 'hardship evidence', 'community ties'];
    case 'statutory_bar': return ['waiver application', 'proof bar does not apply'];
    default: return ['evidence addressing the denial ground'];
  }
}

// ─── NOID Strategy ────────────────────────────────────────────────────────────

export type NOIDStrategyType = 'rebut' | 'supplement' | 'procedural_challenge' | 'combined' | 'withdraw_refile';

export interface NOIDStrategy {
  type: NOIDStrategyType;
  description: string;
  steps: { action: string; rationale: string; addresses: string }[];
  attorneyRequired: boolean;
  successLikelihood: 'low' | 'moderate' | 'high';
}

export function buildNOIDStrategy(analysis: NOIDAnalysis): NOIDStrategy {
  const grounds = analysis.denialGrounds;
  const hasProcedural = analysis.proceduralIssues.length > 0;
  const hasSubstantive = grounds.some(g => g.rebuttable);
  const hasEvidenceGrounds = grounds.some(g => g.category === 'insufficient_evidence' || g.category === 'eligibility');

  let type: NOIDStrategyType;
  if (hasProcedural && hasSubstantive) type = 'combined';
  else if (hasProcedural && !hasSubstantive) type = 'procedural_challenge';
  else if (hasEvidenceGrounds && !hasProcedural) type = 'supplement';
  else if (hasSubstantive) type = 'rebut';
  else type = 'withdraw_refile';

  const steps = grounds.map(g => ({
    action: `Address ${g.category.replace(/_/g, ' ')}: ${g.evidenceRequired}`,
    rationale: g.rebuttable ? 'This ground is rebuttable with evidence' : 'This ground may be difficult to rebut',
    addresses: g.id,
  }));

  if (hasProcedural) {
    steps.push({
      action: 'Challenge procedural defect(s)',
      rationale: 'Procedural defects can invalidate the NOID',
      addresses: 'procedural',
    });
  }

  const successLikelihood: NOIDStrategy['successLikelihood'] =
    analysis.overallRisk === 'critical' ? 'low' :
    analysis.overallRisk === 'high' ? 'low' :
    analysis.overallRisk === 'moderate' ? 'moderate' : 'high';

  return {
    type,
    description: `${type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')} strategy for ${grounds.length} denial ground(s)`,
    steps,
    attorneyRequired: analysis.hasAttorneyRecommendation,
    successLikelihood,
  };
}
