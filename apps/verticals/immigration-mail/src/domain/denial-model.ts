/**
 * USCIS Denial Response / Case Recovery Domain Model
 *
 * Different from RFE and NOID:
 * - RFE = "we need more evidence" (opportunity to strengthen)
 * - NOID = "we intend to deny" (must overcome the denial ground)
 * - DENIAL = the case has been denied (must appeal, reopen, or refile)
 *
 * Response paths:
 * - Appeal (I-290B to AAO or BIA)
 * - Motion to Reopen (new facts/evidence)
 * - Motion to Reconsider (legal error)
 * - Refile (start over with new evidence)
 * - Concurrent filing (appeal + motion)
 */

// ─── Denial Types ──────────────────────────────────────────────────────────────

export type DenialFormType =
  | 'I-485' | 'I-130' | 'I-140' | 'I-751' | 'N-400'
  | 'I-601' | 'I-290B' | 'H-1B' | 'generic';

export type DenialCategory =
  | 'eligibility'
  | 'inadmissibility'
  | 'insufficient_evidence'
  | 'procedural'
  | 'discretionary'
  | 'fraud_misrepresentation'
  | 'public_charge'
  | 'statutory_bar'
  | 'criminal_ground'
  | 'abandonment'
  | 'failure_to_appear'
  | 'other';

export type ResponsePath =
  | 'appeal'
  | 'motion_to_reopen'
  | 'motion_to_reconsider'
  | 'refile'
  | 'concurrent_appeal_motion'
  | 'no_remedy_available';

export interface DenialFinding {
  id: string;
  category: DenialCategory;
  description: string;
  statutoryBasis?: string;
  uscisFinding: string;
  appealable: boolean;
  responsePath: ResponsePath;
  evidenceRequired: string;
  legalArgumentRequired: boolean;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  recommendation: 'self_respond' | 'attorney_recommended' | 'attorney_required';
}

export interface DenialAnalysis {
  formType: DenialFormType;
  receiptNumber?: string;
  denialDate?: string;
  appealDeadline?: string;
  appealDeadlineDays?: number;
  denialFindings: DenialFinding[];
  responsePaths: ResponsePath[];
  deadlineConsequence: 'deadline_critical' | 'deadline_important' | 'no_deadline' | 'deadline_passed';
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  hasAttorneyRecommendation: boolean;
  summaryEn: string;
  summaryEs?: string;
  recommendedActions: string[];
}

// ─── Denial Detection ──────────────────────────────────────────────────────────

const DENIAL_PATTERNS: { category: DenialCategory; patterns: RegExp[]; statutoryBasis?: string; severity: DenialFinding['severity'] }[] = [
  { category: 'fraud_misrepresentation', patterns: [/fraud/i, /willful misrepresentation/i, /material misrepresentation/i], statutoryBasis: 'INA § 212(a)(6)(C)(i)', severity: 'critical' },
  { category: 'public_charge', patterns: [/public charge/i], statutoryBasis: 'INA § 212(a)(4)', severity: 'moderate' },
  { category: 'statutory_bar', patterns: [/statutory bar/i, /permanent bar/i, /barred from/i], statutoryBasis: 'INA § 212(a)(9)(C)', severity: 'critical' },
  { category: 'criminal_ground', patterns: [/criminal/i, /conviction/i, /moral turpitude/i, /controlled substance/i], statutoryBasis: 'INA § 212(a)(2)', severity: 'critical' },
  { category: 'inadmissibility', patterns: [/inadmissible/i, /inadmissibility/i], severity: 'high' },
  { category: 'discretionary', patterns: [/discretion/i, /unfavorable exercise/i], severity: 'moderate' },
  { category: 'insufficient_evidence', patterns: [/insufficient evidence/i, /evidence .* insufficient/i, /inadequate evidence/i], severity: 'low' },
  { category: 'eligibility', patterns: [/not eligible/i, /does not qualify/i, /fails to meet/i], severity: 'moderate' },
  { category: 'abandonment', patterns: [/abandoned/i, /abandonment/i], severity: 'moderate' },
  { category: 'failure_to_appear', patterns: [/failed to appear/i, /failure to appear/i, /no-show/i], severity: 'high' },
  { category: 'procedural', patterns: [/untimely/i, /improperly filed/i, /incorrect fee/i], severity: 'moderate' },
];

export function detectDenialFormType(text: string): DenialFormType {
  const patterns: Record<string, RegExp[]> = {
    'I-485': [/\bI-?485\b/i, /\badjustment of status\b/i, /\bpermanent residence\b/i],
    'I-130': [/\bI-?130\b/i, /\bfamily petition\b/i, /\brelative petition\b/i],
    'I-140': [/\bI-?140\b/i, /\bemployment petition\b/i, /\balien worker\b/i],
    'I-751': [/\bI-?751\b/i, /\bremoval of conditions\b/i],
    'N-400': [/\bN-?400\b/i, /\bnaturalization\b/i, /\bcitizenship\b/i],
    'I-601': [/\bI-?601\b/i, /\bwaiver\b/i],
    'I-290B': [/\bI-?290B\b/i, /\bappeal\b/i, /\bmotion to reopen\b/i, /\bmotion to reconsider\b/i],
    'H-1B': [/\bH-?1B\b/i, /\bspecialty occupation\b/i],
  };
  for (const [form, pats] of Object.entries(patterns)) {
    for (const p of pats) { if (p.test(text)) return form as DenialFormType; }
  }
  return 'generic';
}

export function detectDenialFindings(text: string): DenialFinding[] {
  const findings: DenialFinding[] = [];
  let id = 0;
  for (const { category, patterns, statutoryBasis, severity } of DENIAL_PATTERNS) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const idx = match.index ?? 0;
        const context = text.slice(Math.max(0, idx - 200), Math.min(text.length, idx + match[0].length + 200)).trim();
        const appealable = !['statutory_bar'].includes(category);
        const responsePath: ResponsePath =
          category === 'insufficient_evidence' ? 'motion_to_reopen' :
          category === 'procedural' ? 'motion_to_reconsider' :
          category === 'fraud_misrepresentation' || category === 'criminal_ground' ? 'appeal' :
          'appeal';
        const requiresLegal = ['fraud_misrepresentation', 'criminal_ground', 'inadmissibility', 'discretionary', 'statutory_bar'].includes(category);
        findings.push({
          id: `finding-${++id}`,
          category, description: match[0], statutoryBasis, uscisFinding: context.slice(0, 500),
          appealable, responsePath,
          evidenceRequired: getEvidenceForCategory(category),
          legalArgumentRequired: requiresLegal,
          severity,
          recommendation: severity === 'critical' ? 'attorney_required' : severity === 'high' ? 'attorney_recommended' : 'self_respond',
        });
        break;
      }
    }
  }
  return findings;
}

function getEvidenceForCategory(category: DenialCategory): string {
  switch (category) {
    case 'fraud_misrepresentation': return 'Evidence of truthfulness, original documents, witness affidavits';
    case 'insufficient_evidence': return 'Additional evidence addressing the specific deficiency';
    case 'abandonment': return 'Proof that application was not abandoned (address change evidence, delivery confirmation)';
    case 'failure_to_appear': return 'Evidence of good cause for non-appearance (medical, emergency, notice issues)';
    default: return 'Evidence addressing the specific denial finding';
  }
}

// ─── Response Path Analysis ────────────────────────────────────────────────────

export function analyzeResponsePaths(findings: DenialFinding[]): ResponsePath[] {
  const paths = new Set<ResponsePath>();
  for (const f of findings) {
    if (f.appealable) paths.add(f.responsePath);
  }
  if (paths.size === 0) paths.add('no_remedy_available');
  return Array.from(paths);
}

export function assessDenialRisk(findings: DenialFinding[]): DenialFinding['severity'] {
  if (findings.length === 0) return 'low';
  if (findings.some(f => f.severity === 'critical')) return 'critical';
  if (findings.some(f => f.severity === 'high')) return 'high';
  if (findings.some(f => f.severity === 'moderate')) return 'moderate';
  return 'low';
}

export function shouldRecommendAttorneyForDenial(findings: DenialFinding[], risk: DenialFinding['severity']): boolean {
  if (risk === 'critical' || risk === 'high') return true;
  if (findings.some(f => f.recommendation === 'attorney_required' || f.recommendation === 'attorney_recommended')) return true;
  if (findings.some(f => f.legalArgumentRequired)) return true;
  return false;
}

// ─── Full Denial Analysis ──────────────────────────────────────────────────────

export function analyzeDenial(text: string): DenialAnalysis {
  const formType = detectDenialFormType(text);
  const findings = detectDenialFindings(text);
  const responsePaths = analyzeResponsePaths(findings);
  const overallRisk = assessDenialRisk(findings);
  const hasAttorneyRec = shouldRecommendAttorneyForDenial(findings, overallRisk);

  // Extract receipt number
  const receiptMatch = text.match(/\b([A-Z]{3}\d{10})\b/);
  const receiptNumber = receiptMatch?.[1];

  // Extract denial date
  const dateMatch = text.match(/(?:denied|denial date|dated)\s*:?\s*([A-Z][a-z]+ \d{1,2},?\s*\d{4})/i) ??
    text.match(/(?:denied|denial date|dated)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const denialDate = dateMatch?.[1];

  // Extract appeal deadline (typically 33 days from denial for I-290B)
  const deadlineMatch = text.match(/within\s+(\d+)\s+days/i) ??
    text.match(/no later than\s+([A-Z][a-z]+ \d{1,2},?\s*\d{4})/i);
  let appealDeadline: string | undefined;
  let appealDeadlineDays: number | undefined;
  if (deadlineMatch) {
    if (deadlineMatch[1].match(/^\d+$/)) appealDeadlineDays = parseInt(deadlineMatch[1]);
    else appealDeadline = deadlineMatch[1];
  }

  let deadlineConsequence: DenialAnalysis['deadlineConsequence'] = 'no_deadline';
  if (appealDeadlineDays || appealDeadline) {
    deadlineConsequence = appealDeadlineDays && appealDeadlineDays <= 7 ? 'deadline_critical' : 'deadline_important';
  }

  const recommendedActions: string[] = [];
  if (hasAttorneyRec) recommendedActions.push('Consult an immigration attorney immediately — appeals have strict deadlines.');
  recommendedActions.push('Read the denial notice carefully and identify every finding.');
  if (responsePaths.includes('appeal')) recommendedActions.push('Consider filing Form I-290B (Appeal or Motion) within the deadline.');
  if (responsePaths.includes('motion_to_reopen')) recommendedActions.push('Gather new evidence for a motion to reopen.');
  if (responsePaths.includes('motion_to_reconsider')) recommendedActions.push('Identify the legal error for a motion to reconsider.');
  recommendedActions.push('Do not miss the appeal deadline — it is typically 33 days from the denial decision.');

  const summaryEn = `This is a denial for ${formType === 'generic' ? 'an immigration application' : `Form ${formType}`}. ` +
    (findings.length > 0 ? `${findings.length} finding(s) identified. ` : '') +
    `Response path(s): ${responsePaths.map(p => p.replace(/_/g, ' ')).join(', ')}. ` +
    `Overall risk: ${overallRisk}. ` +
    (hasAttorneyRec ? 'An attorney is strongly recommended.' : 'You may be able to respond on your own.');

  const summaryEs = `Esta es una denegación para ${formType === 'generic' ? 'una solicitud' : `el Formulario ${formType}`}. ` +
    (findings.length > 0 ? `${findings.length} hallazgo(s) identificado(s). ` : '') +
    `Riesgo general: ${overallRisk}. ` +
    (hasAttorneyRec ? 'Se recomienda un abogado.' : 'Puede responder por su cuenta.');

  return {
    formType, receiptNumber, denialDate, appealDeadline, appealDeadlineDays,
    denialFindings: findings, responsePaths, deadlineConsequence,
    overallRisk, hasAttorneyRecommendation: hasAttorneyRec,
    summaryEn, summaryEs, recommendedActions,
  };
}

// ─── Denial Strategy ──────────────────────────────────────────────────────────

export type DenialStrategyType = 'appeal' | 'motion_to_reopen' | 'motion_to_reconsider' | 'refile' | 'concurrent' | 'no_remedy';

export interface DenialStrategy {
  type: DenialStrategyType;
  description: string;
  steps: { action: string; rationale: string; addresses: string }[];
  attorneyRequired: boolean;
  successLikelihood: 'low' | 'moderate' | 'high';
  filingFee: number;
  formRequired: string;
}

export function buildDenialStrategy(analysis: DenialAnalysis): DenialStrategy {
  const paths = analysis.responsePaths;
  let type: DenialStrategyType;
  if (paths.includes('appeal') && (paths.includes('motion_to_reopen') || paths.includes('motion_to_reconsider'))) {
    type = 'concurrent';
  } else if (paths.includes('appeal')) {
    type = 'appeal';
  } else if (paths.includes('motion_to_reopen')) {
    type = 'motion_to_reopen';
  } else if (paths.includes('motion_to_reconsider')) {
    type = 'motion_to_reconsider';
  } else if (paths.includes('refile')) {
    type = 'refile';
  } else {
    type = 'no_remedy';
  }

  const steps = analysis.denialFindings.map(f => ({
    action: `Address ${f.category.replace(/_/g, ' ')}: ${f.evidenceRequired}`,
    rationale: f.appealable ? 'This finding is appealable' : 'This finding may not be appealable',
    addresses: f.id,
  }));

  const successLikelihood: DenialStrategy['successLikelihood'] =
    analysis.overallRisk === 'critical' ? 'low' :
    analysis.overallRisk === 'high' ? 'low' :
    analysis.overallRisk === 'moderate' ? 'moderate' : 'high';

  return {
    type,
    description: `${type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')} strategy for ${analysis.denialFindings.length} finding(s)`,
    steps,
    attorneyRequired: analysis.hasAttorneyRecommendation,
    successLikelihood,
    filingFee: 675, // I-290B filing fee
    formRequired: 'I-290B',
  };
}
