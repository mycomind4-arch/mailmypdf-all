/* ═══════════════════════════════════════════════════════════
   APPEAL STRATEGY — generates a defensible response strategy
   based on the analyzed case. Adapted to gold-standard parity
   with Notice Respond's response strategy module.

   The strategy explains:
   - strongest grounds and why
   - weaker grounds and why
   - evidence supporting each ground
   - missing evidence
   - recommended organization
   - important risks
   - unresolved questions

   The strategy does NOT blindly argue every possible issue.
   It prioritizes grounds based on evidence strength and risk.

   ═══════════════════════════════════════════════════════════ */

import type { Decision } from "./decision";
import type { AppealGround } from "./ground";
import type { Evidence } from "./evidence";
import type { XRayFinding } from "./xray";
import type { StressTestResult, GroundStrengthProfile } from "./stress-test";
import { evidenceForGround, unsupportedGrounds } from "./evidence";

// ── Types ────────────────────────────────────────────────────

export interface GroundStrategy {
  groundId: string;
  groundType: string;
  claim: string;
  priority: "primary" | "secondary" | "supporting";
  evidenceCount: number;
  evidenceLabels: string[];
  hasGaps: boolean;
  gapDescription: string;
  strengthScore: number;
  recommendedAction: string;
}

export interface AppealStrategy {
  grounds: GroundStrategy[];
  strongestGrounds: string[];
  weakerGrounds: string[];
  evidenceGaps: { groundId: string; description: string }[];
  recommendedOrganization: string[];
  risks: { description: string; severity: "high" | "medium" | "low" }[];
  unresolvedQuestions: string[];
  overallAssessment: string;
  recommendedLength: string;
}

// ── Strategy Generation ───────────────────────────────────────

export function generateStrategy(
  decision: Decision,
  grounds: AppealGround[],
  evidence: Evidence[],
  xrayFindings: XRayFinding[],
  stressTest: StressTestResult | null,
): AppealStrategy {
  const groundStrategies: GroundStrategy[] = [];

  // Get strength profiles from stress test if available
  const strengthMap = new Map<string, GroundStrengthProfile>();
  if (stressTest?.strengthProfiles) {
    for (const profile of stressTest.strengthProfiles) {
      strengthMap.set(profile.groundId, profile);
    }
  }

  // Build strategy for each ground
  for (const ground of grounds) {
    const supportingEvidence = evidenceForGround(evidence, ground.id);
    const hasGaps = supportingEvidence.length === 0;
    const strengthProfile = strengthMap.get(ground.id);
    const strengthScore = strengthProfile?.score ?? ground.confidence * 100;

    let priority: GroundStrategy["priority"] = "supporting";
    if (strengthScore >= 70) priority = "primary";
    else if (strengthScore >= 40) priority = "secondary";

    groundStrategies.push({
      groundId: ground.id,
      groundType: ground.type,
      claim: ground.claim,
      priority,
      evidenceCount: supportingEvidence.length,
      evidenceLabels: supportingEvidence.map((e) => e.label),
      hasGaps,
      gapDescription: hasGaps
        ? "No supporting evidence linked to this ground. Evidence is needed before this argument can be made."
        : "",
      strengthScore,
      recommendedAction: hasGaps
        ? "Add supporting evidence before including in the appeal."
        : strengthScore < 40
        ? "Consider strengthening this ground with additional evidence or clarification."
        : "Include in the appeal with current evidence.",
    });
  }

  // Identify strongest and weaker grounds
  const sorted = [...groundStrategies].sort((a, b) => b.strengthScore - a.strengthScore);
  const strongestGrounds = sorted.filter((g) => g.priority === "primary").map((g) => g.groundId);
  const weakerGrounds = sorted.filter((g) => g.priority !== "primary").map((g) => g.groundId);

  // Evidence gaps
  const evidenceGaps = groundStrategies
    .filter((g) => g.hasGaps)
    .map((g) => ({
      groundId: g.groundId,
      description: g.gapDescription,
    }));

  // Also check for missing evidence from X-Ray findings
  for (const finding of xrayFindings) {
    if (finding.type === "missing_reference") {
      evidenceGaps.push({
        groundId: finding.suggestedGroundType || "general",
        description: `Missing document: ${finding.title}. ${finding.description}`,
      });
    }
  }

  // Recommended organization — strongest grounds first
  const recommendedOrganization = [
    `1. State what is being appealed and reference the denial (claim #, date, insurer)`,
    ...sorted
      .filter((g) => g.priority === "primary" && !g.hasGaps)
      .map((g, i) => `${i + 2}. Primary argument: ${g.claim}`),
    ...sorted
      .filter((g) => g.priority === "secondary" && !g.hasGaps)
      .map((g, i) => `${i + sorted.filter((s) => s.priority === "primary" && !s.hasGaps).length + 2}. Supporting argument: ${g.claim}`),
    `${sorted.filter((g) => !g.hasGaps).length + 2}. List enclosed evidence as exhibits`,
    `${sorted.filter((g) => !g.hasGaps).length + 3}. State requested action (reconsider, reverse, approve)`,
    `${sorted.filter((g) => !g.hasGaps).length + 4}. Closing and signature`,
  ];

  // Risks
  const risks: { description: string; severity: "high" | "medium" | "low" }[] = [];

  // Deadline risk
  if (!decision.deadline?.date) {
    risks.push({
      description: "No appeal deadline was extracted from the denial letter. Verify the deadline manually — missing it may forfeit appeal rights.",
      severity: "high",
    });
  }

  // Missing evidence risk
  const unsupportedGaps = unsupportedGrounds(evidence, grounds.map((g) => g.id));
  if (unsupportedGaps.length > 0) {
    risks.push({
      description: `${unsupportedGaps.length} ground(s) have no supporting evidence. Arguments without evidence are likely to fail.`,
      severity: "medium",
    });
  }

  // Low confidence risk
  const lowConfidence = grounds.filter((g) => g.confidence < 0.3);
  if (lowConfidence.length > 0) {
    risks.push({
      description: `${lowConfidence.length} ground(s) have low confidence scores. Consider whether these arguments help or hurt the appeal.`,
      severity: "low",
    });
  }

  // Stress test weakest link
  if (stressTest?.weakestLink) {
    risks.push({
      description: stressTest.weakestLink.description,
      severity: "medium",
    });
  }

  // Unresolved questions
  const unresolvedQuestions: string[] = [];
  if (!decision.referenceNumber) {
    unresolvedQuestions.push("The claim/case number was not extracted from the denial letter. Add it manually.");
  }
  if (!decision.agency) {
    unresolvedQuestions.push("The insurer/agency name was not extracted. Add it manually.");
  }
  for (const ground of grounds) {
    if (ground.unresolvedIssue) {
      unresolvedQuestions.push(ground.unresolvedIssue);
    }
  }

  // Overall assessment
  const totalGrounds = grounds.length;
  const strongGrounds = strongestGrounds.length;
  const totalGaps = evidenceGaps.length;

  let overallAssessment: string;
  if (totalGrounds === 0) {
    overallAssessment = "No appeal grounds have been identified yet. Upload supporting documents to analyze the denial and identify potential grounds.";
  } else if (strongGrounds === 0 && totalGrounds > 0) {
    overallAssessment = `${totalGrounds} ground(s) identified but none are well-supported. Focus on gathering evidence before drafting the appeal.`;
  } else if (totalGaps > 0) {
    overallAssessment = `${totalGrounds} ground(s) identified, ${strongGrounds} well-supported. ${totalGaps} ground(s) have evidence gaps that should be addressed before mailing.`;
  } else {
    overallAssessment = `${totalGrounds} ground(s) identified, ${strongGrounds} well-supported. The appeal is ready for drafting with the current evidence.`;
  }

  // Recommended length
  const recommendedLength = totalGrounds <= 2
    ? "1–2 pages"
    : totalGrounds <= 4
    ? "2–3 pages"
    : "3–5 pages";

  return {
    grounds: groundStrategies,
    strongestGrounds,
    weakerGrounds,
    evidenceGaps,
    recommendedOrganization,
    risks,
    unresolvedQuestions,
    overallAssessment,
    recommendedLength,
  };
}
