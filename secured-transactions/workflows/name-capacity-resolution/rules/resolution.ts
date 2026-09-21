import {
  resolveAuthoritativeName,
  resolveCapacity,
  resolveEntityClassification,
  type AuthoritySource,
  type Capacity,
  type EntityClassification,
} from "@mailmypdf/identity-capacity";

export type NameCapacitySourceType =
  | "government-issued-id"
  | "official-registry-record"
  | "organizational-document"
  | "executed-contract"
  | "court-order"
  | "user-statement";

export interface NameCapacityResolutionInput {
  primaryName: string;
  alternateNames: readonly string[];
  entityType?: EntityClassification;
  capacity?: Capacity;
  principalName?: string;
  sourceLabel: string;
  sourceType: NameCapacitySourceType;
  sourceId: string;
}

export interface NameCapacityResolutionResult {
  source?: AuthoritySource;
  name: ReturnType<typeof resolveAuthoritativeName>;
  entity: ReturnType<typeof resolveEntityClassification>;
  capacity: ReturnType<typeof resolveCapacity>;
  status: "ready-for-review" | "human-review-required" | "blocked";
  reasons: readonly string[];
}

function provenanceFor(sourceType: NameCapacitySourceType): AuthoritySource["provenanceLevel"] {
  if (sourceType === "user-statement") return "user_provided";
  if (sourceType === "executed-contract" || sourceType === "organizational-document") {
    return "document_extracted";
  }
  return "external_source";
}

function emptyResult(reason: string): NameCapacityResolutionResult {
  return {
    name: resolveAuthoritativeName({ purpose: "identity-review", candidates: [] }),
    entity: resolveEntityClassification({ signals: [] }),
    capacity: resolveCapacity({ actorId: "actor", claims: [] }),
    status: "blocked",
    reasons: [reason],
  };
}

export function resolveNameCapacity(input: NameCapacityResolutionInput): NameCapacityResolutionResult {
  const primaryName = input.primaryName.trim();
  const sourceId = input.sourceId.trim();
  if (!primaryName) return emptyResult("Add the name exactly as it appears on the main record.");
  if (!sourceId) return emptyResult("Add at least one record or source before relying on a name or capacity finding.");

  const source: AuthoritySource = {
    id: sourceId,
    sourceType: input.sourceType,
    provenanceLevel: provenanceFor(input.sourceType),
  };
  const names = [primaryName, ...input.alternateNames.map((name) => name.trim()).filter(Boolean)];
  const purpose = input.entityType === "registered-organization" ? "registered-organization-name" : "identity-review";
  const name = resolveAuthoritativeName({
    purpose,
    candidates: names.map((rawName, index) => ({
      id: `name-candidate-${index + 1}`,
      rawName,
      source,
    })),
  });
  const entity = resolveEntityClassification({
    signals: input.entityType
      ? [{
          id: "entity-type-from-record",
          proposedType: input.entityType,
          source,
          reason: "Entity type supplied from the selected record context.",
        }]
      : [],
  });
  const capacity = resolveCapacity({
    actorId: "actor",
    principalEntityId: input.principalName?.trim() ? "principal" : undefined,
    actionType: "secured-transaction",
    claims: input.capacity
      ? [{
          id: "capacity-from-record",
          actorId: "actor",
          capacity: input.capacity,
          principalEntityId: input.principalName?.trim() ? "principal" : undefined,
          actionTypes: ["secured-transaction"],
          source,
          reason: "Capacity supplied from the selected record context.",
        }]
      : [],
  });

  const reasons = [
    ...name.reasons,
    ...entity.reasons,
    ...capacity.reasons,
  ];
  const hasBlocker =
    name.disposition === "insufficient-evidence" ||
    entity.disposition === "insufficient-evidence" ||
    capacity.disposition === "insufficient-evidence";
  const needsReview =
    name.requiresHumanReview || entity.requiresHumanReview || capacity.requiresHumanReview;

  return {
    source,
    name,
    entity,
    capacity,
    status: hasBlocker ? "blocked" : needsReview ? "human-review-required" : "ready-for-review",
    reasons,
  };
}
