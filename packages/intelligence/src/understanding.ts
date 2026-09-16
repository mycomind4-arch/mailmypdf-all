import {
  confidence,
  createId,
  type Confidence,
  type PlatformId,
} from "@mailmypdf/core";
import type { SourceRef } from "@mailmypdf/documents";
import { createFact, type Fact } from "./fact.js";
import {
  createProvenance,
  verifyProvenance,
  type ProvenanceLevel,
  type ProvenanceRecord,
} from "./provenance.js";

export type UnderstandingObservationKind =
  | "text"
  | "date"
  | "amount"
  | "identifier"
  | "person"
  | "organization"
  | "address"
  | "action"
  | "other";

export interface UnderstandingObservation {
  readonly id: PlatformId;
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly kind: UnderstandingObservationKind;
  readonly confidence: Confidence;
  readonly provenance: ProvenanceRecord;
  readonly required: boolean;
  readonly needsReview: boolean;
}

export interface DocumentUnderstanding {
  readonly documentId: PlatformId;
  readonly documentName: string;
  readonly classification: string;
  readonly classificationConfidence: Confidence;
  readonly observations: readonly UnderstandingObservation[];
  readonly requiredKeys: readonly string[];
  readonly missingRequiredKeys: readonly string[];
  readonly reviewRequiredKeys: readonly string[];
  readonly readyForFactPromotion: boolean;
  readonly createdAt: string;
}

export interface UnderstandingObservationInput {
  id?: string;
  key: string;
  label?: string;
  value: string;
  kind?: UnderstandingObservationKind;
  confidence: number;
  sourceRefs: readonly SourceRef[];
  provenanceLevel: Extract<
    ProvenanceLevel,
    "document_extracted" | "ai_inferred" | "human_verified" | "user_provided"
  >;
  modelId?: string;
  verifiedBy?: string;
  required?: boolean;
}

export interface CreateDocumentUnderstandingInput {
  documentId: string;
  documentName: string;
  classification: string;
  classificationConfidence: number;
  observations: readonly UnderstandingObservationInput[];
  requiredKeys?: readonly string[];
  reviewThreshold?: number;
}

const MAX_KEY_LENGTH = 128;
const MAX_LABEL_LENGTH = 240;
const MAX_VALUE_LENGTH = 4000;
const MAX_CLASSIFICATION_LENGTH = 160;
const DEFAULT_REVIEW_THRESHOLD = 0.75;
const KEY_PATTERN = /^[a-z][a-z0-9_.-]*$/;

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function assertSourceBelongsToDocument(
  documentId: string,
  sourceRefs: readonly SourceRef[],
): void {
  if (sourceRefs.length === 0) {
    throw new Error("Understanding observation requires source provenance");
  }
  for (const source of sourceRefs) {
    if (String(source.documentId) !== documentId) {
      throw new Error(
        `Understanding source document mismatch: expected ${documentId}, received ${source.documentId}`,
      );
    }
  }
}

function createObservation(
  documentId: string,
  input: UnderstandingObservationInput,
  reviewThreshold: number,
): UnderstandingObservation {
  const key = normalizeKey(input.key);
  const label = (input.label ?? input.key).trim();
  const value = input.value.trim();

  if (!KEY_PATTERN.test(key) || key.length > MAX_KEY_LENGTH) {
    throw new Error(`Invalid understanding observation key: ${input.key}`);
  }
  if (!label || label.length > MAX_LABEL_LENGTH) {
    throw new Error(`Invalid understanding observation label: ${input.label ?? input.key}`);
  }
  if (!value || value.length > MAX_VALUE_LENGTH) {
    throw new Error(`Invalid understanding observation value for ${key}`);
  }

  assertSourceBelongsToDocument(documentId, input.sourceRefs);

  if (input.provenanceLevel === "ai_inferred" && !input.modelId?.trim()) {
    throw new Error(`AI-inferred observation ${key} requires modelId`);
  }
  if (input.provenanceLevel === "human_verified" && !input.verifiedBy?.trim()) {
    throw new Error(`Human-verified observation ${key} requires verifiedBy`);
  }

  const observationConfidence = confidence(input.confidence);
  const provenance = createProvenance({
    level: input.provenanceLevel,
    sourceRefs: input.sourceRefs,
    modelId: input.modelId,
    verifiedBy: input.verifiedBy,
  });

  const needsReview =
    input.provenanceLevel === "ai_inferred" ||
    input.provenanceLevel === "user_provided" ||
    Number(observationConfidence) < reviewThreshold;

  return {
    id: createId(input.id ?? crypto.randomUUID()),
    key,
    label,
    value,
    kind: input.kind ?? "text",
    confidence: observationConfidence,
    provenance,
    required: input.required ?? false,
    needsReview,
  };
}

export function createDocumentUnderstanding(
  input: CreateDocumentUnderstandingInput,
): DocumentUnderstanding {
  const documentId = input.documentId.trim();
  const documentName = input.documentName.trim();
  const classification = input.classification.trim();

  if (!documentId) throw new Error("Document understanding requires documentId");
  if (!documentName) throw new Error("Document understanding requires documentName");
  if (!classification || classification.length > MAX_CLASSIFICATION_LENGTH) {
    throw new Error("Document understanding classification is invalid");
  }

  const reviewThreshold = input.reviewThreshold ?? DEFAULT_REVIEW_THRESHOLD;
  if (
    !Number.isFinite(reviewThreshold) ||
    reviewThreshold < 0 ||
    reviewThreshold > 1
  ) {
    throw new Error("Understanding reviewThreshold must be between 0 and 1");
  }

  const requiredKeys = [
    ...new Set((input.requiredKeys ?? []).map(normalizeKey)),
  ];
  for (const key of requiredKeys) {
    if (!KEY_PATTERN.test(key) || key.length > MAX_KEY_LENGTH) {
      throw new Error(`Invalid required understanding key: ${key}`);
    }
  }

  const observations = input.observations.map((observation) =>
    createObservation(documentId, observation, reviewThreshold),
  );

  const presentKeys = new Set(observations.map((observation) => observation.key));
  const missingRequiredKeys = requiredKeys.filter((key) => !presentKeys.has(key));

  const reviewRequiredKeys = [
    ...new Set(
      observations
        .filter((observation) => observation.needsReview)
        .map((observation) => observation.key),
    ),
  ];

  return {
    documentId: createId(documentId),
    documentName,
    classification,
    classificationConfidence: confidence(input.classificationConfidence),
    observations,
    requiredKeys,
    missingRequiredKeys,
    reviewRequiredKeys,
    readyForFactPromotion:
      observations.length > 0 &&
      missingRequiredKeys.length === 0 &&
      reviewRequiredKeys.length === 0,
    createdAt: new Date().toISOString(),
  };
}

export function observationsByKind(
  understanding: DocumentUnderstanding,
  kind: UnderstandingObservationKind,
): readonly UnderstandingObservation[] {
  return understanding.observations.filter(
    (observation) => observation.kind === kind,
  );
}

export function observationsForKey(
  understanding: DocumentUnderstanding,
  key: string,
): readonly UnderstandingObservation[] {
  const normalized = normalizeKey(key);
  return understanding.observations.filter(
    (observation) => observation.key === normalized,
  );
}

export function verifyUnderstandingObservation(
  observation: UnderstandingObservation,
  verifiedBy: string,
): UnderstandingObservation {
  if (!verifiedBy.trim()) throw new Error("verifiedBy is required");
  return {
    ...observation,
    provenance: verifyProvenance(observation.provenance, verifiedBy),
    needsReview: false,
  };
}

export function replaceUnderstandingObservation(
  understanding: DocumentUnderstanding,
  updated: UnderstandingObservation,
): DocumentUnderstanding {
  const observations = understanding.observations.map((observation) =>
    observation.id === updated.id ? updated : observation,
  );
  if (!observations.some((observation) => observation.id === updated.id)) {
    throw new Error("Understanding observation does not belong to document");
  }

  const presentKeys = new Set(observations.map((observation) => observation.key));
  const missingRequiredKeys = understanding.requiredKeys.filter(
    (key) => !presentKeys.has(key),
  );
  const reviewRequiredKeys = [
    ...new Set(
      observations
        .filter((observation) => observation.needsReview)
        .map((observation) => observation.key),
    ),
  ];

  return {
    ...understanding,
    observations,
    missingRequiredKeys,
    reviewRequiredKeys,
    readyForFactPromotion:
      observations.length > 0 &&
      missingRequiredKeys.length === 0 &&
      reviewRequiredKeys.length === 0,
  };
}

/**
 * Promote only observations that are source-backed and no longer require
 * review. AI-inferred/user-provided observations stay out of the fact graph
 * until explicitly verified.
 */
export function understandingToFacts(
  understanding: DocumentUnderstanding,
  subject = String(understanding.documentId),
): readonly Fact[] {
  return understanding.observations
    .filter((observation) => !observation.needsReview)
    .map((observation) =>
      createFact({
        subject,
        predicate: observation.key,
        value: observation.value,
        provenance: {
          level: observation.provenance.level,
          sourceRefs: observation.provenance.sourceRefs,
          modelId: observation.provenance.modelId,
          verifiedBy: observation.provenance.verifiedBy,
        },
        confidence: Number(observation.confidence),
      }),
    );
}
