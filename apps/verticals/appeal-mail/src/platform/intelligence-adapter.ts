/**
 * Platform Intelligence Adapter
 *
 * Bridges mailmypdf-platform intelligence primitives with Appeal Mail's
 * existing domain models. This is NOT a replacement of Appeal Mail's
 * stress test or review engine — it's a layer that adds the platform's
 * evidence evaluation, contradiction detection, and case assessment
 * capabilities on top of existing Appeal Mail functionality.
 */

import type { AppealGround } from "@/domain/ground";
import type { Evidence } from "@/domain/evidence";
import type { Decision } from "@/domain/decision";
import type { XRayFinding } from "@/domain/xray";
import type { StressTestResult } from "@/domain/stress-test";
import {
  type EvidenceItem,
  type EvidencePacket,
  type EvidenceEvaluation,
  type ContradictionRecord,
  type CaseAssessment,
  type ReadinessCheckResult,
  type ReadinessResult,
  type RecommendedAction,
  type FactInput,
  createEvidence,
  createEvidencePacket,
  evaluateEvidence,
  detectContradictions,
  sortBySeverity,
  unresolvedContradictions,
  criticalContradictions,
  computeReadiness,
  createReadinessCheck,
  ALL_EVIDENCE_RELATIONS,
} from "@/lib/platform/intelligence";

// ── Convert Appeal Mail evidence to platform evidence items ──────────────────

export function appealEvidenceToPlatform(
  evidence: Evidence[],
  grounds: AppealGround[],
): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  for (const ev of evidence) {
    for (const groundId of ev.groundIds) {
      const ground = grounds.find((g) => g.id === groundId);
      if (!ground) continue;

      // Determine relation based on evidence context
      const relation: "supports" | "contradicts" | "qualifies" =
        ev.type === "excerpt" ? "qualifies" : "supports";

      items.push(createEvidence({
        claimId: groundId,
        relation,
        evidenceType: "document",
        evidenceId: ev.documentId || ev.id,
        explanation: ev.excerpt || ev.label,
        provenance: {
          level: ev.uploadedAt ? "document_extracted" : "user_provided",
          sourceRefs: ev.documentId ? [{
            documentId: ev.documentId,
            documentName: ev.documentFilename || ev.label,
            page: ev.pageRef ? parseInt(ev.pageRef, 10) || undefined : undefined,
            excerpt: ev.excerpt,
          }] : undefined,
        },
        confidence: ground.confidence,
      }));
    }
  }

  return items;
}

// ── Convert decision facts to platform facts for contradiction detection ──────

export function decisionFactsToPlatformFacts(decision: Decision): FactInput[] {
  const facts: FactInput[] = [];

  for (const fact of decision.facts) {
    facts.push({
      id: fact.id,
      subject: decision.agency || "decision",
      predicate: fact.label.toLowerCase().replace(/\s+/g, "_"),
      value: fact.value,
    });
  }

  // Add deadline as a fact
  if (decision.deadline?.date) {
    facts.push({
      id: "deadline",
      subject: decision.agency || "decision",
      predicate: "has_deadline",
      value: decision.deadline.date,
    });
  }

  // Add decision date as a fact
  if (decision.decisionDate) {
    facts.push({
      id: "decision_date",
      subject: decision.agency || "decision",
      predicate: "decision_date",
      value: decision.decisionDate,
    });
  }

  return facts;
}

// ── Evaluate evidence for each ground using platform engine ─────────────────

export function evaluateGroundEvidence(
  evidence: Evidence[],
  grounds: AppealGround[],
): Map<string, EvidenceEvaluation> {
  const platformEvidence = appealEvidenceToPlatform(evidence, grounds);
  const evaluations = new Map<string, EvidenceEvaluation>();

  for (const ground of grounds) {
    const groundItems = platformEvidence.filter((e) => e.claimId === ground.id);
    const packet = createEvidencePacket(ground.id, groundItems);
    const evaluation = evaluateEvidence(packet);
    evaluations.set(ground.id, evaluation);
  }

  return evaluations;
}

// ── Detect contradictions using platform engine ──────────────────────────────

export function detectDecisionContradictions(decision: Decision): ContradictionRecord[] {
  const facts = decisionFactsToPlatformFacts(decision);
  const contradictions = detectContradictions(facts);
  return sortBySeverity(contradictions);
}

// ── Detect cross-document contradictions from X-Ray findings ──────────────────

export function xrayFindingsToContradictions(
  findings: XRayFinding[],
): ContradictionRecord[] {
  return findings
    .filter((f) => f.type === "contradiction" || f.type === "date_conflict")
    .map((f) => {
      const severity = f.confidence === "high" ? "critical" : f.confidence === "medium" ? "major" : "minor";
      const factA = f.claims[0];
      const factB = f.claims[1];

      return {
        id: f.id,
        factAId: factA?.source.documentId || "unknown",
        factBId: factB?.source.documentId || "unknown",
        conflictSubject: f.title,
        conflictPredicate: f.type,
        factAValue: factA?.text || "",
        factBValue: factB?.text || "",
        severity,
        detectionType: f.type === "date_conflict" ? "confirmed" as const : "potential" as const,
        reviewStatus: f.status === "dismissed" ? "resolved" as const : "unreviewed" as const,
        explanation: f.description,
        provenance: {
          level: "document_extracted" as const,
          sourceRefs: f.sources,
          verified: false,
          createdAt: f.createdAt,
          updatedAt: f.createdAt,
        },
        confidence: f.confidence === "high" ? 0.9 : f.confidence === "medium" ? 0.6 : 0.3,
        verified: f.status === "confirmed",
        createdAt: f.createdAt,
        updatedAt: f.createdAt,
      } as ContradictionRecord;
    });
}

// ── Build case assessment from stress test result ────────────────────────────

export function buildCaseAssessment(
  stressTest: StressTestResult,
  evidence: Evidence[],
  grounds: AppealGround[],
  contradictions: ContradictionRecord[],
): CaseAssessment {
  const checks: ReadinessCheckResult[] = [];

  // Grounds check
  checks.push(createReadinessCheck({
    id: "grounds_present",
    label: "Appeal grounds established",
    description: "At least one appeal ground has been defined.",
    status: grounds.length === 0 ? "fail" : "pass",
    detail: grounds.length === 0 ? "No appeal grounds defined." : `${grounds.length} ground(s) defined.`,
  }));

  // Evidence check
  checks.push(createReadinessCheck({
    id: "evidence_attached",
    label: "Evidence attached",
    description: "At least one piece of evidence has been attached.",
    status: evidence.length === 0 ? "warning" : "pass",
    detail: evidence.length === 0 ? "No evidence attached." : `${evidence.length} item(s) attached.`,
  }));

  // Contradiction check (from platform)
  const unresolvedContras = unresolvedContradictions(contradictions);
  const criticalContras = criticalContradictions(unresolvedContras);
  checks.push(createReadinessCheck({
    id: "contradictions",
    label: "No unresolved contradictions",
    description: "All contradictions have been reviewed or resolved.",
    status: criticalContras.length > 0 ? "fail" : unresolvedContras.length > 0 ? "warning" : "pass",
    detail: criticalContras.length > 0
      ? `${criticalContras.length} critical contradiction(s) unresolved.`
      : unresolvedContras.length > 0
      ? `${unresolvedContras.length} contradiction(s) need review.`
      : "No unresolved contradictions.",
  }));

  // Stress test overall score check
  checks.push(createReadinessCheck({
    id: "stress_test_score",
    label: "Stress test score",
    description: "Stress test overall score is above threshold.",
    status: stressTest.summary.overallScore < 40 ? "fail" : stressTest.summary.overallScore < 60 ? "warning" : "pass",
    detail: `Overall score: ${stressTest.summary.overallScore}/100.`,
  }));

  // Vulnerable grounds check
  checks.push(createReadinessCheck({
    id: "vulnerable_grounds",
    label: "No vulnerable grounds",
    description: "All grounds are well-supported or need only clarification.",
    status: stressTest.summary.vulnerable > 0 ? "warning" : "pass",
    detail: stressTest.summary.vulnerable > 0
      ? `${stressTest.summary.vulnerable} ground(s) are potentially vulnerable.`
      : "No vulnerable grounds detected.",
  }));

  // Draft vulnerabilities check
  checks.push(createReadinessCheck({
    id: "draft_vulnerabilities",
    label: "No draft vulnerabilities",
    description: "No unaddressed vulnerabilities in the appeal draft.",
    status: stressTest.draftVulnerabilities.filter((v) => v.status === "pending").length > 0 ? "warning" : "pass",
    detail: `${stressTest.draftVulnerabilities.filter((v) => v.status === "pending").length} pending vulnerability(ies).`,
  }));

  const readiness = computeReadiness(checks);

  // Recommended actions from stress test findings
  const actions: RecommendedAction[] = [];

  // Critical attacks → high priority actions
  for (const attack of stressTest.groundAttacks.filter((a) => a.severity === "critical" && a.status === "open")) {
    actions.push({
      id: crypto.randomUUID(),
      actionType: "mitigate_attack",
      priority: "critical",
      description: `Counter the challenge: "${attack.challenge.slice(0, 200)}"`,
      expectedOutcome: attack.whatWouldDefeat,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Weakest link → action
  if (stressTest.weakestLink) {
    actions.push({
      id: crypto.randomUUID(),
      actionType: "fix_weakest_link",
      priority: stressTest.weakestLink.severity === "critical" ? "critical" : "high",
      description: stressTest.weakestLink.description,
      expectedOutcome: `Fix: ${stressTest.weakestLink.fixAction}`,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Critical contradictions → actions
  for (const contra of criticalContras) {
    actions.push({
      id: crypto.randomUUID(),
      actionType: "resolve_contradiction",
      priority: "critical",
      description: `Resolve contradiction: ${contra.conflictSubject} (${contra.factAValue} vs ${contra.factBValue})`,
      expectedOutcome: "Determine which value is correct and update the record.",
      status: "pending",
      relatedContradictionIds: [contra.id],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Summary
  const status = readiness.ready
    ? "ready"
    : criticalContras.length > 0 || stressTest.summary.overallScore < 40
    ? "action_required"
    : "in_review";

  const summary = readiness.ready
    ? "Case is ready to proceed."
    : `${actions.filter((a) => a.priority === "critical").length} critical action(s) required before proceeding.`;

  return {
    status,
    readiness,
    recommendedActions: actions,
    summary,
    assessedAt: new Date().toISOString(),
  };
}

// ── Enhanced stress test: run existing stress test + platform intelligence ──

export interface EnhancedStressTestResult extends StressTestResult {
  /** Platform-derived evidence evaluations per ground */
  evidenceEvaluations: Map<string, EvidenceEvaluation>;
  /** Platform-detected contradictions */
  contradictions: ContradictionRecord[];
  /** Platform-derived case assessment */
  caseAssessment: CaseAssessment;
}

export function enhanceStressTestResult(
  stressTest: StressTestResult,
  evidence: Evidence[],
  grounds: AppealGround[],
  decision: Decision,
  xrayFindings: XRayFinding[],
): EnhancedStressTestResult {
  // Platform evidence evaluation
  const evidenceEvaluations = evaluateGroundEvidence(evidence, grounds);

  // Platform contradiction detection
  const decisionContradictions = detectDecisionContradictions(decision);
  const xrayContradictions = xrayFindingsToContradictions(xrayFindings);
  const contradictions = sortBySeverity([...decisionContradictions, ...xrayContradictions]);

  // Platform case assessment
  const caseAssessment = buildCaseAssessment(stressTest, evidence, grounds, contradictions);

  return {
    ...stressTest,
    evidenceEvaluations,
    contradictions,
    caseAssessment,
  };
}
