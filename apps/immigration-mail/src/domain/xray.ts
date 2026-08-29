/**
 * G6 — Adversarial X-Ray Validation Engine
 *
 * Independent validation layer that challenges every material conclusion.
 *
 * Architecture:
 *   Reasoner → proposed conclusion
 *   → independent review (X-Ray)
 *   → authority verification
 *   → evidence verification
 *   → deterministic gates
 *   → validated conclusion
 *
 * The X-Ray is NOT merely another copy of the original prompt.
 * It independently challenges each finding from a different angle.
 *
 * X-Ray can return: PASS, WARNING, or BLOCK.
 * BLOCK must prevent consequential execution.
 */

import type { CaseReasoning, DetectedIssue, DeadlineFinding } from './case-reasoning';
import type { ReconciledCaseReasoning, AuthorityFinding } from './authority';
import type { EvidenceAnalysisResult, EvidenceConflict, EvidenceGapFinding } from './evidence';

// ─── X-Ray Verdict ───────────────────────────────────────────────────────────

export type XRayVerdict = 'PASS' | 'WARNING' | 'BLOCK';

// ─── X-Ray Challenge ──────────────────────────────────────────────────────────
// A single question the X-Ray asks about a finding.

export interface XRayChallenge {
  id: string;
  question: string;
  whatItChecks: 'authority_applicability' | 'source_freshness' | 'document_contradiction' | 'missing_exception' | 'alternative_path' | 'deadline_established' | 'fact_sufficiency' | 'evidence_conflict' | 'procedural_alternative';
  finding: XRayVerdict;
  reasoning: string;
  /** What fact would change this verdict. */
  factThatWouldChange: string;
}

// ─── X-Ray Finding ──────────────────────────────────────────────────────────
// The X-Ray's assessment of a single issue.

export interface XRayFinding {
  issueId: string;
  issueType: string;
  originalVerdict: 'PASS' | 'WARNING' | 'BLOCK';
  challenges: XRayChallenge[];
  finalVerdict: XRayVerdict;
  reasoning: string;
  userFacingExplanation: string;
  userFacingExplanationEs?: string;
  /** Whether this BLOCK should prevent consequential execution. */
  blocksExecution: boolean;
}

// ─── X-Ray Result ────────────────────────────────────────────────────────────

export interface XRayResult {
  findings: XRayFinding[];
  overallVerdict: XRayVerdict;
  safeToActUpon: boolean;
  /** Issues that need human review. */
  requiresHumanReview: string[];
  /** Original reasoning preserved. */
  history: { step: string; timestamp: string; summary: string; changes: string[] }[];
  userFacingSummary: string;
  userFacingSummaryEs?: string;
}

// ─── Provider-Neutral X-Ray Worker ───────────────────────────────────────────
// Allows an independently selected model/provider for adversarial review.

export interface XRayWorkerInput {
  issueId: string;
  issueType: string;
  issueDescription: string;
  confidence: number;
  knowledgeState: string;
  supportingFacts: { key: string; value: string }[];
  contradictingFacts: { key: string; value: string }[];
  authorityFindings?: { effect: string; safeToActUpon: boolean }[];
  evidenceStatus?: { sufficiency: string; conflicts: number };
  deadlineInfo?: { date: string | null; requiresConfirmation: boolean; confidence: number };
}

export interface XRayWorkerOutput {
  challenges: { question: string; verdict: XRayVerdict; reasoning: string; factThatWouldChange: string }[];
  overallVerdict: XRayVerdict;
  provenance: { provider: string; model: string; modelVersion: string; timestamp: string };
}

export interface XRayWorker {
  review(input: XRayWorkerInput): Promise<XRayWorkerOutput>;
}

// ─── Counters ──────────────────────────────────────────────────────────────────

let challengeCounter = 0;
function challengeId(): string { return `xray-${++challengeCounter}`; }
function resetCounters() { challengeCounter = 0; }

// ─── Deterministic X-Ray Challenge Generators ────────────────────────────────

function challengeAuthorityApplicability(
  issue: DetectedIssue,
  authorityFindings?: AuthorityFinding[],
): XRayChallenge {
  const relevantAuth = authorityFindings?.find(f => f.issueId === issue.id);

  if (!relevantAuth || relevantAuth.authorities.length === 0) {
    return {
      id: challengeId(),
      question: 'Is there specific authority that applies to this conclusion?',
      whatItChecks: 'authority_applicability',
      finding: issue.confidence >= 0.6 ? 'WARNING' : 'PASS',
      reasoning: 'No specific authority was identified for this conclusion.',
      factThatWouldChange: 'Identifying the applicable statute, regulation, or agency guidance.',
    };
  }

  if (!relevantAuth.safeToActUpon) {
    return {
      id: challengeId(),
      question: 'Is the authority current and applicable to this situation?',
      whatItChecks: 'authority_applicability',
      finding: 'BLOCK',
      reasoning: relevantAuth.explanation,
      factThatWouldChange: 'Verifying that the authority is current and directly applicable.',
    };
  }

  return {
    id: challengeId(),
    question: 'Is the authority current and applicable to this situation?',
    whatItChecks: 'authority_applicability',
    finding: 'PASS',
    reasoning: relevantAuth.explanation,
    factThatWouldChange: 'Discovery of a superseding or conflicting authority.',
  };
}

function challengeDocumentContradiction(
  issue: DetectedIssue,
  evidenceConflicts?: EvidenceConflict[],
): XRayChallenge {
  const hasContradiction = issue.knowledgeState === 'CONTRADICTORY' ||
    (evidenceConflicts && evidenceConflicts.length > 0);

  if (hasContradiction) {
    return {
      id: challengeId(),
      question: 'Does the document contradict this conclusion?',
      whatItChecks: 'document_contradiction',
      finding: 'BLOCK',
      reasoning: 'There is evidence that contradicts this conclusion. The contradiction must be resolved before proceeding.',
      factThatWouldChange: 'Resolving the contradiction by verifying the source document.',
    };
  }

  return {
    id: challengeId(),
    question: 'Does the document contradict this conclusion?',
    whatItChecks: 'document_contradiction',
    finding: 'PASS',
    reasoning: 'No contradictions were found in the available evidence.',
    factThatWouldChange: 'Discovery of a new document that contradicts the conclusion.',
  };
}

function challengeDeadlineEstablished(
  issue: DetectedIssue,
  deadlines?: DeadlineFinding[],
): XRayChallenge {
  if (issue.issueType !== 'deadline' && !deadlines?.some(d => d.requiresConfirmation)) {
    return {
      id: challengeId(),
      question: 'Is the deadline firmly established?',
      whatItChecks: 'deadline_established',
      finding: 'PASS',
      reasoning: 'No deadline-related concern for this finding.',
      factThatWouldChange: 'Discovery of a previously unknown deadline.',
    };
  }

  const unconfirmed = deadlines?.filter(d => d.requiresConfirmation);
  if (unconfirmed && unconfirmed.length > 0) {
    return {
      id: challengeId(),
      question: 'Is the deadline firmly established from the source document?',
      whatItChecks: 'deadline_established',
      finding: 'BLOCK',
      reasoning: `The deadline requires confirmation. ${unconfirmed[0].assumptions.join(' ')}`,
      factThatWouldChange: 'Verifying the deadline date from the source document.',
    };
  }

  return {
    id: challengeId(),
    question: 'Is the deadline firmly established?',
    whatItChecks: 'deadline_established',
    finding: 'PASS',
    reasoning: 'The deadline is established from the source document.',
    factThatWouldChange: 'Discovery that the deadline source is incorrect or superseded.',
  };
}

function challengeAlternativePath(
  issue: DetectedIssue,
): XRayChallenge {
  const hasAlternativePaths = issue.issueType === 'denial' || issue.issueType === 'procedural_posture';

  if (hasAlternativePaths) {
    return {
      id: challengeId(),
      question: 'Is there another procedural path that the user should consider?',
      whatItChecks: 'procedural_alternative',
      finding: 'WARNING',
      reasoning: 'When a denial or procedural question is involved, there may be multiple paths (appeal, motion, reconsideration). The user should be aware of alternatives.',
      factThatWouldChange: 'Clarifying which procedural path the user wants to pursue.',
    };
  }

  return {
    id: challengeId(),
    question: 'Is there another procedural path that the user should consider?',
    whatItChecks: 'procedural_alternative',
    finding: 'PASS',
    reasoning: 'No alternative procedural paths are relevant to this finding.',
    factThatWouldChange: 'Discovery of an alternative procedural option.',
  };
}

function challengeFactSufficiency(
  issue: DetectedIssue,
  evidenceGaps?: EvidenceGapFinding[],
): XRayChallenge {
  if (issue.knowledgeState === 'UNKNOWN') {
    return {
      id: challengeId(),
      question: 'Are there enough facts to support this conclusion?',
      whatItChecks: 'fact_sufficiency',
      finding: 'BLOCK',
      reasoning: 'The finding is marked as UNKNOWN — insufficient facts are available.',
      factThatWouldChange: 'Providing the missing information or uploading the relevant document.',
    };
  }

  const blockingGaps = evidenceGaps?.filter(g => g.blocking);
  if (blockingGaps && blockingGaps.length > 0) {
    return {
      id: challengeId(),
      question: 'Are there enough facts to support this conclusion?',
      whatItChecks: 'fact_sufficiency',
      finding: 'BLOCK',
      reasoning: `There are ${blockingGaps.length} blocking evidence gap(s).`,
      factThatWouldChange: 'Providing the missing evidence.',
    };
  }

  if (issue.knowledgeState === 'REQUIRES_REVIEW') {
    return {
      id: challengeId(),
      question: 'Are there enough facts to support this conclusion?',
      whatItChecks: 'fact_sufficiency',
      finding: 'WARNING',
      reasoning: 'This finding requires review before it can be relied upon.',
      factThatWouldChange: 'Completing the required review.',
    };
  }

  return {
    id: challengeId(),
    question: 'Are there enough facts to support this conclusion?',
    whatItChecks: 'fact_sufficiency',
    finding: 'PASS',
    reasoning: 'Sufficient facts are available to support this conclusion.',
    factThatWouldChange: 'Discovery of a new fact that contradicts the conclusion.',
  };
}

function challengeMissingException(
  issue: DetectedIssue,
): XRayChallenge {
  // Check if there might be an exception that hasn't been considered
  const mightHaveException = issue.issueType === 'denial' || issue.issueType === 'noid' ||
    issue.issueType === 'rejection' || issue.issueType === 'status_problem';

  if (mightHaveException) {
    return {
      id: challengeId(),
      question: 'What exception might apply that hasn\'t been considered?',
      whatItChecks: 'missing_exception',
      finding: 'WARNING',
      reasoning: 'For this type of issue, there may be exceptions or special circumstances that could change the outcome. These should be checked.',
      factThatWouldChange: 'Identifying an applicable exception or special circumstance.',
    };
  }

  return {
    id: challengeId(),
    question: 'What exception might apply that hasn\'t been considered?',
    whatItChecks: 'missing_exception',
    finding: 'PASS',
    reasoning: 'No exceptions are likely to apply to this finding.',
    factThatWouldChange: 'Discovery of an applicable exception.',
  };
}

// ─── Aggregate verdict from challenges ──────────────────────────────────────

function aggregateVerdict(challenges: XRayChallenge[]): XRayVerdict {
  if (challenges.some(c => c.finding === 'BLOCK')) return 'BLOCK';
  if (challenges.some(c => c.finding === 'WARNING')) return 'WARNING';
  return 'PASS';
}

// ─── Main X-Ray entry point ──────────────────────────────────────────────────

export function runXRay(input: {
  reasoning: CaseReasoning | ReconciledCaseReasoning;
  authorityFindings?: AuthorityFinding[];
  evidence?: EvidenceAnalysisResult;
  /** Optional independent worker for AI-assisted review. */
  worker?: XRayWorker;
  now?: string;
}): XRayResult {
  resetCounters();
  const { reasoning, authorityFindings, evidence, now: timestamp } = input;
  const ts = timestamp ?? new Date().toISOString();

  // Handle both CaseReasoning and ReconciledCaseReasoning
  const issues = 'reconciledIssues' in reasoning ? reasoning.reconciledIssues : reasoning.detectedIssues;
  const deadlines = 'reconciledDeadlines' in reasoning ? reasoning.reconciledDeadlines : reasoning.deadlines;

  const findings: XRayFinding[] = [];
  const changes: string[] = [];

  for (const issue of issues) {
    const challenges: XRayChallenge[] = [];

    // Generate deterministic challenges
    challenges.push(challengeAuthorityApplicability(issue, authorityFindings));
    challenges.push(challengeDocumentContradiction(issue, evidence?.conflicts));
    challenges.push(challengeDeadlineEstablished(issue, deadlines));
    challenges.push(challengeAlternativePath(issue));
    challenges.push(challengeFactSufficiency(issue, evidence?.gaps));
    challenges.push(challengeMissingException(issue));

    const finalVerdict = aggregateVerdict(challenges);

    const explanationEn = finalVerdict === 'BLOCK'
      ? 'This finding cannot be relied upon yet. We need to resolve the issues identified before proceeding.'
      : finalVerdict === 'WARNING'
        ? 'This finding looks reasonable but has some items to verify before we fully rely on it.'
        : 'This finding has been reviewed and looks solid.';

    const explanationEs = finalVerdict === 'BLOCK'
      ? 'Este hallazgo no se puede utilizar todavía. Necesitamos resolver los problemas identificados antes de continuar.'
      : finalVerdict === 'WARNING'
        ? 'Este hallazgo parece razonable pero tiene algunos elementos que verificar antes de depender completamente de él.'
        : 'Este hallazgo ha sido revisado y parece sólido.';

    findings.push({
      issueId: issue.id,
      issueType: issue.issueType,
      originalVerdict: issue.knowledgeState === 'UNKNOWN' || issue.knowledgeState === 'CONTRADICTORY' ? 'BLOCK' :
        issue.knowledgeState === 'REQUIRES_REVIEW' ? 'WARNING' : 'PASS',
      challenges,
      finalVerdict,
      reasoning: challenges.map(c => `${c.question} → ${c.finding}: ${c.reasoning}`).join(' '),
      userFacingExplanation: explanationEn,
      userFacingExplanationEs: explanationEs,
      blocksExecution: finalVerdict === 'BLOCK',
    });

    if (finalVerdict !== 'PASS') {
      changes.push(`Issue ${issue.issueType}: X-Ray verdict ${finalVerdict}`);
    }
  }

  // Overall verdict
  const overallVerdict: XRayVerdict =
    findings.some(f => f.finalVerdict === 'BLOCK') ? 'BLOCK' :
    findings.some(f => f.finalVerdict === 'WARNING') ? 'WARNING' : 'PASS';

  const safeToActUpon = overallVerdict === 'PASS';
  const requiresHumanReview = findings
    .filter(f => f.finalVerdict === 'WARNING' || f.finalVerdict === 'BLOCK')
    .map(f => f.userFacingExplanation);

  // Summary
  const passCount = findings.filter(f => f.finalVerdict === 'PASS').length;
  const warnCount = findings.filter(f => f.finalVerdict === 'WARNING').length;
  const blockCount = findings.filter(f => f.finalVerdict === 'BLOCK').length;

  let summary = '';
  if (blockCount > 0) {
    summary = `I reviewed everything and found ${blockCount} issue(s) that need to be resolved before we can safely proceed.`;
  } else if (warnCount > 0) {
    summary = `I reviewed everything. ${passCount} finding(s) look solid and ${warnCount} need verification.`;
  } else {
    summary = `I reviewed everything and it all looks solid.`;
  }

  return {
    findings,
    overallVerdict,
    safeToActUpon,
    requiresHumanReview,
    history: [
      ...(reasoning as ReconciledCaseReasoning).history ?? [{ step: 'reasoner', timestamp: ts, summary: 'Initial reasoning produced.', changes: [] }],
      { step: 'x_ray', timestamp: ts, summary: `X-Ray reviewed ${findings.length} finding(s): ${passCount} pass, ${warnCount} warning, ${blockCount} block.`, changes },
    ],
    userFacingSummary: summary,
  };
}
