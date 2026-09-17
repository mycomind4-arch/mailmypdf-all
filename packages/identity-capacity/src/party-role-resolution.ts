import { createFinding, type Finding } from "@mailmypdf/intelligence";
import type { ObligationResolutionResult } from "./obligation-resolution.js";
import type { OwnershipRightsResult } from "./ownership-rights.js";
import type { CapacityResolutionResult } from "./capacity-resolution.js";
import {
  evaluateSourceAuthority,
  type AuthoritySource,
  type SourceAuthorityEvaluation,
  type SourceAuthorityRule,
} from "./source-authority.js";

export type PartyRole =
  | "creditor"
  | "obligor"
  | "debtor"
  | "secured-party"
  | "owner"
  | "collateral-owner"
  | "guarantor"
  | "assignor"
  | "assignee"
  | "principal"
  | "agent"
  | "claimant"
  | "respondent"
  | "trustee"
  | "executor"
  | "administrator"
  | "manager"
  | "member"
  | "officer"
  | "other";

export type PartyRoleEffect = "supports" | "contradicts";

export type PartyRoleResolutionDisposition =
  | "resolved"
  | "resolved-multiple-roles"
  | "resolved-with-conflict"
  | "human-review-required"
  | "insufficient-evidence";

export interface PartyRoleClaim {
  readonly id: string;
  readonly subjectEntityId: string;
  readonly role: PartyRole;
  readonly domain: string;
  readonly relatedObjectId?: string | undefined;
  readonly effect: PartyRoleEffect;
  readonly source: AuthoritySource;
  readonly confidence?: number | undefined;
  readonly reason?: string | undefined;
}

export interface EvaluatedPartyRoleClaim {
  readonly claim: PartyRoleClaim;
  readonly sourceAuthority: SourceAuthorityEvaluation;
  readonly combinedScore: number;
}

export interface ResolvedPartyRole {
  readonly subjectEntityId: string;
  readonly role: PartyRole;
  readonly domain: string;
  readonly relatedObjectId?: string | undefined;
  readonly confidence: number;
  readonly supportingClaimIds: readonly string[];
  readonly contradictingClaimIds: readonly string[];
}

export interface PartyRoleResolutionResult {
  readonly subjectEntityId: string;
  readonly domain: string;
  readonly relatedObjectId?: string | undefined;
  readonly disposition: PartyRoleResolutionDisposition;
  readonly roles: readonly ResolvedPartyRole[];
  readonly evaluatedClaims: readonly EvaluatedPartyRoleClaim[];
  readonly conflicts: readonly string[];
  readonly reasons: readonly string[];
  readonly ruleIds: readonly string[];
  readonly requiresHumanReview: boolean;
}

export const PARTY_ROLE_RULES: readonly SourceAuthorityRule[] = [
  {
    id: "party-role.court-order",
    purpose: "party-role-resolution",
    sourceTypes: ["court-order"],
    score: 0.97,
    reason: "A court order is strong evidence of the party role actually established or used by the court within that matter.",
  },
  {
    id: "party-role.executed-contract",
    purpose: "party-role-resolution",
    sourceTypes: ["executed-contract"],
    score: 0.93,
    reason: "An executed agreement is strong evidence of the contractual party roles expressed in that agreement.",
  },
  {
    id: "party-role.recorded-title.owner",
    purpose: "party-role-resolution",
    sourceTypes: ["recorded-title"],
    entityTypes: ["owner"],
    score: 1,
    reason: "Recorded title is high-authority evidence for a recorded ownership role, but does not by itself establish a collateral-specific role.",
  },
  {
    id: "party-role.organizational-document",
    purpose: "party-role-resolution",
    sourceTypes: ["organizational-document"],
    entityTypes: ["principal", "agent", "manager", "member", "officer", "trustee"],
    score: 0.9,
    reason: "A governing document can strongly establish internal or representative roles within its scope.",
  },
  {
    id: "party-role.official-registry",
    purpose: "party-role-resolution",
    sourceTypes: ["official-registry-record"],
    entityTypes: ["manager", "member", "officer", "owner"],
    score: 0.82,
    reason: "An official registry can strongly support roles it is designed to record, without establishing unrelated transactional roles.",
  },
  {
    id: "party-role.agency-notice",
    purpose: "party-role-resolution",
    sourceTypes: ["agency-notice"],
    entityTypes: ["claimant", "respondent"],
    score: 0.82,
    reason: "An agency notice can strongly evidence the party designation used in that administrative matter.",
  },
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function claimConfidence(claim: PartyRoleClaim): number {
  const value = claim.confidence ?? 0.7;
  return clamp01(Number.isFinite(value) ? value : 0.7);
}

function evaluateClaim(
  claim: PartyRoleClaim,
  rules?: readonly SourceAuthorityRule[],
): EvaluatedPartyRoleClaim {
  const sourceAuthority = evaluateSourceAuthority({
    source: claim.source,
    context: {
      purpose: "party-role-resolution",
      entityType: claim.role,
    },
    rules: [...PARTY_ROLE_RULES, ...(rules ?? [])],
  });

  return {
    claim,
    sourceAuthority,
    combinedScore: Math.round(
      clamp01(sourceAuthority.score * 0.88 + claimConfidence(claim) * 0.12) * 1000,
    ) / 1000,
  };
}

interface RoleGroup {
  readonly role: PartyRole;
  readonly supports: readonly EvaluatedPartyRoleClaim[];
  readonly contradicts: readonly EvaluatedPartyRoleClaim[];
  readonly strongestSupport: number;
  readonly strongestContradiction: number;
}

function groupClaims(evaluated: readonly EvaluatedPartyRoleClaim[]): RoleGroup[] {
  const map = new Map<PartyRole, EvaluatedPartyRoleClaim[]>();
  for (const item of evaluated) {
    const list = map.get(item.claim.role) ?? [];
    list.push(item);
    map.set(item.claim.role, list);
  }

  return [...map.entries()].map(([role, items]) => {
    const supports = items
      .filter((item) => item.claim.effect === "supports")
      .sort((a, b) => b.combinedScore - a.combinedScore);
    const contradicts = items
      .filter((item) => item.claim.effect === "contradicts")
      .sort((a, b) => b.combinedScore - a.combinedScore);
    return {
      role,
      supports,
      contradicts,
      strongestSupport: supports[0]?.combinedScore ?? 0,
      strongestContradiction: contradicts[0]?.combinedScore ?? 0,
    };
  });
}

function collectRuleIds(evaluated: readonly EvaluatedPartyRoleClaim[]): string[] {
  return [...new Set(
    evaluated
      .map((item) => item.sourceAuthority.matchedRuleId)
      .filter((value): value is string => Boolean(value)),
  )];
}

export function resolvePartyRoles(input: {
  subjectEntityId: string;
  domain: string;
  relatedObjectId?: string;
  claims: readonly PartyRoleClaim[];
  rules?: readonly SourceAuthorityRule[];
  strongEvidenceThreshold?: number;
}): PartyRoleResolutionResult {
  const threshold = input.strongEvidenceThreshold ?? 0.75;
  const evaluated = input.claims
    .filter((claim) =>
      claim.subjectEntityId === input.subjectEntityId &&
      claim.domain === input.domain &&
      (!input.relatedObjectId || claim.relatedObjectId === input.relatedObjectId),
    )
    .map((claim) => evaluateClaim(claim, input.rules));
  const groups = groupClaims(evaluated);

  if (evaluated.length === 0) {
    return {
      subjectEntityId: input.subjectEntityId,
      domain: input.domain,
      relatedObjectId: input.relatedObjectId,
      disposition: "insufficient-evidence",
      roles: [],
      evaluatedClaims: [],
      conflicts: [],
      reasons: ["No applicable party-role evidence was supplied."],
      ruleIds: [],
      requiresHumanReview: false,
    };
  }

  const conflicts: string[] = [];
  const supportedGroups: RoleGroup[] = [];
  for (const group of groups) {
    if (group.strongestSupport >= threshold && group.strongestContradiction >= threshold) {
      conflicts.push(`Strong evidence both supports and contradicts role ${group.role}.`);
      continue;
    }
    if (group.strongestSupport >= threshold) supportedGroups.push(group);
  }

  if (conflicts.length > 0) {
    return {
      subjectEntityId: input.subjectEntityId,
      domain: input.domain,
      relatedObjectId: input.relatedObjectId,
      disposition: "human-review-required",
      roles: supportedGroups.map((group) => ({
        subjectEntityId: input.subjectEntityId,
        role: group.role,
        domain: input.domain,
        relatedObjectId: input.relatedObjectId,
        confidence: group.strongestSupport,
        supportingClaimIds: group.supports.map((item) => item.claim.id),
        contradictingClaimIds: group.contradicts.map((item) => item.claim.id),
      })),
      evaluatedClaims: evaluated,
      conflicts,
      reasons: ["Conflicting strong evidence prevents automatic resolution of one or more party roles."],
      ruleIds: collectRuleIds(evaluated),
      requiresHumanReview: true,
    };
  }

  if (supportedGroups.length === 0) {
    const top = [...evaluated].sort((a, b) => b.combinedScore - a.combinedScore)[0]!;
    const review = top.combinedScore >= 0.5 || top.sourceAuthority.requiresHumanReview;
    return {
      subjectEntityId: input.subjectEntityId,
      domain: input.domain,
      relatedObjectId: input.relatedObjectId,
      disposition: review ? "human-review-required" : "insufficient-evidence",
      roles: [],
      evaluatedClaims: evaluated,
      conflicts: [],
      reasons: review
        ? ["Relevant role evidence exists but does not satisfy the deterministic resolution gate."]
        : ["Available evidence is too weak to support a party role."],
      ruleIds: collectRuleIds(evaluated),
      requiresHumanReview: review,
    };
  }

  const roles = supportedGroups.map((group): ResolvedPartyRole => ({
    subjectEntityId: input.subjectEntityId,
    role: group.role,
    domain: input.domain,
    relatedObjectId: input.relatedObjectId,
    confidence: group.strongestSupport,
    supportingClaimIds: group.supports.map((item) => item.claim.id),
    contradictingClaimIds: group.contradicts.map((item) => item.claim.id),
  }));
  const weakConflict = groups.some((group) =>
    group.strongestSupport >= threshold &&
    group.strongestContradiction > 0 &&
    group.strongestContradiction < threshold,
  );

  return {
    subjectEntityId: input.subjectEntityId,
    domain: input.domain,
    relatedObjectId: input.relatedObjectId,
    disposition: weakConflict
      ? "resolved-with-conflict"
      : roles.length > 1
        ? "resolved-multiple-roles"
        : "resolved",
    roles,
    evaluatedClaims: evaluated,
    conflicts: [],
    reasons: [
      "Resolved only roles supported by strong evidence in the requested domain and related-object context.",
      "Roles are not automatically transformed into other legal roles; for example, obligor does not automatically imply debtor and owner does not automatically imply collateral-owner.",
      ...(weakConflict ? ["Lower-authority contradictory role evidence remains visible in the audit trail."] : []),
    ],
    ruleIds: collectRuleIds(evaluated),
    requiresHumanReview: false,
  };
}

export function partyRoleClaimsFromObligation(
  result: ObligationResolutionResult,
  domain = "obligation",
): PartyRoleClaim[] {
  const claims: PartyRoleClaim[] = [];
  for (const term of result.terms) {
    const role =
      term.field === "creditor-entity-id" ? "creditor"
      : term.field === "obligor-entity-id" ? "obligor"
      : undefined;
    if (!role || typeof term.value !== "string") continue;

    for (const supportingClaimId of term.supportingClaimIds) {
      const evaluated = result.evaluatedClaims.find(
        (item) => item.claim.id === supportingClaimId,
      );
      if (!evaluated) continue;
      claims.push({
        id: `obligation:${supportingClaimId}:${role}`,
        subjectEntityId: term.value,
        role,
        domain,
        relatedObjectId: result.obligationId,
        effect: "supports",
        source: evaluated.claim.source,
        confidence: term.confidence,
        reason: `Derived from resolved ${term.field} term; no additional role inference was made.`,
      });
    }
  }
  return claims;
}

export function partyRoleClaimsFromOwnership(
  result: OwnershipRightsResult,
  domain = "asset-interest",
): PartyRoleClaim[] {
  const claims: PartyRoleClaim[] = [];
  for (const interest of result.interests) {
    const role: PartyRole =
      interest.interestType === "exclusive-owner" ||
      interest.interestType === "co-owner" ||
      interest.interestType === "recorded-owner" ||
      interest.interestType === "beneficial-owner"
        ? "owner"
        : "other";

    for (const supportingClaimId of interest.supportingClaimIds) {
      const evaluated = result.evaluatedClaims.find(
        (item) => item.claim.id === supportingClaimId,
      );
      if (!evaluated) continue;
      claims.push({
        id: `ownership:${supportingClaimId}:${role}`,
        subjectEntityId: interest.holderEntityId,
        role,
        domain,
        relatedObjectId: result.assetId,
        effect: "supports",
        source: evaluated.claim.source,
        confidence: interest.confidence,
        reason: role === "owner"
          ? "Derived from a resolved ownership interest; not promoted to collateral-owner without collateral-specific evidence."
          : "Asset interest preserved without inventing a more specific party role.",
      });
    }
  }
  return claims;
}

export function partyRoleClaimsFromCapacity(
  result: CapacityResolutionResult,
  domain = "capacity",
): PartyRoleClaim[] {
  const claims: PartyRoleClaim[] = [];
  for (const capacity of result.supportedCapacities) {
    const role: PartyRole | undefined =
      capacity.capacity === "agent" ? "agent"
      : capacity.capacity === "trustee" ? "trustee"
      : capacity.capacity === "executor" ? "executor"
      : capacity.capacity === "administrator" || capacity.capacity === "personal-representative" ? "administrator"
      : capacity.capacity === "manager" ? "manager"
      : capacity.capacity === "member" ? "member"
      : capacity.capacity === "officer" ? "officer"
      : undefined;
    if (!role) continue;

    for (const claimId of capacity.claimIds) {
      const evaluated = result.evaluatedClaims.find((item) => item.claim.id === claimId);
      if (!evaluated) continue;
      claims.push({
        id: `capacity:${claimId}:${role}`,
        subjectEntityId: result.actorId,
        role,
        domain,
        relatedObjectId: capacity.principalEntityId,
        effect: "supports",
        source: evaluated.claim.source,
        confidence: capacity.confidence,
        reason: "Derived from resolved capacity without expanding the role beyond the supported capacity.",
      });

      if (role === "agent" && capacity.principalEntityId) {
        claims.push({
          id: `capacity:${claimId}:principal`,
          subjectEntityId: capacity.principalEntityId,
          role: "principal",
          domain,
          relatedObjectId: result.actorId,
          effect: "supports",
          source: evaluated.claim.source,
          confidence: capacity.confidence,
          reason: "Derived from the same supported agent/principal relationship.",
        });
      }
    }
  }
  return claims;
}

export function partyRoleResolutionToFinding(
  result: PartyRoleResolutionResult,
): Finding {
  return createFinding({
    findingType: "party_role_resolution",
    severity: result.requiresHumanReview ? "major" : "info",
    entityIds: [result.subjectEntityId],
    explanation: [
      `Domain: ${result.domain}.`,
      `Disposition: ${result.disposition}.`,
      `Supported roles: ${result.roles.map((role) => role.role).join(", ") || "none"}.`,
      ...result.reasons,
      ...result.conflicts,
    ].join(" "),
    recommendedAction: result.requiresHumanReview
      ? "Resolve conflicting or insufficient role evidence before relying on the role for a consequential decision."
      : undefined,
    provenance: {
      level: "rule_derived",
      ruleId: "identity-capacity.party-role-resolution.v1",
      sourceRefs: result.evaluatedClaims.flatMap((item) => item.claim.source.sourceRefs ?? []),
    },
    confidence: result.roles.length > 0
      ? Math.max(...result.roles.map((role) => role.confidence))
      : 0,
  });
}
