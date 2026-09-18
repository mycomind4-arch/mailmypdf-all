import { createFinding, type Finding } from "@mailmypdf/intelligence";
import type {
  AuthoritativeNameResolution,
} from "./authoritative-name.js";
import type {
  EntityClassification,
  EntityClassificationResult,
} from "./entity-classification.js";
import type {
  Capacity,
  CapacityResolutionResult,
} from "./capacity-resolution.js";
import type {
  JurisdictionResolutionResult,
  ResolvedJurisdiction,
} from "./jurisdiction-resolution.js";

export type NameCapacityCertificationStatus =
  | "certified"
  | "certified-with-limits"
  | "human-review-required"
  | "insufficient-evidence";

export type CertificationSearchRequirement =
  | "none"
  | "supporting"
  | "complete";

export interface CertificationSearchCoverage {
  readonly complete: boolean;
  readonly sourceIds: readonly string[];
  readonly searchedNames: readonly string[];
  readonly totalRecords: number;
  readonly warnings: readonly string[];
}

export interface NameCapacityCertificationPolicy {
  readonly id: string;
  readonly purpose: string;
  readonly minimumNameConfidence: number;
  readonly minimumEntityConfidence: number;
  readonly minimumCapacityConfidence: number;
  readonly requireCapacity: boolean;
  readonly requireJurisdiction: boolean;
  readonly searchRequirement: CertificationSearchRequirement;
  readonly requiredSearchSourceIds?: readonly string[] | undefined;
  readonly allowedEntityTypes?: readonly EntityClassification[] | undefined;
  readonly requiredCapacities?: readonly Capacity[] | undefined;
  readonly allowWeakNameConflicts?: boolean | undefined;
}

export interface CertificationCheck {
  readonly id: string;
  readonly status: "pass" | "warning" | "fail";
  readonly message: string;
  readonly humanReviewRequired: boolean;
}

export interface NameCapacityCertification {
  readonly policyId: string;
  readonly purpose: string;
  readonly status: NameCapacityCertificationStatus;
  readonly certifiedName?: string | undefined;
  readonly entityType?: EntityClassification | undefined;
  readonly capacities: readonly Capacity[];
  readonly jurisdictions: readonly ResolvedJurisdiction[];
  readonly confidence: number;
  readonly checks: readonly CertificationCheck[];
  readonly blockers: readonly string[];
  readonly limitations: readonly string[];
  readonly certifiedAt?: string | undefined;
}

function inRange(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

export function validateNameCapacityCertificationPolicy(
  policy: NameCapacityCertificationPolicy,
): void {
  if (!policy.id.trim()) throw new Error("Certification policy requires a stable id.");
  if (!policy.purpose.trim()) throw new Error("Certification policy requires a purpose.");
  for (const [name, value] of [
    ["minimumNameConfidence", policy.minimumNameConfidence],
    ["minimumEntityConfidence", policy.minimumEntityConfidence],
    ["minimumCapacityConfidence", policy.minimumCapacityConfidence],
  ] as const) {
    if (!inRange(value)) throw new Error(`${name} must be between 0 and 1.`);
  }
  if (policy.requiredCapacities?.length && !policy.requireCapacity) {
    throw new Error("requiredCapacities requires requireCapacity=true.");
  }
}

function check(
  id: string,
  status: CertificationCheck["status"],
  message: string,
  humanReviewRequired = false,
): CertificationCheck {
  return { id, status, message, humanReviewRequired };
}

function minConfidence(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return Math.min(...values);
}

export function certifyNameAndCapacity(input: {
  policy: NameCapacityCertificationPolicy;
  name: AuthoritativeNameResolution;
  entity: EntityClassificationResult;
  capacity: CapacityResolutionResult;
  jurisdiction?: JurisdictionResolutionResult;
  searchCoverage?: CertificationSearchCoverage;
  now?: string;
}): NameCapacityCertification {
  validateNameCapacityCertificationPolicy(input.policy);
  const checks: CertificationCheck[] = [];
  const blockers: string[] = [];
  const limitations: string[] = [];
  const confidences: number[] = [];
  let humanReview = false;

  // Name
  if (!input.name.authoritativeName) {
    checks.push(check("name.present", "fail", "No authoritative name is resolved.", input.name.requiresHumanReview));
    blockers.push("authoritative-name-missing");
    humanReview ||= input.name.requiresHumanReview;
  } else if (input.name.confidence < input.policy.minimumNameConfidence) {
    checks.push(check("name.confidence", "fail", `Name confidence ${input.name.confidence} is below policy threshold ${input.policy.minimumNameConfidence}.`));
    blockers.push("authoritative-name-confidence-below-threshold");
  } else if (
    input.name.disposition === "resolved-with-conflict" &&
    !input.policy.allowWeakNameConflicts
  ) {
    checks.push(check("name.conflict", "fail", "Resolved name still has conflicting lower-authority evidence and policy does not permit certification with that conflict.", true));
    blockers.push("authoritative-name-conflict");
    humanReview = true;
  } else {
    checks.push(check("name", input.name.disposition === "resolved-with-conflict" ? "warning" : "pass", `Authoritative name resolved as ${input.name.authoritativeName}.`));
    confidences.push(input.name.confidence);
    if (input.name.disposition === "resolved-with-conflict") limitations.push("authoritative-name-has-lower-authority-conflict");
  }

  // Entity classification
  if (!input.entity.authoritativeType) {
    checks.push(check("entity.present", "fail", "No authoritative entity classification is resolved.", input.entity.requiresHumanReview));
    blockers.push("entity-classification-missing");
    humanReview ||= input.entity.requiresHumanReview;
  } else if (input.entity.confidence < input.policy.minimumEntityConfidence) {
    checks.push(check("entity.confidence", "fail", `Entity confidence ${input.entity.confidence} is below policy threshold ${input.policy.minimumEntityConfidence}.`));
    blockers.push("entity-confidence-below-threshold");
  } else if (
    input.policy.allowedEntityTypes?.length &&
    !input.policy.allowedEntityTypes.includes(input.entity.authoritativeType)
  ) {
    checks.push(check("entity.allowed", "fail", `Entity type ${input.entity.authoritativeType} is not permitted by this certification policy.`));
    blockers.push("entity-type-not-allowed");
  } else {
    checks.push(check("entity", "pass", `Entity classified as ${input.entity.authoritativeType}.`));
    confidences.push(input.entity.confidence);
  }

  // Capacity
  const supportedCapacities = input.capacity.supportedCapacities
    .filter((item) => item.confidence >= input.policy.minimumCapacityConfidence);
  const capacityNames = supportedCapacities.map((item) => item.capacity);

  if (input.policy.requireCapacity && supportedCapacities.length === 0) {
    checks.push(check("capacity.present", "fail", "No capacity satisfies the certification threshold.", input.capacity.requiresHumanReview));
    blockers.push("capacity-missing-or-below-threshold");
    humanReview ||= input.capacity.requiresHumanReview;
  } else if (
    input.policy.requiredCapacities?.length &&
    !input.policy.requiredCapacities.every((required) => capacityNames.includes(required))
  ) {
    checks.push(check("capacity.required", "fail", "One or more policy-required capacities are not supported."));
    blockers.push("required-capacity-missing");
  } else if (supportedCapacities.length > 0) {
    checks.push(check("capacity", input.capacity.disposition === "resolved-multiple" ? "warning" : "pass", `Supported capacities: ${capacityNames.join(", ")}.`));
    confidences.push(...supportedCapacities.map((item) => item.confidence));
    if (input.capacity.disposition === "resolved-multiple") limitations.push("multiple-capacities-supported");
  } else {
    checks.push(check("capacity", "pass", "Capacity is not required by this policy."));
  }

  if (input.capacity.requiresHumanReview) {
    humanReview = true;
    if (!blockers.includes("capacity-missing-or-below-threshold")) {
      blockers.push("capacity-human-review-required");
      checks.push(check("capacity.review", "fail", "Capacity resolution requires human review.", true));
    }
  }

  // Jurisdiction
  if (input.policy.requireJurisdiction) {
    if (!input.jurisdiction || input.jurisdiction.jurisdictions.length === 0) {
      checks.push(check("jurisdiction.present", "fail", "Certification policy requires resolved jurisdiction."));
      blockers.push("jurisdiction-missing");
    } else if (input.jurisdiction.requiresHumanReview) {
      checks.push(check("jurisdiction.review", "fail", "Jurisdiction resolution requires human review.", true));
      blockers.push("jurisdiction-human-review-required");
      humanReview = true;
    } else {
      checks.push(check("jurisdiction", input.jurisdiction.jurisdictions.length > 1 ? "warning" : "pass", `${input.jurisdiction.jurisdictions.length} jurisdiction result(s) supported.`));
      confidences.push(...input.jurisdiction.jurisdictions.map((item) => item.confidence));
      if (input.jurisdiction.jurisdictions.length > 1) limitations.push("multiple-jurisdictions-supported");
    }
  }

  // Search coverage
  if (input.policy.searchRequirement !== "none") {
    const coverage = input.searchCoverage;
    if (!coverage) {
      checks.push(check("search.present", "fail", "Certification policy requires registry/search coverage."));
      blockers.push("search-coverage-missing");
    } else {
      const requiredSources = input.policy.requiredSearchSourceIds ?? [];
      const missingSources = requiredSources.filter((sourceId) => !coverage.sourceIds.includes(sourceId));
      if (missingSources.length > 0) {
        checks.push(check("search.sources", "fail", `Required search source(s) not covered: ${missingSources.join(", ")}.`));
        blockers.push("required-search-source-missing");
      } else if (input.policy.searchRequirement === "complete" && !coverage.complete) {
        checks.push(check("search.complete", "fail", "Policy requires complete search coverage, but execution was incomplete."));
        blockers.push("search-coverage-incomplete");
      } else {
        checks.push(check("search", coverage.complete ? "pass" : "warning", `Search coverage recorded across ${coverage.sourceIds.length} source(s) and ${coverage.searchedNames.length} name variant(s).`));
        if (!coverage.complete) limitations.push("search-coverage-supporting-only");
        if (coverage.warnings.length > 0) {
          limitations.push(...coverage.warnings.map((warning) => `search:${warning}`));
        }
      }
    }
  }

  const failChecks = checks.filter((item) => item.status === "fail");
  const warningChecks = checks.filter((item) => item.status === "warning");

  let status: NameCapacityCertificationStatus;
  if (failChecks.length > 0) {
    status = humanReview || failChecks.some((item) => item.humanReviewRequired)
      ? "human-review-required"
      : "insufficient-evidence";
  } else if (warningChecks.length > 0 || limitations.length > 0) {
    status = "certified-with-limits";
  } else {
    status = "certified";
  }

  return {
    policyId: input.policy.id,
    purpose: input.policy.purpose,
    status,
    certifiedName: failChecks.some((item) => item.id.startsWith("name")) ? undefined : input.name.authoritativeName,
    entityType: failChecks.some((item) => item.id.startsWith("entity")) ? undefined : input.entity.authoritativeType,
    capacities: failChecks.some((item) => item.id.startsWith("capacity")) ? [] : capacityNames,
    jurisdictions: input.policy.requireJurisdiction && !input.jurisdiction?.requiresHumanReview
      ? input.jurisdiction?.jurisdictions ?? []
      : [],
    confidence: minConfidence(confidences),
    checks,
    blockers: [...new Set(blockers)],
    limitations: [...new Set(limitations)],
    certifiedAt: status === "certified" || status === "certified-with-limits"
      ? (input.now ?? new Date().toISOString())
      : undefined,
  };
}

export function nameCapacityCertificationToFinding(
  result: NameCapacityCertification,
): Finding {
  return createFinding({
    findingType: "name_capacity_certification",
    severity:
      result.status === "human-review-required" ? "major"
      : result.status === "insufficient-evidence" ? "minor"
      : "info",
    explanation: [
      `Purpose: ${result.purpose}.`,
      `Certification status: ${result.status}.`,
      result.certifiedName ? `Certified evidence-ready name: ${result.certifiedName}.` : "No evidence-ready name certified.",
      result.entityType ? `Entity type: ${result.entityType}.` : "Entity type not certified.",
      result.capacities.length ? `Capacities: ${result.capacities.join(", ")}.` : "No capacity certified.",
      result.blockers.length ? `Blockers: ${result.blockers.join(", ")}.` : "",
      result.limitations.length ? `Limitations: ${result.limitations.join(", ")}.` : "",
      "Certification represents internal evidence readiness for the stated purpose, not a judicial or governmental determination.",
    ].filter(Boolean).join(" "),
    recommendedAction:
      result.status === "human-review-required"
        ? "Resolve the human-review blockers before using the identity/capacity record for a consequential action."
        : result.status === "insufficient-evidence"
          ? "Obtain the missing authoritative evidence required by the certification policy."
          : undefined,
    provenance: {
      level: "rule_derived",
      ruleId: `identity-capacity.certification:${result.policyId}`,
    },
    confidence: result.confidence,
  });
}
