/**
 * Visa Refusal Response Domain Model
 *
 * Fundamentally different from RFE/NOID/Denial:
 * - RFE/NOID/Denial = USCIS proceedings (domestic)
 * - Visa Refusal = Consular processing (Department of State, abroad)
 *
 * Key distinctions:
 * - 221(g) = refusal for additional documentation (similar to RFE but consular)
 * - Administrative processing = additional security/background checks
 * - Visa refusal = consular officer found ineligibility ground
 * - Different authority: 9 FAM, INA § 221(g), INA § 214(b)
 * - No I-290B appeal for consular refusals
 * - Response paths: reapply, overcome grounds, waiver (if available)
 */

// ─── Visa Refusal Types ────────────────────────────────────────────────────────

export type VisaCategory =
  | 'B1/B2'    // Visitor/tourist
  | 'F-1'      // Student
  | 'H-1B'     // Specialty occupation
  | 'L-1'      // Intracompany transferee
  | 'J-1'      // Exchange visitor
  | 'O-1'      // Extraordinary ability
  | 'K-1'      // Fiancé(e)
  | 'IR/CR'    // Immigrant relative (spouse/child/parent)
  | 'EB'       // Employment-based immigrant
  | 'DV'       // Diversity visa
  | 'generic';

export type RefusalType =
  | 'section_221g'          // Refusal pending additional documents
  | 'section_214b'          // Nonimmigrant intent not established
  | 'section_212a'          // Inadmissibility ground
  | 'administrative_processing' // Additional security/background processing
  | 'visa_denial'           // Final denial
  | 'revoked'              // Previously issued visa revoked
  | 'generic_refusal';

export type RefusalGround =
  | 'immigrant_intent'       // 214(b) — failed to overcome presumption
  | 'insufficient_ties'      // Insufficient ties to home country
  | 'inadmissibility'        // Specific INA § 212(a) ground
  | 'fraud_misrepresentation'// 212(a)(6)(C)
  | 'public_charge'          // 212(a)(4)
  | 'criminal_ground'        // 212(a)(2)
  | 'health_related'         // 212(a)(1)
  | 'security_ground'        // 212(a)(3)
  | 'unlawful_presence'      // 212(a)(9)(B)
  | 'prior_overstay'         // History of overstaying
  | 'insufficient_document'  // Missing/insufficient documentation
  | 'inconsistent_info'     // Inconsistencies in application
  | 'employer_issues'        // Employer petition issues (H/L/O)
  | 'school_issues'          // School/program issues (F/J)
  | 'other';

export interface VisaRefusalFinding {
  id: string;
  refusalType: RefusalType;
  ground: RefusalGround;
  section: string;           // e.g., "INA § 214(b)", "INA § 221(g)"
  description: string;
  consularFinding: string;
  rebuttable: boolean;
  evidenceRequired: string;
  responsePath: VisaResponsePath;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  recommendation: 'self_respond' | 'attorney_recommended' | 'attorney_required';
}

export type VisaResponsePath =
  | 'submit_additional_documents'  // 221(g) — bring/passport in documents
  | 'reapply'                     // 214(b) — reapply with better evidence
  | 'apply_waiver'               // If waiver available for inadmissibility
  | 'request_reconsideration'    // Ask consular officer to reconsider
  | 'wait_administrative'         // Wait for administrative processing
  | 'consult_attorney'            // Complex case needs legal help
  | 'no_remedy';                  // No available remedy

export interface VisaRefusalAnalysis {
  visaCategory: VisaCategory;
  refusalType: RefusalType;
  receiptNumber?: string;
  consulate?: string;
  refusalDate?: string;
  findings: VisaRefusalFinding[];
  responsePaths: VisaResponsePath[];
  deadlineInfo: string | undefined;
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  hasAttorneyRecommendation: boolean;
  summaryEn: string;
  summaryEs?: string;
  recommendedActions: string[];
}

// ─── Detection ──────────────────────────────────────────────────────────────────

const REFUSAL_PATTERNS: { refusalType: RefusalType; ground: RefusalGround; patterns: RegExp[]; section: string; severity: VisaRefusalFinding['severity'] }[] = [
  { refusalType: 'section_221g', ground: 'insufficient_document', patterns: [/221\(g\)/i, /221\(g\)/i, /section 221/i], section: 'INA § 221(g)', severity: 'low' },
  { refusalType: 'section_214b', ground: 'immigrant_intent', patterns: [/214\(b\)/i, /section 214/i, /immigrant intent/i, /nonimmigrant intent/i], section: 'INA § 214(b)', severity: 'moderate' },
  { refusalType: 'section_214b', ground: 'insufficient_ties', patterns: [/insufficient ties/i, /ties to .* country/i, /failed to overcome/i], section: 'INA § 214(b)', severity: 'moderate' },
  { refusalType: 'section_212a', ground: 'fraud_misrepresentation', patterns: [/fraud/i, /willful misrepresentation/i, /material misrepresentation/i], section: 'INA § 212(a)(6)(C)(i)', severity: 'critical' },
  { refusalType: 'section_212a', ground: 'public_charge', patterns: [/public charge/i], section: 'INA § 212(a)(4)', severity: 'moderate' },
  { refusalType: 'section_212a', ground: 'criminal_ground', patterns: [/criminal/i, /conviction/i, /moral turpitude/i, /controlled substance/i], section: 'INA § 212(a)(2)', severity: 'critical' },
  { refusalType: 'section_212a', ground: 'health_related', patterns: [/health/i, /medical/i, /communicable disease/i, /vaccination/i], section: 'INA § 212(a)(1)', severity: 'high' },
  { refusalType: 'section_212a', ground: 'security_ground', patterns: [/security/i, /terrorism/i, /national security/i], section: 'INA § 212(a)(3)', severity: 'critical' },
  { refusalType: 'section_212a', ground: 'unlawful_presence', patterns: [/unlawful presence/i, /overstay/i, /3\/10 year bar/i], section: 'INA § 212(a)(9)(B)', severity: 'high' },
  { refusalType: 'administrative_processing', ground: 'other', patterns: [/administrative processing/i, /additional processing/i, /further review/i], section: 'INA § 221(g)', severity: 'low' },
  { refusalType: 'visa_denial', ground: 'inconsistent_info', patterns: [/inconsisten/i, /discrepancy/i, /contradictory/i], section: 'INA § 212(a)(6)(C)(i)', severity: 'high' },
  { refusalType: 'visa_denial', ground: 'prior_overstay', patterns: [/prior overstay/i, /previous overstay/i, /overstayed/i], section: 'INA § 214(b)', severity: 'high' },
  { refusalType: 'visa_denial', ground: 'employer_issues', patterns: [/employer/i, /petition .* invalid/i, /petition .* revoked/i, /employer.*qualify/i], section: 'INA § 214', severity: 'moderate' },
  { refusalType: 'visa_denial', ground: 'school_issues', patterns: [/school/i, /institution/i, /program .* terminated/i, /out of status/i], section: 'INA § 214(b)', severity: 'moderate' },
];

export function detectVisaCategory(text: string): VisaCategory {
  const patterns: Record<string, RegExp[]> = {
    'B1/B2': [/\bB-?1\b/i, /\bB-?2\b/i, /\bB1\/B2\b/i, /\bvisitor visa\b/i, /\btourist visa\b/i],
    'F-1': [/\bF-?1\b/i, /\bstudent visa\b/i, /\bI-20\b/i],
    'H-1B': [/\bH-?1B\b/i, /\bspecialty occupation\b/i],
    'L-1': [/\bL-?1\b/i, /\bintracompany\b/i, /\btransferee\b/i],
    'J-1': [/\bJ-?1\b/i, /\bexchange visitor\b/i, /\bDS-2019\b/i],
    'O-1': [/\bO-?1\b/i, /\bextraordinary ability\b/i],
    'K-1': [/\bK-?1\b/i, /\bfianc/i],
    'IR/CR': [/\bIR\b/i, /\bCR\b/i, /\bspouse visa\b/i, /\bimmigrant visa.*relative/i],
    'EB': [/\bEB-?[1235]\b/i, /\bemployment.*immigrant\b/i],
    'DV': [/\bDV\b/i, /\bdiversity visa\b/i, /\blottery/i],
  };
  for (const [cat, pats] of Object.entries(patterns)) {
    for (const p of pats) { if (p.test(text)) return cat as VisaCategory; }
  }
  return 'generic';
}

export function detectRefusalType(text: string): RefusalType {
  if (/administrative processing/i.test(text)) return 'administrative_processing';
  if (/221\(g\)/i.test(text) || /section 221/i.test(text)) return 'section_221g';
  if (/214\(b\)/i.test(text) || /section 214/i.test(text)) return 'section_214b';
  if (/212\(a\)/i.test(text) || /inadmissible/i.test(text)) return 'section_212a';
  if (/denied/i.test(text) || /refused/i.test(text)) return 'visa_denial';
  if (/revoked/i.test(text)) return 'revoked';
  return 'generic_refusal';
}

export function detectRefusalFindings(text: string): VisaRefusalFinding[] {
  const findings: VisaRefusalFinding[] = [];
  let id = 0;
  const seen = new Set<string>();

  for (const { refusalType, ground, patterns, section, severity } of REFUSAL_PATTERNS) {
    const key = `${refusalType}-${ground}`;
    if (seen.has(key)) continue;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        seen.add(key);
        const idx = match.index ?? 0;
        const context = text.slice(Math.max(0, idx - 200), Math.min(text.length, idx + match[0].length + 200)).trim();
        const rebuttable = !['security_ground'].includes(ground) && ground !== 'fraud_misrepresentation';
        const responsePath = determineResponsePath(refusalType, ground);
        const evidenceRequired = getEvidenceForGround(ground);
        const legalArgRequired = ['fraud_misrepresentation', 'criminal_ground', 'security_ground', 'inadmissibility'].includes(ground);
        findings.push({
          id: `finding-${++id}`,
          refusalType, ground, section, description: match[0], consularFinding: context.slice(0, 500),
          rebuttable, evidenceRequired, responsePath,
          severity,
          recommendation: severity === 'critical' ? 'attorney_required' : severity === 'high' ? 'attorney_recommended' : 'self_respond',
        });
        break;
      }
    }
  }
  return findings;
}

function determineResponsePath(refusalType: RefusalType, ground: RefusalGround): VisaResponsePath {
  if (refusalType === 'section_221g') return 'submit_additional_documents';
  if (refusalType === 'administrative_processing') return 'wait_administrative';
  if (refusalType === 'section_214b') return 'reapply';
  if (ground === 'fraud_misrepresentation' || ground === 'criminal_ground' || ground === 'security_ground') return 'consult_attorney';
  if (ground === 'unlawful_presence' || ground === 'inadmissibility') return 'apply_waiver';
  if (refusalType === 'visa_denial') return 'reapply';
  return 'reapply';
}

function getEvidenceForGround(ground: RefusalGround): string {
  switch (ground) {
    case 'immigrant_intent': return 'Proof of strong ties to home country: employment, property, family, financial ties';
    case 'insufficient_ties': return 'Evidence of employment, property ownership, bank accounts, family relationships in home country';
    case 'insufficient_document': return 'The specific documents requested by the consular officer';
    case 'fraud_misrepresentation': return 'Evidence of truthfulness, original documents, explanation of any misunderstanding';
    case 'public_charge': return 'Financial support evidence, sponsor Affidavit of Support, bank statements, employment proof';
    case 'criminal_ground': return 'Certified court dispositions, rehabilitation evidence, legal analysis of foreign convictions';
    case 'health_related': return 'Medical examination results, vaccination records, treatment completion documentation';
    case 'security_ground': return 'Consult attorney — security grounds are complex and require legal analysis';
    case 'unlawful_presence': return 'Waiver application (I-601/I-601A), proof of qualifying relative hardship';
    case 'prior_overstay': return 'Explanation of prior overstay, evidence of compliance since departure, ties to home country';
    case 'inconsistent_info': return 'Clarification of discrepancies, supporting documentation for correct information';
    case 'employer_issues': return 'Updated employer petition, proof of qualifying employment, position details';
    case 'school_issues': return 'Updated I-20/DS-2019, proof of enrollment, school letter explaining status';
    default: return 'Evidence addressing the specific refusal ground';
  }
}

// ─── Risk Assessment ──────────────────────────────────────────────────────────

export function assessRefusalRisk(findings: VisaRefusalFinding[]): VisaRefusalFinding['severity'] {
  if (findings.length === 0) return 'low';
  if (findings.some(f => f.severity === 'critical')) return 'critical';
  if (findings.some(f => f.severity === 'high')) return 'high';
  if (findings.some(f => f.severity === 'moderate')) return 'moderate';
  return 'low';
}

export function shouldRecommendAttorneyForVisa(findings: VisaRefusalFinding[], risk: VisaRefusalFinding['severity']): boolean {
  if (risk === 'critical' || risk === 'high') return true;
  if (findings.some(f => f.recommendation === 'attorney_required' || f.recommendation === 'attorney_recommended')) return true;
  return false;
}

// ─── Full Analysis ────────────────────────────────────────────────────────────

export function analyzeVisaRefusal(text: string): VisaRefusalAnalysis {
  const visaCategory = detectVisaCategory(text);
  const refusalType = detectRefusalType(text);
  const findings = detectRefusalFindings(text);
  const responsePaths = [...new Set(findings.map(f => f.responsePath))];
  const overallRisk = assessRefusalRisk(findings);
  const hasAttorneyRec = shouldRecommendAttorneyForVisa(findings, overallRisk);

  // Extract case number
  const caseMatch = text.match(/\b([A-Z]{2}\d{8,10})\b/) ?? text.match(/\b(case|application)\s*(?:no\.?|number)\s*:?\s*([A-Z0-9-]+)/i);
  const receiptNumber = caseMatch?.[1] ?? caseMatch?.[2];

  // Extract consulate
  const consulateMatch = text.match(/(?:embassy|consulate|consular)\s*(?:of|in)?\s*([A-Z][a-z]+)/i) ??
    text.match(/(?:at|in)\s+(?:the\s+)?(?:U\.S\.?\s+)?(?:Embassy|Consulate)[^.]*?\b([A-Z][a-z]+)\b/i);
  const consulate = consulateMatch?.[1];

  // Extract refusal date
  const dateMatch = text.match(/(?:refused|denied|dated)\s*:?\s*([A-Z][a-z]+ \d{1,2},?\s*\d{4})/i);
  const refusalDate = dateMatch?.[1];

  // Deadline info
  let deadlineInfo: string | undefined;
  if (refusalType === 'section_221g') {
    deadlineInfo = 'Submit requested documents within 1 year of the refusal date. After 1 year, a new application and fee are required.';
  } else if (refusalType === 'section_214b') {
    deadlineInfo = 'No formal deadline — you may reapply at any time with new evidence. A new application fee is required.';
  } else if (refusalType === 'administrative_processing') {
    deadlineInfo = 'No action required — wait for the consulate to complete processing. Processing typically takes 60-180 days.';
  }

  const recommendedActions: string[] = [];
  if (refusalType === 'section_221g') recommendedActions.push('Submit the specific documents requested by the consular officer.');
  if (refusalType === 'section_214b') recommendedActions.push('Gather stronger evidence of ties to your home country before reapplying.');
  if (refusalType === 'administrative_processing') recommendedActions.push('Wait for the consulate to complete administrative processing. Check status periodically.');
  if (hasAttorneyRec) recommendedActions.push('Consult an immigration attorney — this refusal involves complex legal issues.');
  recommendedActions.push('Keep a copy of the refusal notice and all documents submitted.');
  if (responsePaths.includes('apply_waiver')) recommendedActions.push('A waiver may be available — consult an attorney about eligibility.');

  const visaLabel = visaCategory === 'generic' ? 'a visa application' : `a ${visaCategory} visa application`;
  const refusalLabel = refusalType === 'section_221g' ? 'a 221(g) refusal (additional documents needed)' :
    refusalType === 'section_214b' ? 'a 214(b) refusal (nonimmigrant intent not established)' :
    refusalType === 'administrative_processing' ? 'administrative processing' :
    refusalType === 'section_212a' ? 'an inadmissibility-based refusal' :
    'a visa refusal';

  const summaryEn = `This is ${refusalLabel} for ${visaLabel}. ` +
    (findings.length > 0 ? `${findings.length} finding(s) identified. ` : '') +
    `Response path(s): ${responsePaths.map(p => p.replace(/_/g, ' ')).join(', ')}. ` +
    `Overall risk: ${overallRisk}. ` +
    (hasAttorneyRec ? 'An attorney is strongly recommended.' : 'You may be able to respond on your own.');

  const summaryEs = `Esta es ${refusalType === 'section_221g' ? 'una negativa 221(g) (se necesitan documentos adicionales)' : 'una negativa de visa'} para ${visaCategory === 'generic' ? 'una solicitud de visa' : `una solicitud de visa ${visaCategory}`}. ` +
    (findings.length > 0 ? `${findings.length} hallazgo(s) identificado(s). ` : '') +
    `Riesgo general: ${overallRisk}. ` +
    (hasAttorneyRec ? 'Se recomienda un abogado.' : 'Puede responder por su cuenta.');

  return {
    visaCategory, refusalType, receiptNumber, consulate, refusalDate,
    findings, responsePaths, deadlineInfo,
    overallRisk, hasAttorneyRecommendation: hasAttorneyRec,
    summaryEn, summaryEs, recommendedActions,
  };
}

// ─── Strategy ──────────────────────────────────────────────────────────────────

export interface VisaRefusalStrategy {
  type: VisaResponsePath;
  description: string;
  steps: { action: string; rationale: string; addresses: string }[];
  attorneyRequired: boolean;
  successLikelihood: 'low' | 'moderate' | 'high';
  feeRequired: number;
}

export function buildVisaRefusalStrategy(analysis: VisaRefusalAnalysis): VisaRefusalStrategy {
  const primaryPath = analysis.responsePaths[0] ?? 'reapply';
  const steps = analysis.findings.map(f => ({
    action: `Address ${f.ground.replace(/_/g, ' ')}: ${f.evidenceRequired}`,
    rationale: f.rebuttable ? 'This finding can be addressed with evidence' : 'This finding is difficult to overcome',
    addresses: f.id,
  }));

  if (primaryPath === 'wait_administrative') {
    steps.push({ action: 'Wait for processing to complete', rationale: 'Administrative processing resolves on its own', addresses: 'admin' });
  }
  if (primaryPath === 'apply_waiver') {
    steps.push({ action: 'Prepare waiver application (I-601 or I-601A)', rationale: 'A waiver may overcome the inadmissibility ground', addresses: 'waiver' });
  }

  const successLikelihood: VisaRefusalStrategy['successLikelihood'] =
    analysis.overallRisk === 'critical' ? 'low' :
    analysis.overallRisk === 'high' ? 'low' :
    analysis.overallRisk === 'moderate' ? 'moderate' : 'high';

  const feeRequired = primaryPath === 'reapply' ? 185 : // New visa application fee
    primaryPath === 'apply_waiver' ? 630 : // I-601 fee
    primaryPath === 'submit_additional_documents' ? 0 : // No new fee for 221(g) docs
    primaryPath === 'wait_administrative' ? 0 : 0;

  return {
    type: primaryPath,
    description: `${primaryPath.replace(/_/g, ' ')} strategy for ${analysis.findings.length} finding(s)`,
    steps,
    attorneyRequired: analysis.hasAttorneyRecommendation,
    successLikelihood,
    feeRequired,
  };
}
