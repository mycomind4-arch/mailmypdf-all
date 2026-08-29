/**
 * Immigration Appeal Letter Domain Model
 *
 * Genuinely distinct from Denial Response:
 * - Different procedural posture: appealing a DECISION, not responding to a notice
 * - Different forms: I-290B (USCIS appeals/motions), BIA appeals (EOIR)
 * - Different deadlines: 30 days (AAO appeal), 30 days (BIA), 33 days (USCIS motion)
 * - Different strategy: argue the decision was WRONG, not just submit more evidence
 * - Different authority: AAO precedent decisions, BIA precedent, regulatory standards
 *
 * Handoff rule: If the "appeal" is actually just submitting missing evidence
 * to overcome a denial (not arguing the decision was wrong), hand off to the
 * shared Denial Response engine instead of duplicating it.
 */

import type { LanguageContext } from './multilingual';
import { createLanguageContext } from './multilingual';

// ─── Appeal Types ───────────────────────────────────────────────────────────────

export type AppealType =
  | 'aao_appeal'       // Appeal to Administrative Appeals Office (USCIS)
  | 'bia_appeal'       // Appeal to Board of Immigration Appeals (EOIR)
  | 'motion_to_reopen'  // Motion to reopen (I-290B or EOIR)
  | 'motion_to_reconsider' // Motion to reconsider (I-290B)
  | 'motion_to_reopen_reconsider' // Combined motion
  | 'refile'           // Not an appeal — better to refile
  | 'denial_response_handoff' // Not an appeal — hand off to Denial engine
  | 'unknown';

export type AppellateBody =
  | 'AAO'    // Administrative Appeals Office
  | 'BIA'    // Board of Immigration Appeals
  | 'USCIS'  // USCIS (for motions, not appeals)
  | 'unknown';

export type DecisionType =
  | 'uscis_denial'      // USCIS denied the petition/application
  | 'uscis_revocation'  // USCIS revoked an approval
  | 'eoir_removal'      // Immigration judge ordered removal
  | 'eoir_denial'       // Immigration judge denied relief
  | 'dos_visa_denial'   // Consular visa denial (not appealable via AAO/BIA)
  | 'unknown';

export interface AppealGround {
  id: string;
  type: 'legal_error' | 'factual_error' | 'new_evidence' | 'changed_circumstances' | 'procedural_error' | 'insufficient_evidence';
  description: string;
  argument: string;
  authority: string;
  strength: 'strong' | 'moderate' | 'weak';
}

export interface AppealAnalysis {
  type: AppealType;
  appellateBody: AppellateBody;
  decisionType: DecisionType;
  formType?: string;
  receiptNumber?: string;
  aNumber?: string;
  decisionDate?: string;
  appealDeadline?: string;
  deadlineDays?: number;
  grounds: AppealGround[];
  overallStrength: 'strong' | 'moderate' | 'weak' | 'no_basis';
  shouldHandoffToDenialEngine: boolean;
  shouldRecommendAttorney: boolean;
  filingFee: number;
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  summaryEn: string;
  summaryEs?: string;
  recommendedActions: string[];
}

// ─── Detection ──────────────────────────────────────────────────────────────────

export function detectAppealType(text: string): AppealType {
  // Check for motion to reopen/reconsider
  if (/motion to reopen and reconsider|motion to reopen.{0,20}reconsider/i.test(text)) return 'motion_to_reopen_reconsider';
  if (/motion to reopen/i.test(text)) return 'motion_to_reopen';
  if (/motion to reconsider/i.test(text)) return 'motion_to_reconsider';

  // Check for AAO/BIA appeal
  if (/appeal.{0,30}AAO|administrative appeals office/i.test(text)) return 'aao_appeal';
  if (/appeal.{0,30}BIA|board of immigration appeals/i.test(text)) return 'bia_appeal';
  if (/appeal/i.test(text) && /I-?290B/i.test(text)) return 'aao_appeal';
  if (/appeal/i.test(text) && /eoir|immigration court|immigration judge/i.test(text)) return 'bia_appeal';
  if (/appeal/i.test(text)) return 'aao_appeal'; // Default to AAO

  // If just asking to submit more evidence after denial → handoff
  if (/denied|denial/i.test(text) && /more evidence|additional evidence|submit evidence/i.test(text)) return 'denial_response_handoff';

  // If asking to refile
  if (/refile|re-?file|new application|file again/i.test(text)) return 'refile';

  return 'unknown';
}

export function detectAppellateBody(type: AppealType, text: string): AppellateBody {
  if (type === 'bia_appeal') return 'BIA';
  if (type === 'aao_appeal') return 'AAO';
  if (type === 'motion_to_reopen' || type === 'motion_to_reconsider' || type === 'motion_to_reopen_reconsider') {
    if (/eoir|immigration court|immigration judge/i.test(text)) return 'BIA';
    return 'USCIS';
  }
  return 'unknown';
}

export function detectDecisionType(text: string): DecisionType {
  if (/immigration court.*removal|order of removal|removal order/i.test(text)) return 'eoir_removal';
  if (/immigration court.*denied|immigration judge.*denied/i.test(text)) return 'eoir_denial';
  if (/revocation|revoke/i.test(text)) return 'uscis_revocation';
  if (/denied|denial/i.test(text)) {
    if (/eoir|immigration court|immigration judge/i.test(text)) return 'eoir_denial';
    return 'uscis_denial';
  }
  if (/visa.*denied|consular.*denial/i.test(text)) return 'dos_visa_denial';
  return 'unknown';
}

export function detectAppealDeadline(type: AppealType, text: string): { deadline?: string; days?: number } {
  // AAO appeals: 30 days from decision
  // BIA appeals: 30 days from decision
  // USCIS motions: typically 33 days
  // EOIR motions: typically 90 days for reopening, any time for reconsider

  const dateMatch = text.match(/no later than\s+([A-Z][a-z]+ \d{1,2},?\s*\d{4})/i);
  if (dateMatch) return { deadline: dateMatch[1] };

  const daysMatch = text.match(/within\s+(\d+)\s+days/i);
  if (daysMatch) return { days: parseInt(daysMatch[1]) };

  // Default deadlines by type
  switch (type) {
    case 'aao_appeal': return { days: 30 };
    case 'bia_appeal': return { days: 30 };
    case 'motion_to_reopen':
    case 'motion_to_reconsider':
    case 'motion_to_reopen_reconsider':
      return { days: 33 };
    default: return {};
  }
}

export function detectAppealGrounds(text: string): AppealGround[] {
  const grounds: AppealGround[] = [];
  let id = 0;

  if (/legal error|incorrect.{0,20}law|misappl/i.test(text)) {
    grounds.push({
      id: `ground-${++id}`, type: 'legal_error',
      description: 'USCIS misapplied the law',
      argument: 'The decision contains a legal error that warrants reversal.',
      authority: 'AAO precedent decisions, relevant INA sections and CFR',
      strength: 'strong',
    });
  }

  if (/factual error|incorrect.{0,20}fact|fact.{0,20}wrong|misstat/i.test(text)) {
    grounds.push({
      id: `ground-${++id}`, type: 'factual_error',
      description: 'USCIS made a factual error',
      argument: 'The decision contains factual errors that affected the outcome.',
      authority: 'Record evidence, documentary proof',
      strength: 'strong',
    });
  }

  if (/new evidence|additional evidence|newly available/i.test(text)) {
    grounds.push({
      id: `ground-${++id}`, type: 'new_evidence',
      description: 'New evidence is available',
      argument: 'New evidence not available at the time of decision supports approval.',
      authority: '8 CFR § 103.5 (motions), INA relevant sections',
      strength: 'moderate',
    });
  }

  if (/changed circumstances|circumstances have changed|situation changed/i.test(text)) {
    grounds.push({
      id: `ground-${++id}`, type: 'changed_circumstances',
      description: 'Circumstances have changed',
      argument: 'Changed circumstances warrant reopening or reconsideration.',
      authority: '8 CFR § 1003.2 (BIA motions), 8 CFR § 103.5 (USCIS motions)',
      strength: 'moderate',
    });
  }

  if (/procedural|unfair|due process/i.test(text)) {
    grounds.push({
      id: `ground-${++id}`, type: 'procedural_error',
      description: 'Procedural error occurred',
      argument: 'A procedural error deprived the applicant of a fair process.',
      authority: 'Due process clause, procedural regulations',
      strength: 'moderate',
    });
  }

  if (/insufficient.{0,20}evidence|not enough evidence|more evidence/i.test(text)) {
    grounds.push({
      id: `ground-${++id}`, type: 'insufficient_evidence',
      description: 'Decision based on insufficient evidence',
      argument: 'The evidence submitted was sufficient to support approval.',
      authority: 'Relevant form instructions, USCIS Policy Manual',
      strength: 'weak',
    });
  }

  if (grounds.length === 0) {
    grounds.push({
      id: `ground-${++id}`, type: 'legal_error',
      description: 'The decision was incorrect',
      argument: 'The decision should be reversed based on the record.',
      authority: 'Relevant INA sections and CFR',
      strength: 'moderate',
    });
  }

  return grounds;
}

// ─── Full Analysis ────────────────────────────────────────────────────────────

export function analyzeAppeal(text: string): AppealAnalysis {
  const type = detectAppealType(text);
  const appellateBody = detectAppellateBody(type, text);
  const decisionType = detectDecisionType(text);
  const grounds = detectAppealGrounds(text);
  const { deadline, days } = detectAppealDeadline(type, text);

  const receiptMatch = text.match(/\b([A-Z]{3}\d{10})\b/);
  const receiptNumber = receiptMatch?.[1];

  const aNumberMatch = text.match(/\bA\s*\d{8,9}\b/);
  const aNumber = aNumberMatch?.[0];

  const formMatch = text.match(/\b(I-?\d{3}[A-Z]?|N-?\d{3})\b/i);
  const formType = formMatch?.[0].toUpperCase();

  const decisionDateMatch = text.match(/(?:denied|decision dated|dated)\s*:?\s*([A-Z][a-z]+ \d{1,2},?\s*\d{4})/i);
  const decisionDate = decisionDateMatch?.[1];

  // Determine if this should hand off to Denial engine instead
  const shouldHandoff = type === 'denial_response_handoff' ||
    (grounds.length === 1 && grounds[0].type === 'insufficient_evidence' && /submit.*evidence|more evidence/i.test(text));

  // Strength assessment
  const hasStrongGround = grounds.some(g => g.strength === 'strong');
  const hasModerateGround = grounds.some(g => g.strength === 'moderate');
  const allWeak = grounds.every(g => g.strength === 'weak');
  const overallStrength = hasStrongGround ? 'strong' : hasModerateGround ? 'moderate' : allWeak ? 'weak' : 'no_basis';

  // Attorney recommendation
  const shouldRecommendAttorney =
    type === 'bia_appeal' ||
    decisionType === 'eoir_removal' ||
    decisionType === 'eoir_denial' ||
    overallStrength === 'weak' ||
    overallStrength === 'no_basis';

  // Filing fee
  const filingFee = type === 'bia_appeal' ? 110 : type === 'motion_to_reopen' || type === 'motion_to_reconsider' || type === 'motion_to_reopen_reconsider' ? 0 : 675; // I-290B fee

  // Risk
  const risk: 'low' | 'moderate' | 'high' | 'critical' =
    decisionType === 'eoir_removal' ? 'critical' :
    decisionType === 'eoir_denial' ? 'high' :
    overallStrength === 'no_basis' ? 'high' :
    overallStrength === 'weak' ? 'moderate' : 'low';

  const typeLabel = type === 'aao_appeal' ? 'AAO appeal' :
    type === 'bia_appeal' ? 'BIA appeal' :
    type === 'motion_to_reopen' ? 'motion to reopen' :
    type === 'motion_to_reconsider' ? 'motion to reconsider' :
    type === 'denial_response_handoff' ? 'denial response (no appeal needed)' :
    type === 'refile' ? 'refiling (no appeal)' : 'appeal';

  const summaryEn = `This appears to be an ${typeLabel}. ` +
    `Decision type: ${decisionType === 'uscis_denial' ? 'USCIS denial' : decisionType === 'eoir_removal' ? 'EOIR removal order' : decisionType === 'eoir_denial' ? 'EOIR denial' : decisionType === 'uscis_revocation' ? 'USCIS revocation' : 'unknown decision'}. ` +
    `${grounds.length} ground(s) identified. ` +
    `Overall strength: ${overallStrength}. ` +
    (days ? `Deadline: ${days} days. ` : '') +
    `Filing fee: $${filingFee}. ` +
    (shouldRecommendAttorney ? 'An attorney is strongly recommended. ' : '') +
    (shouldHandoff ? 'This may be better handled as a denial response with additional evidence. ' : '');

  const summaryEs = `Esto parece ser una ${typeLabel === 'AAO appeal' ? 'apelación ante la AAO' : typeLabel === 'BIA appeal' ? 'apelación ante la BIA' : typeLabel === 'motion to reopen' ? 'moción para reabrir' : typeLabel}. ` +
    `${grounds.length} argumento(s) identificado(s). ` +
    `Fuerza general: ${overallStrength === 'strong' ? 'fuerte' : overallStrength === 'moderate' ? 'moderada' : overallStrength === 'weak' ? 'débil' : 'sin base'}. ` +
    (shouldRecommendAttorney ? 'Se recomienda encarecidamente un abogado. ' : '');

  const recommendedActions: string[] = [];
  if (shouldHandoff) {
    recommendedActions.push('This appears to be a denial response, not an appeal. Consider submitting additional evidence instead.');
  } else {
    recommendedActions.push(`File ${type === 'aao_appeal' ? 'Form I-290B' : type === 'bia_appeal' ? 'Notice of Appeal (EOIR-26)' : 'the appropriate motion'} before the deadline.`);
    recommendedActions.push('Prepare your appeal argument addressing each ground.');
    recommendedActions.push('Include all supporting evidence and authority citations.');
    if (days) recommendedActions.push(`Deadline: ${days} days from the decision date.`);
    if (shouldRecommendAttorney) recommendedActions.push('Consult an immigration attorney immediately.');
  }
  recommendedActions.push('Mail with certified mail and keep proof of delivery.');

  return {
    type, appellateBody, decisionType, formType, receiptNumber, aNumber,
    decisionDate, appealDeadline: deadline, deadlineDays: days,
    grounds, overallStrength,
    shouldHandoffToDenialEngine: shouldHandoff,
    shouldRecommendAttorney,
    filingFee, overallRisk: risk,
    summaryEn, summaryEs, recommendedActions,
  };
}

// ─── Appeal Strategy ──────────────────────────────────────────────────────────────

export interface AppealStrategy {
  type: AppealType;
  description: string;
  steps: { action: string; rationale: string; status: 'supported' | 'conditional' | 'uncertain' }[];
  filingForm: string;
  filingAddress: string;
  filingFee: number;
  deadline: string;
}

export function buildAppealStrategy(analysis: AppealAnalysis): AppealStrategy {
  const steps: AppealStrategy['steps'] = [];

  for (const ground of analysis.grounds) {
    steps.push({
      action: `Argue: ${ground.description}`,
      rationale: ground.authority,
      status: ground.strength === 'strong' ? 'supported' : ground.strength === 'moderate' ? 'conditional' : 'uncertain',
    });
  }

  steps.push({ action: 'File the appropriate form with fee', rationale: `Filing fee: $${analysis.filingFee}`, status: 'supported' });
  steps.push({ action: 'Mail before deadline', rationale: analysis.deadlineDays ? `${analysis.deadlineDays} days from decision` : 'File promptly', status: 'supported' });
  steps.push({ action: 'Keep proof of delivery', rationale: 'Critical for deadline proof', status: 'supported' });

  const filingForm = analysis.type === 'bia_appeal' ? 'EOIR-26 (Notice of Appeal)' :
    analysis.type === 'aao_appeal' ? 'I-290B (Notice of Appeal)' :
    analysis.type === 'motion_to_reopen' || analysis.type === 'motion_to_reconsider' || analysis.type === 'motion_to_reopen_reconsider' ? 'I-290B (Motion)' :
    'I-290B';

  const filingAddress = analysis.appellateBody === 'BIA'
    ? 'Board of Immigration Appeals, Office of the Clerk, 5107 Leesburg Pike, Falls Church, VA 22041'
    : 'USCIS, ATTN: AAO, P.O. Box 8787, Laguna Niguel, CA 92607';

  return {
    type: analysis.type,
    description: `Appeal strategy: ${analysis.overallStrength} case with ${analysis.grounds.length} ground(s)`,
    steps,
    filingForm,
    filingAddress,
    filingFee: analysis.filingFee,
    deadline: analysis.deadlineDays ? `${analysis.deadlineDays} days` : 'See notice',
  };
}
