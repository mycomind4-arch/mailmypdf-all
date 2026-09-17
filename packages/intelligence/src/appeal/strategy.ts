import type { Decision } from "./decision.js";
import type { AppealGround } from "./ground.js";
import type { Evidence } from "./evidence.js";
import { evidenceForGround, unsupportedGrounds } from "./evidence.js";
import type { XRayFinding } from "./xray.js";
import type { GroundStrengthProfile, StressTestResult } from "./stress-test.js";

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
  evidenceGaps: Array<{ groundId: string; description: string }>;
  recommendedOrganization: string[];
  risks: Array<{ description: string; severity: "high" | "medium" | "low" }>;
  unresolvedQuestions: string[];
  overallAssessment: string;
  recommendedLength: string;
}

function profileMap(stressTest: StressTestResult | null): Map<string, GroundStrengthProfile> {
  const map = new Map<string, GroundStrengthProfile>();
  for (const profile of stressTest?.strengthProfiles ?? []) map.set(profile.groundId, profile);
  return map;
}

export function generateStrategy(
  decision: Decision,
  grounds: AppealGround[],
  evidence: Evidence[],
  xrayFindings: XRayFinding[],
  stressTest: StressTestResult | null,
): AppealStrategy {
  const profiles = profileMap(stressTest);
  const groundStrategies = grounds.map<GroundStrategy>((ground) => {
    const supportingEvidence = evidenceForGround(evidence, ground.id);
    const strengthScore = profiles.get(ground.id)?.score ?? Math.round(ground.confidence * 100);
    const hasGaps = supportingEvidence.length === 0;
    const priority: GroundStrategy["priority"] = strengthScore >= 70 ? "primary" : strengthScore >= 40 ? "secondary" : "supporting";
    return {
      groundId: ground.id,
      groundType: ground.type,
      claim: ground.claim,
      priority,
      evidenceCount: supportingEvidence.length,
      evidenceLabels: supportingEvidence.map((item) => item.label),
      hasGaps,
      gapDescription: hasGaps ? "No supporting evidence is linked to this ground." : "",
      strengthScore,
      recommendedAction: hasGaps
        ? "Add or verify supporting evidence before relying on this ground."
        : strengthScore < 40
          ? "Narrow, clarify, or strengthen this ground before drafting."
          : "Use this ground with specific record citations.",
    };
  });

  const sorted = [...groundStrategies].sort((left, right) => right.strengthScore - left.strengthScore);
  const strongestGrounds = sorted.filter((ground) => ground.priority === "primary").map((ground) => ground.groundId);
  const weakerGrounds = sorted.filter((ground) => ground.priority !== "primary").map((ground) => ground.groundId);
  const evidenceGaps = groundStrategies
    .filter((ground) => ground.hasGaps)
    .map((ground) => ({ groundId: ground.groundId, description: ground.gapDescription }));

  for (const finding of xrayFindings) {
    if (finding.type !== "missing_reference") continue;
    evidenceGaps.push({
      groundId: finding.suggestedGroundType ?? "general",
      description: `Missing document: ${finding.title}. ${finding.description}`,
    });
  }

  const usablePrimary = sorted.filter((ground) => ground.priority === "primary" && !ground.hasGaps);
  const usableSecondary = sorted.filter((ground) => ground.priority === "secondary" && !ground.hasGaps);
  const recommendedOrganization = [
    "1. Identify the decision being appealed, reference number, date, and decision-maker",
    ...usablePrimary.map((ground, index) => `${index + 2}. Primary ground: ${ground.claim}`),
    ...usableSecondary.map((ground, index) => `${index + usablePrimary.length + 2}. Supporting ground: ${ground.claim}`),
    `${usablePrimary.length + usableSecondary.length + 2}. Identify and cite the supporting exhibits`,
    `${usablePrimary.length + usableSecondary.length + 3}. State the requested action or remedy`,
    `${usablePrimary.length + usableSecondary.length + 4}. Close with signature and required contact information`,
  ];

  const risks: AppealStrategy["risks"] = [];
  if (!decision.deadline?.date) {
    risks.push({ description: "No appeal deadline has been verified. Confirm the controlling deadline before submission.", severity: "high" });
  }
  const unsupported = unsupportedGrounds(evidence, grounds.map((ground) => ground.id));
  if (unsupported.length > 0) {
    risks.push({ description: `${unsupported.length} ground(s) have no linked supporting evidence.`, severity: "medium" });
  }
  const lowConfidence = grounds.filter((ground) => ground.confidence < 0.3);
  if (lowConfidence.length > 0) {
    risks.push({ description: `${lowConfidence.length} ground(s) have low confidence and should be verified before inclusion.`, severity: "low" });
  }
  if (stressTest?.weakestLink) {
    risks.push({ description: stressTest.weakestLink.description, severity: stressTest.weakestLink.severity === "critical" ? "high" : "medium" });
  }

  const unresolvedQuestions: string[] = [];
  if (!decision.referenceNumber) unresolvedQuestions.push("The claim or case reference number has not been verified.");
  if (!decision.agency) unresolvedQuestions.push("The decision-maker or agency has not been verified.");
  if (!decision.decisionDate) unresolvedQuestions.push("The decision date has not been verified.");
  for (const ground of grounds) if (ground.unresolvedIssue) unresolvedQuestions.push(ground.unresolvedIssue);

  let overallAssessment: string;
  if (grounds.length === 0) {
    overallAssessment = "No appeal grounds have been identified yet. Additional analysis is required before drafting.";
  } else if (strongestGrounds.length === 0) {
    overallAssessment = `${grounds.length} ground(s) are identified, but none currently score as primary. Strengthen the record before relying on them.`;
  } else if (evidenceGaps.length > 0) {
    overallAssessment = `${grounds.length} ground(s) are identified and ${strongestGrounds.length} currently score as primary. Resolve ${evidenceGaps.length} evidence gap(s) before finalizing.`;
  } else {
    overallAssessment = `${grounds.length} ground(s) are identified and ${strongestGrounds.length} currently score as primary. The record is positioned for drafting, subject to final verification.`;
  }

  return {
    grounds: groundStrategies,
    strongestGrounds,
    weakerGrounds,
    evidenceGaps,
    recommendedOrganization,
    risks,
    unresolvedQuestions,
    overallAssessment,
    recommendedLength: grounds.length <= 2 ? "1–2 pages" : grounds.length <= 4 ? "2–3 pages" : "3–5 pages",
  };
}
