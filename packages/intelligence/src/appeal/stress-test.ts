import type { AppealGround } from "./ground.js";
import type { Evidence } from "./evidence.js";
import type { Confidence, XRayFinding, XRayResult } from "./xray.js";

export interface GroundAttack {
  id: string;
  groundId: string;
  groundClaim: string;
  challenge: string;
  whatWouldDefeat: string;
  evidenceNeeded: { strong: string; moderate: string; weak: string };
  status: "open" | "mitigated" | "unmitigated";
  severity: "critical" | "serious" | "moderate";
  createdAt: string;
}

export type ComponentStatus = "strong" | "moderate" | "needs_verification" | "gap" | "clear";

export interface StrengthComponent {
  label: string;
  status: ComponentStatus;
  detail: string;
}

export interface GroundStrengthProfile {
  groundId: string;
  groundClaim: string;
  score: number;
  components: StrengthComponent[];
  assessment: "well_supported" | "needs_clarification" | "potentially_vulnerable";
  whatCouldChangeIt: string;
}

export interface WeakestLink {
  title: string;
  description: string;
  relatedGroundId?: string;
  relatedGapId?: string;
  relatedFindingId?: string;
  severity: "critical" | "serious" | "moderate";
  fixAction: string;
  fixTarget: "evidence" | "grounds" | "draft" | "timeline";
}

export interface AssessmentSensitivity {
  findingId: string;
  currentAssessment: string;
  whatCouldChangeIt: string;
  confidence: Confidence;
}

export type DraftVulnType = "exaggeration" | "unsupported_claim" | "factual_error" | "missing_qualifier" | "contradiction";

export interface DraftVulnerability {
  id: string;
  type: DraftVulnType;
  quote: string;
  issue: string;
  whyItMatters: string;
  recommendedRevision: string;
  status: "pending" | "applied" | "dismissed";
}

export interface StressTestResult {
  id: string;
  groundAttacks: GroundAttack[];
  strengthProfiles: GroundStrengthProfile[];
  weakestLink: WeakestLink | null;
  assessmentSensitivities: AssessmentSensitivity[];
  draftVulnerabilities: DraftVulnerability[];
  summary: {
    totalArguments: number;
    wellSupported: number;
    needClarification: number;
    vulnerable: number;
    overallScore: number;
  };
  testedAt: string;
}

function generateAttack(ground: AppealGround, evidence: Evidence[], findings: XRayFinding[]): GroundAttack {
  const linked = evidence.filter((item) => item.groundIds.includes(ground.id));
  const related = findings.filter((finding) => finding.status === "used_in_appeal" && finding.suggestedGroundType === ground.type);
  const base = {
    id: crypto.randomUUID(),
    groundId: ground.id,
    groundClaim: ground.claim,
    status: linked.length > 0 ? "mitigated" as const : "open" as const,
    severity: linked.length > 0 ? "serious" as const : "critical" as const,
    createdAt: new Date().toISOString(),
  };

  switch (ground.type) {
    case "factual_error":
      return {
        ...base,
        challenge: "The decision-maker may argue that its factual record is accurate or that the apparent discrepancy reflects context rather than error.",
        whatWouldDefeat: "Reliable contemporaneous documentation that establishes the disputed fact and explains any competing record.",
        evidenceNeeded: {
          strong: "Official record, dated receipt, timestamp, or other contemporaneous proof",
          moderate: "Portal screenshot, email timestamp, or corroborating correspondence",
          weak: "Undated copy or unsupported recollection",
        },
      };
    case "incomplete_review":
    case "insufficient_weight":
      return {
        ...base,
        challenge: "The decision-maker may argue that all submitted evidence was considered but was insufficient or was assigned less weight for a stated reason.",
        whatWouldDefeat: "Proof that material evidence was timely submitted plus a clear explanation of how it addresses the stated reason for the decision.",
        evidenceNeeded: {
          strong: "Submission receipt plus the material evidence and a direct record citation",
          moderate: "Correspondence showing the evidence was received or discussed",
          weak: "A statement that the evidence was submitted without corroboration",
        },
        severity: related.some((finding) => finding.type === "unaddressed_evidence") && linked.length === 0 ? "critical" : "serious",
      };
    case "legal_error":
    case "misapplied_rule":
      return {
        ...base,
        status: "open",
        severity: "serious",
        challenge: "The decision-maker may argue that it applied the controlling standard correctly and that the appellant is relying on an inapplicable or incomplete authority.",
        whatWouldDefeat: "A verified citation to the controlling rule or authority and a precise explanation of how the decision applied it incorrectly.",
        evidenceNeeded: {
          strong: "Controlling statute, regulation, policy, or precedential authority tied to the record",
          moderate: "Official guidance or handbook explaining the governing standard",
          weak: "General fairness argument without authority",
        },
      };
    case "procedural_error":
      return {
        ...base,
        status: "open",
        severity: "moderate",
        challenge: "The decision-maker may argue that the required procedure was followed or that any deviation was harmless.",
        whatWouldDefeat: "A specific procedural requirement, evidence of the deviation, and an explanation of why it mattered to the outcome.",
        evidenceNeeded: {
          strong: "Official rule plus documentary proof of the procedural deviation",
          moderate: "Timeline or correspondence showing the deviation",
          weak: "General statement that the process felt unfair",
        },
      };
    case "new_evidence":
      return {
        ...base,
        status: "open",
        severity: "serious",
        challenge: "The decision-maker may argue that the evidence was previously available, is cumulative, or does not change the result.",
        whatWouldDefeat: "Proof showing when the evidence became available and why it is material to the stated reasons for the decision.",
        evidenceNeeded: {
          strong: "Dated proof showing when the evidence was created or obtained and why it is material",
          moderate: "Credible explanation for why the evidence was not available earlier",
          weak: "General assertion that the evidence is new",
        },
      };
    case "contradictory_finding":
      return {
        ...base,
        challenge: "The decision-maker may argue that the statements are not actually inconsistent when read in context.",
        whatWouldDefeat: "Pinpoint citations showing the two positions cannot reasonably be reconciled, plus corroborating record evidence.",
        evidenceNeeded: {
          strong: "Side-by-side pinpoint quotations from authoritative portions of the record",
          moderate: "Document excerpts showing the apparent inconsistency",
          weak: "Paraphrases without page or source references",
        },
      };
    default:
      return {
        ...base,
        status: "open",
        severity: "moderate",
        challenge: "The decision-maker may argue that the ground does not identify a specific, material error in the decision.",
        whatWouldDefeat: "A more specific claim tied to the decision, the record, and a concrete requested remedy.",
        evidenceNeeded: {
          strong: "Pinpoint record citations and specific supporting evidence",
          moderate: "Reference to the relevant decision section and supporting document",
          weak: "General disagreement with the result",
        },
      };
  }
}

function scoreGround(ground: AppealGround, evidence: Evidence[], attacks: GroundAttack[], findings: XRayFinding[]): GroundStrengthProfile {
  const linked = evidence.filter((item) => item.groundIds.includes(ground.id));
  const relatedFindings = findings.filter((finding) => finding.suggestedGroundType === ground.type && finding.status === "used_in_appeal");
  const groundAttacks = attacks.filter((attack) => attack.groundId === ground.id);
  const components: StrengthComponent[] = [];

  components.push({
    label: "Factual support",
    status: ground.claim.length > 20 && ground.source.length > 0 ? "strong" : ground.claim.length > 20 ? "moderate" : "gap",
    detail: ground.claim.length > 20 && ground.source.length > 0 ? "Claim is specific and identifies a source" : "The claim needs a more specific factual and source foundation",
  });

  const documentEvidence = linked.filter((item) => item.type === "document" || item.type === "record" || item.type === "correspondence");
  components.push({
    label: "Documentary support",
    status: documentEvidence.length >= 2 ? "strong" : documentEvidence.length === 1 ? "moderate" : "gap",
    detail: documentEvidence.length > 0 ? `${documentEvidence.length} documentary item(s) linked to this ground` : "No documentary evidence is linked to this ground",
  });

  const dateFindings = relatedFindings.filter((finding) => finding.type === "date_conflict");
  components.push({
    label: "Timeline",
    status: dateFindings.some((finding) => finding.confidence === "high") ? "strong" : linked.length > 0 ? "moderate" : "needs_verification",
    detail: dateFindings.length > 0 ? "Timeline-related finding exists and should be verified" : "No independently verified timeline finding is linked",
  });

  const openAttacks = groundAttacks.filter((attack) => attack.status !== "mitigated").length;
  components.push({
    label: "Counterargument",
    status: openAttacks === 0 ? "strong" : openAttacks === 1 ? "moderate" : "gap",
    detail: openAttacks === 0 ? "Identified counterarguments are mitigated" : `${openAttacks} counterargument(s) remain open`,
  });

  const lowConfidenceFindings = relatedFindings.filter((finding) => finding.confidence === "low").length;
  components.push({
    label: "Evidence completeness",
    status: linked.length >= 2 && lowConfidenceFindings === 0 ? "strong" : linked.length > 0 ? "moderate" : "gap",
    detail: linked.length >= 2 && lowConfidenceFindings === 0 ? "Evidence appears reasonably developed" : "Additional evidence or verification may be needed",
  });

  components.push({
    label: "Requested remedy",
    status: ground.draftLanguage.length > 10 ? "clear" : "moderate",
    detail: ground.draftLanguage.length > 10 ? "Draft language states a concrete position" : "Requested relief should be stated more specifically",
  });

  const scores: Record<ComponentStatus, number> = { strong: 20, clear: 18, moderate: 14, needs_verification: 10, gap: 5 };
  const rawScore = components.reduce((sum, component) => sum + scores[component.status], 0);
  const score = Math.min(100, rawScore);
  const assessment: GroundStrengthProfile["assessment"] = score >= 90 ? "well_supported" : score >= 60 ? "needs_clarification" : "potentially_vulnerable";
  const weakest = components.reduce((current, component) => scores[component.status] < scores[current.status] ? component : current, components[0]);

  return {
    groundId: ground.id,
    groundClaim: ground.claim.slice(0, 100),
    score,
    components,
    assessment,
    whatCouldChangeIt: `Improving the "${weakest.label}" component from ${weakest.status.replace(/_/g, " ")} would materially strengthen this ground.`,
  };
}

function findWeakestLink(profiles: GroundStrengthProfile[], attacks: GroundAttack[], xray: XRayResult | null): WeakestLink | null {
  if (profiles.length === 0) return null;
  const criticalAttack = attacks.find((attack) => attack.status === "open" && attack.severity === "critical");
  if (criticalAttack) {
    return {
      title: `Unmitigated challenge to "${criticalAttack.groundClaim.slice(0, 60)}${criticalAttack.groundClaim.length > 60 ? "..." : ""}"`,
      description: criticalAttack.challenge,
      relatedGroundId: criticalAttack.groundId,
      severity: "critical",
      fixAction: "Add evidence or narrow the ground to address this challenge",
      fixTarget: "evidence",
    };
  }

  const weakest = profiles.reduce((current, profile) => profile.score < current.score ? profile : current, profiles[0]);
  if (weakest.score < 60) {
    const rank: Record<ComponentStatus, number> = { strong: 5, clear: 4, moderate: 3, needs_verification: 2, gap: 1 };
    const component = weakest.components.reduce((current, candidate) => rank[candidate.status] < rank[current.status] ? candidate : current, weakest.components[0]);
    return {
      title: `Weakest ground: "${weakest.groundClaim.slice(0, 50)}${weakest.groundClaim.length > 50 ? "..." : ""}"`,
      description: `${component.label} is ${component.status.replace(/_/g, " ")}. ${component.detail}.`,
      relatedGroundId: weakest.groundId,
      severity: weakest.score < 40 ? "critical" : "serious",
      fixAction: component.label.includes("Timeline") ? "Verify the timeline" : component.label.includes("Evidence") || component.label.includes("Documentary") ? "Add supporting evidence" : "Refine the ground",
      fixTarget: component.label.includes("Timeline") ? "timeline" : component.label.includes("Evidence") || component.label.includes("Documentary") ? "evidence" : "grounds",
    };
  }

  const criticalGap = xray?.gaps.find((gap) => gap.severity === "critical" && gap.status === "open");
  return criticalGap ? {
    title: `Critical evidence gap: ${criticalGap.title}`,
    description: criticalGap.description,
    relatedGapId: criticalGap.id,
    severity: "serious",
    fixAction: "Add or verify the missing evidence",
    fixTarget: "evidence",
  } : null;
}

function analyzeSensitivity(findings: XRayFinding[]): AssessmentSensitivity[] {
  return findings
    .filter((finding) => finding.status === "used_in_appeal" || finding.status === "confirmed")
    .map((finding) => {
      const change = finding.type === "date_conflict"
        ? "A reliable record that resolves the date discrepancy."
        : finding.type === "unaddressed_evidence"
          ? "Proof that the decision did address the evidence, or proof that the evidence was not timely submitted."
          : finding.type === "unsupported_conclusion"
            ? "A record source that supplies the missing basis for the conclusion."
            : finding.type === "contradiction"
              ? "Context or additional evidence that reconciles the apparently inconsistent statements."
              : finding.type === "procedural_issue"
                ? "Verified instructions, an extension, or an applicable exception to the procedural rule."
                : "Additional evidence that materially changes the factual basis of the finding.";
      return {
        findingId: finding.id,
        currentAssessment: finding.confidence === "high" ? "Strong support" : finding.confidence === "medium" ? "Moderate support" : "Weak support",
        whatCouldChangeIt: change,
        confidence: finding.confidence,
      };
    });
}

function stressTestDraft(draft: string, findings: XRayFinding[]): DraftVulnerability[] {
  const vulnerabilities: DraftVulnerability[] = [];
  const exaggerations = [
    { pattern: /\b(completely ignored|wholly ignored|refused to consider|did not consider at all|ignored)\b/gi, suggestion: "does not appear to explain how this evidence affected the conclusion" },
    { pattern: /\b(deliberately|intentionally|knowingly|willfully)\b/gi, suggestion: "appears to have" },
    { pattern: /\b(clearly wrong|obviously wrong|demonstrably false|patently incorrect)\b/gi, suggestion: "may be incorrect" },
  ];
  for (const item of exaggerations) {
    let match: RegExpExecArray | null;
    while ((match = item.pattern.exec(draft)) !== null && vulnerabilities.length < 10) {
      vulnerabilities.push({
        id: crypto.randomUUID(),
        type: "exaggeration",
        quote: match[0],
        issue: "This wording may overstate what the record establishes.",
        whyItMatters: "Measured language reduces the risk that one overstated assertion undermines otherwise supported arguments.",
        recommendedRevision: item.suggestion,
        status: "pending",
      });
    }
  }

  const assertionPattern = /\b(the agency|the decision|the examiner|the reviewer)\s+(stated|claimed|asserted|determined|concluded|found)\s+(?:that\s+)?([^.]{20,150})/gi;
  let assertion: RegExpExecArray | null;
  while ((assertion = assertionPattern.exec(draft)) !== null && vulnerabilities.length < 14) {
    const nearby = draft.slice(Math.max(0, assertion.index - 200), assertion.index + 250);
    if (/\b(exhibit|attachment|page|document|evidence|record)\b/i.test(nearby)) continue;
    vulnerabilities.push({
      id: crypto.randomUUID(),
      type: "unsupported_claim",
      quote: assertion[0],
      issue: "This factual assertion is not paired with an obvious record citation nearby.",
      whyItMatters: "Pinpoint citations make factual claims easier to verify and harder to dismiss as unsupported.",
      recommendedRevision: `${assertion[0]} (cite the specific decision page or exhibit).`,
      status: "pending",
    });
  }

  const absolutePattern = /\b(it is clear that|it is obvious that|it is certain that|the facts show|the record proves)\s+([^.]{20,120})/gi;
  let absolute: RegExpExecArray | null;
  while ((absolute = absolutePattern.exec(draft)) !== null && vulnerabilities.length < 18) {
    vulnerabilities.push({
      id: crypto.randomUUID(),
      type: "missing_qualifier",
      quote: absolute[0],
      issue: "This sentence presents a contested proposition as absolute certainty.",
      whyItMatters: "A qualified statement can accurately reflect the strength of the evidence without overstating it.",
      recommendedRevision: `The evidence suggests that ${absolute[2].trim()}`,
      status: "pending",
    });
  }

  const datePattern = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/gi;
  let dateMatch: RegExpExecArray | null;
  while ((dateMatch = datePattern.exec(draft)) !== null) {
    const draftDate = new Date(dateMatch[0]);
    if (Number.isNaN(draftDate.getTime())) continue;
    const conflict = findings.find((finding) => finding.type === "date_conflict" && finding.claims.some((claim) => {
      const claimDate = new Date(claim.text);
      return !Number.isNaN(claimDate.getTime()) && Math.abs(claimDate.getTime() - draftDate.getTime()) > 86_400_000;
    }));
    if (!conflict) continue;
    vulnerabilities.push({
      id: crypto.randomUUID(),
      type: "factual_error",
      quote: dateMatch[0],
      issue: "This date may conflict with another date identified in the supplied documents.",
      whyItMatters: "Incorrect dates can undermine an otherwise strong factual presentation.",
      recommendedRevision: `Verify ${dateMatch[0]} against the source documents before finalizing this sentence.`,
      status: "pending",
    });
  }

  return vulnerabilities;
}

export function runStressTest(grounds: AppealGround[], evidence: Evidence[], draft: string, xrayResult: XRayResult | null): StressTestResult {
  const findings = xrayResult?.findings ?? [];
  const groundAttacks = grounds.map((ground) => generateAttack(ground, evidence, findings));
  const strengthProfiles = grounds.map((ground) => scoreGround(ground, evidence, groundAttacks, findings));
  const wellSupported = strengthProfiles.filter((profile) => profile.assessment === "well_supported").length;
  const needClarification = strengthProfiles.filter((profile) => profile.assessment === "needs_clarification").length;
  const vulnerable = strengthProfiles.filter((profile) => profile.assessment === "potentially_vulnerable").length;
  return {
    id: crypto.randomUUID(),
    groundAttacks,
    strengthProfiles,
    weakestLink: findWeakestLink(strengthProfiles, groundAttacks, xrayResult),
    assessmentSensitivities: analyzeSensitivity(findings),
    draftVulnerabilities: draft.length > 50 ? stressTestDraft(draft, findings) : [],
    summary: {
      totalArguments: grounds.length,
      wellSupported,
      needClarification,
      vulnerable,
      overallScore: strengthProfiles.length > 0 ? Math.round(strengthProfiles.reduce((sum, profile) => sum + profile.score, 0) / strengthProfiles.length) : 0,
    },
    testedAt: new Date().toISOString(),
  };
}

export function updateAttackStatus(result: StressTestResult, attackId: string, status: GroundAttack["status"]): StressTestResult {
  return { ...result, groundAttacks: result.groundAttacks.map((attack) => attack.id === attackId ? { ...attack, status } : attack) };
}

export function updateDraftVulnerability(result: StressTestResult, vulnerabilityId: string, status: "applied" | "dismissed"): StressTestResult {
  return { ...result, draftVulnerabilities: result.draftVulnerabilities.map((item) => item.id === vulnerabilityId ? { ...item, status } : item) };
}

export function applyDraftRevision(draft: string, vulnerability: DraftVulnerability): string {
  return vulnerability.status === "pending" ? draft.replace(vulnerability.quote, vulnerability.recommendedRevision) : draft;
}

export function applyAllRevisions(draft: string, vulnerabilities: DraftVulnerability[]): string {
  return vulnerabilities.reduce((current, vulnerability) => vulnerability.status === "pending" ? current.replace(vulnerability.quote, vulnerability.recommendedRevision) : current, draft);
}
