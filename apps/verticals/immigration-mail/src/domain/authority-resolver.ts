/**
 * G4 — Authority Resolver Engine
 *
 * Takes CaseReasoning from G3 + AuthoritySources and produces
 * ReconciledCaseReasoning with authority findings.
 *
 * The resolver can:
 * - strengthen a finding (authority supports it)
 * - weaken a finding (authority partially undermines it)
 * - revise a finding (authority changes it)
 * - add uncertainty (authority is unclear or stale)
 * - add a missing fact (authority requires a fact not yet known)
 * - change candidate workflow (authority changes which workflow applies)
 * - BLOCK an unsupported conclusion (authority contradicts or is unavailable for a material issue)
 *
 * Does NOT silently overwrite reasoning. Preserves reasoning history/provenance.
 */

import type {
  AuthoritySource,
  AuthorityFinding,
  AuthorityReference,
  AuthorityEffect,
  VerificationStatus,
  ReconciledCaseReasoning,
  ReasoningHistoryEntry,
} from './authority';
import type { CaseReasoning, DetectedIssue, DeadlineFinding, CandidateWorkflow, RejectedWorkflow, MissingFact } from './case-reasoning';
import { isSafeStatus, assessFreshness, compareAuthorityLevel, AUTHORITY_LEVEL_RANK } from './authority';

// ─── ID counters ─────────────────────────────────────────────────────────────

let findingCounter = 0;
function findingId(): string { return `af-${++findingCounter}`; }

function resetCounters() { findingCounter = 0; }

// ─── Authority Matching ────────────────────────────────────────────────────
// Determine which authorities apply to which issues.

export interface AuthorityMatchInput {
  reasoning: CaseReasoning;
  authorities: AuthoritySource[];
  /** The agency involved in the case (e.g. USCIS, EOIR). */
  caseAgency: string;
  /** The jurisdiction (federal, state). */
  caseJurisdiction: string;
  /** Current date for freshness assessment. */
  now?: string;
}

// ─── Match an authority to an issue ────────────────────────────────────────

function matchAuthorityToIssue(
  issue: DetectedIssue,
  source: AuthoritySource,
  caseAgency: string,
  caseJurisdiction: string,
): AuthorityReference | null {
  // Agency mismatch — authority doesn't apply to this agency
  if (source.issuingAgency.toLowerCase() !== caseAgency.toLowerCase() &&
      source.issuingAgency.toLowerCase() !== 'general' &&
      caseAgency.toLowerCase() !== 'unknown') {
    return null;
  }

  // Jurisdiction mismatch
  if (source.jurisdiction !== caseJurisdiction && source.jurisdiction !== 'unknown') {
    return null;
  }

  // Check applicability conditions — if conditions exist, they must be plausible
  // For now, if there are conditions, mark as 'unclear' applicability
  const applicability: AuthorityReference['applicability'] =
    source.applicabilityConditions.length === 0
      ? 'direct'
      : 'unclear';

  // Determine rationale
  const rationale = applicability === 'direct'
    ? `${source.title} (${source.citation}) appears to directly apply to the ${issue.issueType} issue.`
    : `${source.title} (${source.citation}) may apply, but additional conditions must be verified: ${source.applicabilityConditions.join(', ')}.`;

  return {
    sourceId: source.id,
    citation: source.citation,
    authorityLevel: source.authorityLevel,
    verificationStatus: source.verificationStatus,
    applicability,
    rationale,
  };
}

// ─── Determine the effect of authority on a finding ────────────────────────

function determineEffect(
  issue: DetectedIssue,
  authorities: AuthorityReference[],
  sources: AuthoritySource[],
): { effect: AuthorityEffect; explanation: string; explanationEs: string; material: boolean; safe: boolean } {
  if (authorities.length === 0) {
    // No authority found — check if it's material
    const material = issue.confidence >= 0.6 && issue.knowledgeState !== 'UNKNOWN';
    return {
      effect: 'unchanged',
      explanation: material
        ? 'No specific authority was found to confirm or deny this finding. Proceed with caution.'
        : 'No authority was needed for this finding.',
      explanationEs: material
        ? 'No se encontró autoridad específica para confirmar o negar este hallazgo. Proceda con precaución.'
        : 'No se necesitaba autoridad para este hallazgo.',
      material,
      safe: !material,
    };
  }

  // Check verification statuses of matched authorities
  const statuses = authorities.map(a => a.verificationStatus);
  const allCurrent = statuses.every(s => s === 'verified_current');
  const anyBlocked = statuses.some(s => s === 'superseded' || s === 'unavailable' || s === 'conflicting');
  const anyStale = statuses.some(s => s === 'stale');
  const anyFuture = statuses.some(s => s === 'future_effective');
  const anyConditional = statuses.some(s => s === 'verified_conditional');
  const anyUnverified = statuses.some(s => s === 'unverified');

  // Check for conflicting applicability
  const hasInapplicable = authorities.some(a => a.applicability === 'inapplicable');
  const hasDirect = authorities.some(a => a.applicability === 'direct');

  // Check for authority level conflicts
  const levels = authorities.map(a => a.authorityLevel);
  const maxLevel = levels.reduce((max, l) => Math.max(max, AUTHORITY_LEVEL_RANK[l]), 0);

  // Conflicting sources
  if (statuses.includes('conflicting')) {
    return {
      effect: 'blocked',
      explanation: 'I found conflicting authority and don\'t want to guess. This needs to be resolved before proceeding.',
      explanationEs: 'Encontré información contradictoria y no quiero adivinar. Esto necesita resolverse antes de continuar.',
      material: true,
      safe: false,
    };
  }

  // Superseded or unavailable
  if (anyBlocked) {
    const blockedStatus = statuses.find(s => s === 'superseded' || s === 'unavailable');
    return {
      effect: 'blocked',
      explanation: blockedStatus === 'superseded'
        ? 'The authority that appeared to apply has been superseded. We need to find the current authority.'
        : 'The authority source could not be retrieved. We cannot safely proceed without it.',
      explanationEs: blockedStatus === 'superseded'
        ? 'La autoridad que parecía aplicar ha sido reemplazada. Necesitamos encontrar la autoridad actual.'
        : 'No se pudo recuperar la fuente de autoridad. No podemos proceder de forma segura sin ella.',
      material: true,
      safe: false,
    };
  }

  // Future effective
  if (anyFuture && !allCurrent) {
    return {
      effect: 'uncertainty_added',
      explanation: 'The authority that applies to your situation is not yet in effect. We need to verify whether the current or future authority applies based on your timeline.',
      explanationEs: 'La autoridad que aplica a su situación aún no está en vigor. Necesitamos verificar si aplica la autoridad actual o la futura según su línea de tiempo.',
      material: true,
      safe: false,
    };
  }

  // All current and direct
  if (allCurrent && hasDirect) {
    return {
      effect: 'strengthened',
      explanation: 'I checked the current official guidance that appears to apply to your situation, and it supports this finding.',
      explanationEs: 'Revisé la guía oficial actual que parece aplicar a su situación, y respalda este hallazgo.',
      material: false,
      safe: true,
    };
  }

  // Conditional
  if (anyConditional) {
    return {
      effect: 'uncertainty_added',
      explanation: 'I found a rule that may apply, but I need one more detail before I can safely tell you what it means.',
      explanationEs: 'Encontré una regla que podría aplicar, pero necesito un detalle más antes de poder decirle con seguridad qué significa.',
      material: true,
      safe: false,
    };
  }

  // Stale
  if (anyStale) {
    return {
      effect: 'weakened',
      explanation: 'The authority I found may be outdated. I need to verify the current version before relying on it.',
      explanationEs: 'La autoridad que encontré puede estar desactualizada. Necesito verificar la versión actual antes de depender de ella.',
      material: true,
      safe: false,
    };
  }

  // Unverified
  if (anyUnverified) {
    return {
      effect: 'uncertainty_added',
      explanation: 'This authority has not been verified for current applicability. I need to confirm it before proceeding.',
      explanationEs: 'Esta autoridad no ha sido verificada para su aplicabilidad actual. Necesito confirmarla antes de continuar.',
      material: true,
      safe: false,
    };
  }

  return {
    effect: 'unchanged',
    explanation: 'The authority was reviewed and does not change this finding.',
    explanationEs: 'Se revisó la autoridad y no cambia este hallazgo.',
    material: false,
    safe: true,
  };
}

// ─── Resolve authority against case reasoning ──────────────────────────────

export function resolveAuthority(input: AuthorityMatchInput): ReconciledCaseReasoning {
  resetCounters();
  const { reasoning, authorities, caseAgency, caseJurisdiction } = input;
  const now = input.now ?? new Date().toISOString();

  // Assess freshness of all sources
  const assessedSources = authorities.map(a => ({
    ...a,
    verificationStatus: a.verificationStatus !== 'unverified' ? a.verificationStatus : assessFreshness(a, now),
  }));

  const authorityFindings: AuthorityFinding[] = [];
  const history: ReasoningHistoryEntry[] = [];
  const changes: string[] = [];

  // Process each detected issue
  for (const issue of reasoning.detectedIssues) {
    // Find matching authorities
    const matches: AuthorityReference[] = [];
    for (const source of assessedSources) {
      const ref = matchAuthorityToIssue(issue, source, caseAgency, caseJurisdiction);
      if (ref) matches.push(ref);
    }

    if (matches.length === 0 && issue.issueType === 'unknown') {
      // Skip authority resolution for unknown issues
      continue;
    }

    const { effect, explanation, explanationEs, material, safe } = determineEffect(
      issue,
      matches,
      assessedSources,
    );

    authorityFindings.push({
      id: findingId(),
      issueId: issue.id,
      authorities: matches,
      effect,
      explanation,
      explanationEs,
      safeToActUpon: safe,
      material,
    });

    if (effect !== 'unchanged') {
      changes.push(`Issue ${issue.issueType}: ${effect} — ${explanation}`);
    }
  }

  // ── Reconcile issues ──
  const reconciledIssues: DetectedIssue[] = reasoning.detectedIssues.map(issue => {
    const finding = authorityFindings.find(f => f.issueId === issue.id);
    if (!finding) return issue;

    const reconciled = { ...issue };

    if (finding.effect === 'strengthened') {
      // Increase confidence but cap at 0.95
      reconciled.confidence = Math.min(0.95, issue.confidence + 0.1);
    } else if (finding.effect === 'weakened') {
      // Decrease confidence
      reconciled.confidence = Math.max(0.2, issue.confidence - 0.2);
      if (issue.knowledgeState === 'KNOWN') {
        reconciled.knowledgeState = 'SUPPORTED';
      }
    } else if (finding.effect === 'uncertainty_added') {
      // Add uncertainty
      if (issue.knowledgeState === 'KNOWN' || issue.knowledgeState === 'SUPPORTED') {
        reconciled.knowledgeState = 'REQUIRES_REVIEW';
      }
    } else if (finding.effect === 'blocked') {
      // Block — set to REQUIRES_REVIEW and reduce confidence
      reconciled.knowledgeState = 'REQUIRES_REVIEW';
      reconciled.confidence = Math.max(0.1, issue.confidence - 0.3);
    } else if (finding.effect === 'revised') {
      // Revised — mark for review
      reconciled.knowledgeState = 'REQUIRES_REVIEW';
    }

    return reconciled;
  });

  // ── Reconcile deadlines ──
  const reconciledDeadlines: DeadlineFinding[] = reasoning.deadlines.map(dl => {
    // Check if any authority finding relates to this deadline
    const deadlineIssue = reconciledIssues.find(i => i.issueType === 'deadline');
    const deadlineFinding = deadlineIssue
      ? authorityFindings.find(f => f.issueId === deadlineIssue.id)
      : null;

    if (deadlineFinding && deadlineFinding.effect === 'blocked') {
      return { ...dl, requiresConfirmation: true, confidence: Math.max(0.1, dl.confidence - 0.2) };
    }
    if (deadlineFinding && deadlineFinding.effect === 'weakened') {
      return { ...dl, confidence: Math.max(0.2, dl.confidence - 0.15) };
    }
    return dl;
  });

  // ── Reconcile candidate workflows ──
  let reconciledCandidates: CandidateWorkflow[] = [...reasoning.candidateWorkflows];
  const reconciledRejections: RejectedWorkflow[] = [...reasoning.incompatibleWorkflows];

  // If any blocked authority finding affects a workflow candidate
  for (const finding of authorityFindings) {
    if (finding.effect === 'blocked' && finding.material) {
      const issue = reasoning.detectedIssues.find(i => i.id === finding.issueId);
      if (issue) {
        // Remove candidates that depend on blocked issues
        reconciledCandidates = reconciledCandidates.filter(c =>
          !c.evidence.some(e => e.factKey === issue.issueType)
        );
        // Add rejection
        reconciledRejections.push({
          userFacingTitle: 'Proceed with this action',
          reason: 'The authority needed to support this action is unavailable, superseded, or conflicting. We need to resolve this before proceeding.',
        });
        changes.push(`Workflow candidate removed due to blocked authority: ${finding.explanation}`);
      }
    }
  }

  // ── Overall safety ──
  const hasBlockedFindings = authorityFindings.some(f => !f.safeToActUpon && f.material);
  const hasReconciledUncertainty = reconciledIssues.some(i => i.knowledgeState === 'REQUIRES_REVIEW' && !reasoning.detectedIssues.find(o => o.id === i.id && o.knowledgeState === 'REQUIRES_REVIEW'));
  const safeToActUpon = reasoning.safeToActUpon && !hasBlockedFindings;

  // ── User-facing summary ──
  const strengthenedCount = authorityFindings.filter(f => f.effect === 'strengthened').length;
  const blockedCount = authorityFindings.filter(f => f.effect === 'blocked').length;
  const uncertainCount = authorityFindings.filter(f => f.effect === 'uncertainty_added' || f.effect === 'weakened').length;

  let summaryEn = reasoning.userFacingSummary;
  let summaryEs = reasoning.userFacingSummaryEs;

  if (blockedCount > 0) {
    summaryEn = `${summaryEn} I found ${blockedCount} issue(s) where the authority is not available or conflicts — we need to resolve these before proceeding.`;
    if (summaryEs) {
      summaryEs = `${summaryEs} Encontré ${blockedCount} problema(s) donde la autoridad no está disponible o entra en conflicto — necesitamos resolverlos antes de continuar.`;
    }
  } else if (uncertainCount > 0) {
    summaryEn = `${summaryEn} I checked the relevant authority and found ${uncertainCount} item(s) that need verification before we can be sure.`;
    if (summaryEs) {
      summaryEs = `${summaryEs} Revisé la autoridad relevante y encontré ${uncertainCount} elemento(s) que necesitan verificación antes de estar seguros.`;
    }
  } else if (strengthenedCount > 0) {
    summaryEn = `${summaryEn} I confirmed ${strengthenedCount} finding(s) against current official authority.`;
    if (summaryEs) {
      summaryEs = `${summaryEs} Confirmé ${strengthenedCount} hallazgo(s) contra la autoridad oficial actual.`;
    }
  }

  // ── History ──
  history.push({
    step: 'reasoner',
    timestamp: now,
    summary: 'G3 reasoner produced initial findings.',
    changes: [],
  });
  history.push({
    step: 'authority_resolution',
    timestamp: now,
    summary: `Authority resolver processed ${authorityFindings.length} finding(s).`,
    changes,
  });

  return {
    original: reasoning,
    authorityFindings,
    reconciledIssues,
    reconciledDeadlines,
    reconciledCandidates,
    reconciledRejections,
    safeToActUpon,
    userFacingSummary: summaryEn,
    userFacingSummaryEs: summaryEs,
    history,
  };
}

// ─── Model Disagreement ──────────────────────────────────────────────────────
// Represent disagreement between multiple model providers on authority.

export interface ModelDisagreement {
  topic: string;
  positionA: { provider: string; model: string; position: string; confidence: number };
  positionB: { provider: string; model: string; position: string; confidence: number };
  resolution: 'A' | 'B' | 'both_correct' | 'both_wrong' | 'unresolved' | 'needs_human_review';
  explanation: string;
}

export function representDisagreement(
  topic: string,
  posA: ModelDisagreement['positionA'],
  posB: ModelDisagreement['positionB'],
): ModelDisagreement {
  // If both agree, both correct
  if (posA.position === posB.position) {
    return {
      topic,
      positionA: posA,
      positionB: posB,
      resolution: 'both_correct',
      explanation: 'Both models agree on this point.',
    };
  }

  // If confidence differs significantly, the higher-confidence one may be correct
  const confDiff = Math.abs(posA.confidence - posB.confidence);
  if (confDiff > 0.3) {
    return {
      topic,
      positionA: posA,
      positionB: posB,
      resolution: posA.confidence > posB.confidence ? 'A' : 'B',
      explanation: 'Models disagree. The higher-confidence position is provisionally preferred, but human review is recommended.',
    };
  }

  // Low confidence disagreement — needs human review
  return {
    topic,
    positionA: posA,
    positionB: posB,
    resolution: 'needs_human_review',
    explanation: 'Models disagree with similar confidence. Human review is required before proceeding.',
  };
}
