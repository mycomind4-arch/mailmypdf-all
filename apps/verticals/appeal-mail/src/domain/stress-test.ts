import type { Decision } from "./decision";
import type { AppealGround, GroundType } from "./ground";
import type { Evidence } from "./evidence";
import type { XRayFinding, XRayResult, Confidence } from "./xray";

/* ═══════════════════════════════════════════════════════════
   APPEAL STRESS TEST™ DOMAIN MODEL
   Adversarial analysis that attacks the user's own appeal
   to find weaknesses before the other side does.
   ═══════════════════════════════════════════════════════════ */

/* ── Ground Attack — how the decision-maker could counter ── */
export interface GroundAttack {
  id: string;
  groundId: string;
  groundClaim: string;
  /** How the decision-maker could respond to this ground */
  challenge: string;
  /** What would defeat that challenge */
  whatWouldDefeat: string;
  /** Evidence needed to counter the challenge */
  evidenceNeeded: {
    strong: string;
    moderate: string;
    weak: string;
  };
  /** Whether this attack has been mitigated */
  status: "open" | "mitigated" | "unmitigated";
  severity: "critical" | "serious" | "moderate";
  createdAt: string;
}

/* ── Strength Component ── */
export type ComponentStatus = "strong" | "moderate" | "needs_verification" | "gap" | "clear";

export interface StrengthComponent {
  label: string;
  status: ComponentStatus;
  detail: string;
}

/* ── Ground Strength Profile ── */
export interface GroundStrengthProfile {
  groundId: string;
  groundClaim: string;
  score: number;  // 0-100
  components: StrengthComponent[];
  /** Overall assessment */
  assessment: "well_supported" | "needs_clarification" | "potentially_vulnerable";
  /** What could change this assessment */
  whatCouldChangeIt: string;
}

/* ── Weakest Link ── */
export interface WeakestLink {
  title: string;
  description: string;
  relatedGroundId?: string;
  relatedGapId?: string;
  relatedFindingId?: string;
  severity: "critical" | "serious" | "moderate";
  /** Where to go to fix it */
  fixAction: string;
  fixTarget: "evidence" | "grounds" | "draft" | "timeline";
}

/* ── Assessment Sensitivity — "what would change my conclusion?" ── */
export interface AssessmentSensitivity {
  findingId: string;
  currentAssessment: string;
  whatCouldChangeIt: string;
  confidence: Confidence;
}

/* ── Draft Vulnerability — issues found in the final draft ── */
export type DraftVulnType =
  | "exaggeration"       // Overstated claim ("ignored" when evidence was mentioned)
  | "unsupported_claim"  // Claim not backed by evidence
  | "factual_error"     // Dates, names, numbers that conflict with documents
  | "missing_qualifier"  // Assertion stated as fact when it should be hedged
  | "contradiction";     // Draft contradicts the evidence

export interface DraftVulnerability {
  id: string;
  type: DraftVulnType;
  /** The problematic text from the draft */
  quote: string;
  /** What's wrong with it */
  issue: string;
  /** Why it matters */
  whyItMatters: string;
  /** The suggested replacement */
  recommendedRevision: string;
  status: "pending" | "applied" | "dismissed";
}

/* ── Stress Test Result ── */
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

/* ═══════════════════════════════════════════════════════════
   ATTACK GENERATION
   ═══════════════════════════════════════════════════════════ */

/* ── Generate attacks for each ground type ── */
function generateAttack(ground: AppealGround, evidence: Evidence[], xrayFindings: XRayFinding[]): GroundAttack {
  const linkedEvidence = evidence.filter((e) => e.groundIds.includes(ground.id));
  const relatedFindings = xrayFindings.filter((f) => f.status === "used_in_appeal" && f.suggestedGroundType === ground.type);

  const baseAttack: Omit<GroundAttack, "id" | "createdAt"> = {
    groundId: ground.id,
    groundClaim: ground.claim,
    challenge: "",
    whatWouldDefeat: "",
    evidenceNeeded: { strong: "", moderate: "", weak: "" },
    status: "open",
    severity: "moderate",
  };

  switch (ground.type) {
    case "factual_error": {
      return {
        ...baseAttack,
        challenge: "The agency may argue that its factual record is accurate and that any discrepancy is due to the appellant's error or a different interpretation of the facts.",
        whatWouldDefeat: "Documentary proof that the agency's stated fact is incorrect — e.g., a dated receipt, timestamp, or official record showing the correct fact.",
        evidenceNeeded: {
          strong: "Dated submission receipt or official record proving the correct fact",
          moderate: "Portal screenshot or email timestamp showing the correct date",
          weak: "Undated copy of the relevant document",
        },
        severity: linkedEvidence.length === 0 ? "critical" : "serious",
        status: linkedEvidence.length > 0 ? "mitigated" : "open",
      };
    }

    case "insufficient_evidence": {
      return {
        ...baseAttack,
        challenge: "The agency may argue that it considered all submitted evidence but found it insufficient to support the requested outcome. The decision may cite specific evidence it did consider.",
        whatWouldDefeat: "Evidence that was submitted but not referenced in the decision, or proof that the evidence directly addresses the stated reason for denial.",
        evidenceNeeded: {
          strong: "Submission receipt proving the evidence was received before the decision",
          moderate: "Email correspondence showing the evidence was discussed",
          weak: "Statement that the evidence was included with the application",
        },
        severity: "serious",
        status: relatedFindings.some((f) => f.type === "unaddressed_evidence") ? "open" : "moderate",
      };
    }

    case "legal_error": {
      return {
        ...baseAttack,
        challenge: "The agency may argue that it applied the correct legal standard and that its interpretation is entitled to deference. The decision may cite the regulation or statute it relied on.",
        whatWouldDefeat: "A clear citation to the specific regulation, statute, or precedent that the agency failed to apply or misapplied.",
        evidenceNeeded: {
          strong: "Citation to specific regulation or statute showing the correct legal standard",
          moderate: "Legal guidance or handbook referencing the correct standard",
          weak: "General statement that the decision seems unfair",
        },
        severity: "serious",
        status: "open",
      };
    }

    case "procedural_error": {
      return {
        ...baseAttack,
        challenge: "The agency may argue that all required procedures were followed, or that any procedural irregularity was harmless and did not affect the outcome.",
        whatWouldDefeat: "Evidence of a specific procedural step that was missed, performed incorrectly, or that prejudiced the outcome.",
        evidenceNeeded: {
          strong: "Documentary proof of the procedural violation (e.g., missing notice, wrong deadline applied)",
          moderate: "Timeline showing the procedural deviation",
          weak: "Statement that the process felt unfair",
        },
        severity: "moderate",
        status: "open",
      };
    }

    case "new_evidence": {
      return {
        ...baseAttack,
        challenge: "The agency may argue that this evidence was available at the time of the original decision and should have been submitted then, making it inadmissible on appeal.",
        whatWouldDefeat: "Evidence that the information was not available, not in the appellant's possession, or was newly discovered after the decision.",
        evidenceNeeded: {
          strong: "Proof of when the evidence was obtained (dated receipt, postmark, download timestamp)",
          moderate: "Statement explaining why the evidence was not available earlier",
          weak: "General claim that the evidence is new",
        },
        severity: "serious",
        status: "open",
      };
    }

    default: {
      return {
        ...baseAttack,
        challenge: "The decision-maker may argue that the ground as stated does not sufficiently identify a specific error in the decision.",
        whatWouldDefeat: "A more specific articulation of the error, with precise references to the decision and supporting documents.",
        evidenceNeeded: {
          strong: "Specific page citations to the decision showing the error",
          moderate: "General reference to the relevant section of the decision",
          weak: "General statement of disagreement",
        },
        severity: "moderate",
        status: "open",
      };
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   STRENGTH SCORING
   ═══════════════════════════════════════════════════════════ */

function scoreGround(
  ground: AppealGround,
  evidence: Evidence[],
  attacks: GroundAttack[],
  xrayFindings: XRayFinding[],
): GroundStrengthProfile {
  const linkedEvidence = evidence.filter((e) => e.groundIds.includes(ground.id));
  const groundAttacks = attacks.filter((a) => a.groundId === ground.id);
  const relatedFindings = xrayFindings.filter((f) => f.suggestedGroundType === ground.type && f.status === "used_in_appeal");

  // Factual support
  const hasClaim = ground.claim && ground.claim.length > 20;
  const hasSource = ground.source && ground.source.length > 0;
  const factual: StrengthComponent = {
    label: "Factual support",
    status: hasClaim && hasSource ? "strong" : hasClaim ? "moderate" : "gap",
    detail: hasClaim && hasSource
      ? "Claim is specific and references a source"
      : hasClaim
      ? "Claim is stated but lacks specific source reference"
      : "No factual claim articulated",
  };

  // Documentary support
  const docEvidence = linkedEvidence.filter((e) => e.type === "document");
  const documentary: StrengthComponent = {
    label: "Documentary support",
    status: docEvidence.length >= 2 ? "strong" : docEvidence.length === 1 ? "moderate" : "gap",
    detail: docEvidence.length >= 2
      ? `${docEvidence.length} documents linked to this ground`
      : docEvidence.length === 1
      ? "1 document linked — consider adding more"
      : "No documents linked to this ground",
  };

  // Timeline
  const dateFindings = relatedFindings.filter((f) => f.type === "date_conflict");
  const timeline: StrengthComponent = {
    label: "Timeline",
    status: dateFindings.length > 0 && dateFindings[0].confidence === "high"
      ? "strong"
      : dateFindings.length > 0
      ? "needs_verification"
      : linkedEvidence.length > 0
      ? "moderate"
      : "needs_verification",
    detail: dateFindings.length > 0
      ? `Date conflict identified with ${dateFindings[0].confidence} confidence`
      : "No timeline issues identified — but dates not independently verified",
  };

  // Counterargument resilience
  const mitigatedAttacks = groundAttacks.filter((a) => a.status === "mitigated").length;
  const openAttacks = groundAttacks.filter((a) => a.status === "open").length;
  const counterarg: StrengthComponent = {
    label: "Counterargument",
    status: openAttacks === 0 && mitigatedAttacks > 0
      ? "strong"
      : openAttacks <= 1
      ? "moderate"
      : "gap",
    detail: openAttacks === 0
      ? "All identified counterarguments have been mitigated"
      : `${openAttacks} counterargument${openAttacks === 1 ? "" : "s"} remain unmitigated`,
  };

  // Evidence completeness
  const evidenceGaps = relatedFindings.filter((f) => f.confidence === "low").length;
  const evidenceCompleteness: StrengthComponent = {
    label: "Evidence completeness",
    status: evidenceGaps === 0 && linkedEvidence.length >= 2
      ? "strong"
      : evidenceGaps > 0
      ? "gap"
      : linkedEvidence.length === 1
      ? "moderate"
      : "gap",
    detail: evidenceGaps > 0
      ? `${evidenceGaps} finding${evidenceGaps === 1 ? "" : "s"} with low confidence — evidence may be insufficient`
      : linkedEvidence.length >= 2
      ? "Evidence appears complete for this ground"
      : "Limited evidence linked — consider adding more",
  };

  // Requested remedy
  const hasRemedy = ground.claim.length > 0 && ground.draftLanguage && ground.draftLanguage.length > 10;
  const remedy: StrengthComponent = {
    label: "Requested remedy",
    status: hasRemedy ? "clear" : "moderate",
    detail: hasRemedy
      ? "Remedy is clearly articulated"
      : "Remedy could be stated more specifically",
  };

  // Compute score
  const componentScores: Record<ComponentStatus, number> = {
    strong: 20,
    clear: 18,
    moderate: 14,
    needs_verification: 10,
    gap: 5,
  };
  const components = [factual, documentary, timeline, counterarg, evidenceCompleteness, remedy];
  const score = components.reduce((sum, c) => sum + componentScores[c.status], 0);

  const assessment: GroundStrengthProfile["assessment"] =
    score >= 90 ? "well_supported" :
    score >= 60 ? "needs_clarification" :
    "potentially_vulnerable";

  // What could change it
  const weakestComponent = components.reduce((min, c) =>
    componentScores[c.status] < componentScores[min.status] ? c : min, components[0]);
  const whatCouldChangeIt = `If the "${weakestComponent.label}" component were improved from ${weakestComponent.status.replace(/_/g, " ")} to strong, this ground's score would increase significantly.`;

  return {
    groundId: ground.id,
    groundClaim: ground.claim.slice(0, 100),
    score: Math.min(100, score),
    components,
    assessment,
    whatCouldChangeIt,
  };
}

/* ═══════════════════════════════════════════════════════════
   WEAKEST LINK DETECTION
   ═══════════════════════════════════════════════════════════ */

function findWeakestLink(
  profiles: GroundStrengthProfile[],
  attacks: GroundAttack[],
  xrayResult: XRayResult | null,
): WeakestLink | null {
  if (profiles.length === 0) return null;

  // Find the lowest scoring ground
  const weakest = profiles.reduce((min, p) => p.score < min.score ? p : min, profiles[0]);

  // Find the most critical open attack
  const criticalAttack = attacks.find((a) => a.status === "open" && a.severity === "critical");

  // Find the weakest component
  const weakComponent = weakest.components.reduce((min, c) => {
    const scores: Record<ComponentStatus, number> = { strong: 5, clear: 4, moderate: 3, needs_verification: 2, gap: 1 };
    return scores[c.status] < scores[min.status] ? c : min;
  }, weakest.components[0]);

  if (criticalAttack) {
    return {
      title: `Unmitigated critical challenge to "${criticalAttack.groundClaim.slice(0, 60)}..."`,
      description: `The decision-maker could argue: "${criticalAttack.challenge.slice(0, 150)}..." This challenge has not been mitigated.`,
      relatedGroundId: criticalAttack.groundId,
      severity: "critical",
      fixAction: "Add evidence to counter this challenge",
      fixTarget: "evidence",
    };
  }

  if (weakest.score < 60) {
    return {
      title: `"${weakest.groundClaim.slice(0, 50)}..." is your weakest ground (score: ${weakest.score}/100)`,
      description: `The "${weakComponent.label}" component is currently ${weakComponent.status.replace(/_/g, " ")}. ${weakComponent.detail}. If this ground cannot be strengthened, it may undermine the overall credibility of your appeal.`,
      relatedGroundId: weakest.groundId,
      severity: weakest.score < 40 ? "critical" : "serious",
      fixAction: weakComponent.label.includes("Evidence")
        ? "Add evidence to strengthen this ground"
        : weakComponent.label.includes("Timeline")
        ? "Verify the timeline for this ground"
        : "Improve this ground's articulation",
      fixTarget: weakComponent.label.includes("Evidence") ? "evidence" :
        weakComponent.label.includes("Timeline") ? "timeline" : "grounds",
    };
  }

  // Check for evidence gaps from X-Ray
  if (xrayResult && xrayResult.gaps.length > 0) {
    const criticalGap = xrayResult.gaps.find((g) => g.severity === "critical" && g.status === "open");
    if (criticalGap) {
      return {
        title: `Critical evidence gap: ${criticalGap.title}`,
        description: criticalGap.description,
        relatedGapId: criticalGap.id,
        severity: "serious",
        fixAction: "Add the missing evidence",
        fixTarget: "evidence",
      };
    }
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════
   ASSESSMENT SENSITIVITY — "What would change my conclusion?"
   ═══════════════════════════════════════════════════════════ */

function analyzeSensitivity(findings: XRayFinding[]): AssessmentSensitivity[] {
  return findings
    .filter((f) => f.status === "used_in_appeal" || f.status === "confirmed")
    .map((f) => {
      const currentAssessment =
        f.confidence === "high" ? "Strong support" :
        f.confidence === "medium" ? "Moderate support" :
        "Weak support";

      let whatCouldChangeIt = "";
      switch (f.type) {
        case "date_conflict":
          whatCouldChangeIt = "A document showing the agency's date is correct, or that the discrepancy is immaterial to the decision.";
          break;
        case "unaddressed_evidence":
          whatCouldChangeIt = "A page in the decision that actually does address this evidence, or proof that the evidence was not submitted before the decision.";
          break;
        case "unsupported_conclusion":
          whatCouldChangeIt = "A document in the record that supports the agency's conclusion, or an explanation of the agency's reasoning.";
          break;
        case "contradiction":
          whatCouldChangeIt = "A document that resolves the contradiction in the agency's favor, or an explanation for the apparent discrepancy.";
          break;
        case "procedural_issue":
          whatCouldChangeIt = "Evidence that the deadline was extended, or that an exception applies to the procedural requirement.";
          break;
        default:
          whatCouldChangeIt = "Additional evidence that contradicts or undermines this finding.";
      }

      return {
        findingId: f.id,
        currentAssessment,
        whatCouldChangeIt,
        confidence: f.confidence,
      };
    });
}

/* ═══════════════════════════════════════════════════════════
   DRAFT VULNERABILITY DETECTION
   ═══════════════════════════════════════════════════════════ */

function stressTestDraft(
  draft: string,
  grounds: AppealGround[],
  evidence: Evidence[],
  xrayFindings: XRayFinding[],
): DraftVulnerability[] {
  const vulnerabilities: DraftVulnerability[] = [];
  const draftLower = draft.toLowerCase();

  /* ── 1. Exaggerated claims ── */
  // Look for strong language that may overstate the case
  const exaggerationPatterns: { pattern: RegExp; word: string; suggestion: string }[] = [
    { pattern: /\b(ignored|completely ignored|wholly ignored|refused to consider|did not consider at all)\b/gi, word: "ignored", suggestion: "does not appear to explain how that evidence affected the conclusion" },
    { pattern: /\b(failed to review|never reviewed|did not review)\b/gi, word: "failed to review", suggestion: "does not appear to have addressed this evidence in its reasoning" },
    { pattern: /\b(deliberately|intentionally|knowingly|willfully)\b/gi, word: "deliberately", suggestion: "appears to have" },
    { pattern: /\b(clearly wrong|obviously wrong|demonstrably false|patently incorrect)\b/gi, word: "clearly wrong", suggestion: "may be incorrect" },
  ];

  for (const { pattern, word, suggestion } of exaggerationPatterns) {
    let match;
    while ((match = pattern.exec(draft)) !== null && vulnerabilities.length < 10) {
      // Check if the X-Ray found that the decision DID mention this evidence
      const context = draft.slice(Math.max(0, match.index - 100), match.index + 100);
      const relatedFinding = xrayFindings.find((f) =>
        f.type === "unaddressed_evidence" &&
        f.status === "used_in_appeal" &&
        context.includes(f.claims[0]?.text.slice(0, 30) || "___unlikely_match___")
      );

      // If the decision actually does reference the evidence, flag the exaggeration
      const decisionMentions = xrayFindings.some((f) =>
        f.type !== "unaddressed_evidence" && f.sources.some((s) =>
          s.excerpt && context.includes(s.excerpt.slice(0, 20))
        )
      );

      vulnerabilities.push({
        id: crypto.randomUUID(),
        type: "exaggeration",
        quote: match[0],
        issue: decisionMentions
          ? `The draft claims the agency "${match[0]}" but the decision appears to reference this evidence.`
          : `The draft uses strong language ("${match[0]}") that may overstate the case and reduce credibility.`,
        whyItMatters: "Exaggerated claims can undermine the credibility of your entire appeal. If the decision-maker finds one claim to be overstated, they may discount your other arguments.",
        recommendedRevision: decisionMentions
          ? `Instead of claiming the evidence was "${match[0]}", consider stating that the decision "does not appear to explain how that evidence affected the conclusion."`
          : `Consider softening "${match[0]}" to a more measured statement like "${suggestion}."`,
        status: "pending",
      });
    }
  }

  /* ── 2. Unsupported claims ── */
  // Look for assertion patterns without evidence references
  const assertionPattern = /\b(the agency|the decision|the examiner|the reviewer)\s+(stated|claimed|asserted|determined|concluded|found)\s+(?:that\s+)?([^.]{20,150})/gi;
  let match;
  while ((match = assertionPattern.exec(draft)) !== null && vulnerabilities.length < 12) {
    const assertion = match[0];
    // Check if any evidence is cited nearby
    const nearby = draft.slice(Math.max(0, match.index - 200), match.index + 200);
    const hasEvidenceCitation = /\b(exhibit|attachment|page|document|evidence|record)\s+/i.test(nearby);

    if (!hasEvidenceCitation) {
      vulnerabilities.push({
        id: crypto.randomUUID(),
        type: "unsupported_claim",
        quote: assertion,
        issue: `This assertion is not linked to a specific document or page in the record.`,
        whyItMatters: "Assertions without citations to the record are easier for the decision-maker to dismiss. Every factual claim should reference a specific source.",
        recommendedRevision: `Add a citation: "${assertion} (see Decision, p. [X] / Exhibit [Y])."`,
        status: "pending",
      });
    }
  }

  /* ── 3. Missing qualifiers ── */
  // Look for assertions stated as absolute facts
  const absolutePattern = /\b(it is clear that|it is obvious that|it is certain that|the facts show|the record proves)\s+([^.]{20,120})/gi;
  while ((match = absolutePattern.exec(draft)) !== null && vulnerabilities.length < 15) {
    vulnerabilities.push({
      id: crypto.randomUUID(),
      type: "missing_qualifier",
      quote: match[0],
      issue: `This is stated as an absolute certainty. Absolute claims are held to a higher standard.`,
      whyItMatters: "Absolute statements invite the decision-maker to disprove them entirely. Qualified statements (e.g., 'appears to') are harder to defeat because they acknowledge uncertainty.",
      recommendedRevision: `Consider qualifying: "The evidence suggests that ${match[2].trim()}" or "It appears that ${match[2].trim()}"`,
      status: "pending",
    });
  }

  /* ── 4. Date contradictions with evidence ── */
  const datePattern = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/gi;
  while ((match = datePattern.exec(draft)) !== null) {
    const draftDate = new Date(match[0]);
    if (isNaN(draftDate.getTime())) continue;
    const draftDateStr = draftDate.toISOString().split("T")[0];

    // Check if any X-Ray finding has a conflicting date
    const conflict = xrayFindings.find((f) =>
      f.type === "date_conflict" &&
      f.claims.some((c) => {
        const claimDate = new Date(c.text);
        return !isNaN(claimDate.getTime()) &&
          Math.abs(claimDate.getTime() - draftDate.getTime()) > 86400000 && // >1 day difference
          claimDate.toISOString().split("T")[0] !== draftDateStr;
      })
    );

    if (conflict) {
      vulnerabilities.push({
        id: crypto.randomUUID(),
        type: "factual_error",
        quote: match[0],
        issue: `This date (${match[0]}) may conflict with dates found in your documents. The X-Ray identified a date conflict.`,
        whyItMatters: "Incorrect dates can undermine the factual basis of your appeal. Verify this date against your supporting documents.",
        recommendedRevision: `Verify this date against your documents. The X-Ray found a potential conflict: ${conflict.title}.`,
        status: "pending",
      });
    }
  }

  return vulnerabilities;
}

/* ═══════════════════════════════════════════════════════════
   MAIN STRESS TEST FUNCTION
   ═══════════════════════════════════════════════════════════ */

export function runStressTest(
  grounds: AppealGround[],
  evidence: Evidence[],
  draft: string,
  xrayResult: XRayResult | null,
): StressTestResult {
  const xrayFindings = xrayResult?.findings || [];

  // Generate attacks for each ground
  const groundAttacks: GroundAttack[] = grounds.map((g) =>
    generateAttack(g, evidence, xrayFindings)
  );

  // Score each ground
  const strengthProfiles: GroundStrengthProfile[] = grounds.map((g) =>
    scoreGround(g, evidence, groundAttacks, xrayFindings)
  );

  // Find the weakest link
  const weakestLink = findWeakestLink(strengthProfiles, groundAttacks, xrayResult);

  // Assessment sensitivities
  const assessmentSensitivities = analyzeSensitivity(xrayFindings);

  // Draft vulnerabilities (if draft exists)
  const draftVulnerabilities = draft.length > 50
    ? stressTestDraft(draft, grounds, evidence, xrayFindings)
    : [];

  // Summary
  const wellSupported = strengthProfiles.filter((p) => p.assessment === "well_supported").length;
  const needClarification = strengthProfiles.filter((p) => p.assessment === "needs_clarification").length;
  const vulnerable = strengthProfiles.filter((p) => p.assessment === "potentially_vulnerable").length;
  const overallScore = strengthProfiles.length > 0
    ? Math.round(strengthProfiles.reduce((sum, p) => sum + p.score, 0) / strengthProfiles.length)
    : 0;

  return {
    id: crypto.randomUUID(),
    groundAttacks,
    strengthProfiles,
    weakestLink,
    assessmentSensitivities,
    draftVulnerabilities,
    summary: {
      totalArguments: grounds.length,
      wellSupported,
      needClarification,
      vulnerable,
      overallScore,
    },
    testedAt: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════════
   UPDATE HELPERS
   ═══════════════════════════════════════════════════════════ */

export function updateAttackStatus(
  result: StressTestResult,
  attackId: string,
  status: "open" | "mitigated" | "unmitigated",
): StressTestResult {
  return {
    ...result,
    groundAttacks: result.groundAttacks.map((a) =>
      a.id === attackId ? { ...a, status } : a
    ),
  };
}

export function updateDraftVulnerability(
  result: StressTestResult,
  vulnId: string,
  status: "applied" | "dismissed",
): StressTestResult {
  return {
    ...result,
    draftVulnerabilities: result.draftVulnerabilities.map((v) =>
      v.id === vulnId ? { ...v, status } : v
    ),
  };
}

/* ── Apply a draft revision ── */
export function applyDraftRevision(
  draft: string,
  vuln: DraftVulnerability,
): string {
  if (vuln.status === "applied" || vuln.status === "dismissed") return draft;
  // Replace the problematic quote with the recommended revision
  return draft.replace(vuln.quote, vuln.recommendedRevision);
}

/* ── Apply all pending revisions ── */
export function applyAllRevisions(
  draft: string,
  vulnerabilities: DraftVulnerability[],
): string {
  let result = draft;
  for (const v of vulnerabilities) {
    if (v.status === "pending") {
      result = result.replace(v.quote, v.recommendedRevision);
    }
  }
  return result;
}
