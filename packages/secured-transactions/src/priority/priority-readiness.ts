import type {
  JurisdictionRuleResult,
  UccPriorityRuleData,
} from "@mailmypdf/jurisdiction-rules";
import type { SecuredTransactionSourceRef } from "../types.js";

export interface CompetingInterestEvidenceRecord {
  id: string;
  claimantEntityId: string;
  interestKind: string;
  jurisdiction: string;
  sourceRefs: readonly SecuredTransactionSourceRef[];
  eventDate?: string;
  externalRecordId?: string;
  status?: string;
  attributes?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface CompetingInterestMatrix {
  jurisdiction: string;
  records: readonly CompetingInterestEvidenceRecord[];
  sourceRefIds: readonly string[];
  warnings: readonly string[];
}

export interface PriorityAnalysisReadiness {
  status: "ready-for-rule-analysis" | "human-review-required" | "blocked" | "unsupported";
  ruleId?: string;
  jurisdiction: string;
  missingFieldsByRecord: Readonly<Record<string, readonly string[]>>;
  reasons: readonly string[];
  requiresHumanReview: boolean;
  priorityDetermined: false;
}

function validDate(value: string | undefined): boolean {
  return value === undefined || Number.isFinite(Date.parse(value));
}

export function buildCompetingInterestMatrix(
  records: readonly CompetingInterestEvidenceRecord[],
): CompetingInterestMatrix {
  if (records.length === 0) {
    return {
      jurisdiction: "",
      records: [],
      sourceRefIds: [],
      warnings: ["no-competing-interest-records-supplied"],
    };
  }

  const jurisdictions = [...new Set(records.map((record) => record.jurisdiction.trim()).filter(Boolean))];
  const warnings: string[] = [];
  if (jurisdictions.length !== 1) warnings.push("multiple-or-missing-jurisdictions");

  const normalized = records.map((record) => {
    if (!record.id.trim()) throw new Error("Competing-interest record id is required.");
    if (!record.claimantEntityId.trim()) throw new Error(`Claimant entity id is required for ${record.id}.`);
    if (!record.interestKind.trim()) throw new Error(`Interest kind is required for ${record.id}.`);
    if (record.sourceRefs.length === 0) warnings.push(`record:${record.id}:missing-source-provenance`);
    if (!validDate(record.eventDate)) warnings.push(`record:${record.id}:invalid-event-date`);
    return Object.freeze({
      ...record,
      id: record.id.trim(),
      claimantEntityId: record.claimantEntityId.trim(),
      interestKind: record.interestKind.trim(),
      jurisdiction: record.jurisdiction.trim(),
      externalRecordId: record.externalRecordId?.trim() || undefined,
      status: record.status?.trim() || undefined,
    });
  });

  return {
    jurisdiction: jurisdictions.length === 1 ? jurisdictions[0]! : "",
    records: normalized,
    sourceRefIds: [...new Set(normalized.flatMap((record) => record.sourceRefs.map((source) => source.id)))],
    warnings: [...new Set(warnings)],
  };
}

function fieldPresent(
  record: CompetingInterestEvidenceRecord,
  field: string,
): boolean {
  if (field === "eventDate") return Boolean(record.eventDate);
  if (field === "externalRecordId") return Boolean(record.externalRecordId);
  if (field === "status") return Boolean(record.status);
  if (field === "interestKind") return Boolean(record.interestKind);
  if (field === "claimantEntityId") return Boolean(record.claimantEntityId);
  if (field === "jurisdiction") return Boolean(record.jurisdiction);
  return Object.prototype.hasOwnProperty.call(record.attributes ?? {}, field);
}

export function assessPriorityAnalysisReadiness(input: {
  matrix: CompetingInterestMatrix;
  rule: JurisdictionRuleResult<UccPriorityRuleData>;
}): PriorityAnalysisReadiness {
  if (input.rule.status === "unsupported") {
    return {
      status: "unsupported",
      jurisdiction: input.rule.jurisdiction,
      missingFieldsByRecord: {},
      reasons: [
        ...input.rule.reasonCodes,
        "No supported priority rule pack is available for this jurisdiction/date.",
      ],
      requiresHumanReview: false,
      priorityDetermined: false,
    };
  }

  if (
    input.rule.status !== "resolved" ||
    input.rule.requiresHumanReview ||
    !input.rule.value ||
    !input.rule.ruleId
  ) {
    return {
      status: "human-review-required",
      jurisdiction: input.rule.jurisdiction,
      ruleId: input.rule.ruleId,
      missingFieldsByRecord: {},
      reasons: [
        ...input.rule.reasonCodes,
        "Priority rule coverage is unresolved or requires review.",
      ],
      requiresHumanReview: true,
      priorityDetermined: false,
    };
  }

  if (!input.matrix.jurisdiction || input.matrix.jurisdiction !== input.rule.jurisdiction) {
    return {
      status: "human-review-required",
      jurisdiction: input.rule.jurisdiction,
      ruleId: input.rule.ruleId,
      missingFieldsByRecord: {},
      reasons: ["Competing-interest records do not resolve to the same jurisdiction as the priority rule pack."],
      requiresHumanReview: true,
      priorityDetermined: false,
    };
  }

  if (input.matrix.records.length === 0) {
    return {
      status: "blocked",
      jurisdiction: input.rule.jurisdiction,
      ruleId: input.rule.ruleId,
      missingFieldsByRecord: {},
      reasons: ["No competing-interest evidence records were supplied."],
      requiresHumanReview: false,
      priorityDetermined: false,
    };
  }

  const missingFieldsByRecord: Record<string, readonly string[]> = {};
  for (const record of input.matrix.records) {
    const missing = input.rule.value.requiredRecordFields.filter(
      (field) => !fieldPresent(record, field),
    );
    if (record.sourceRefs.length === 0) missing.push("sourceRefs");
    if (missing.length) missingFieldsByRecord[record.id] = [...new Set(missing)];
  }

  const missingIds = Object.keys(missingFieldsByRecord);
  if (missingIds.length) {
    return {
      status: "blocked",
      jurisdiction: input.rule.jurisdiction,
      ruleId: input.rule.ruleId,
      missingFieldsByRecord,
      reasons: [`Required priority-analysis fields are missing for record(s): ${missingIds.join(", ")}.`],
      requiresHumanReview: false,
      priorityDetermined: false,
    };
  }

  return {
    status: "ready-for-rule-analysis",
    jurisdiction: input.rule.jurisdiction,
    ruleId: input.rule.ruleId,
    missingFieldsByRecord: {},
    reasons: [
      "The competing-interest record is complete enough to apply the resolved authority-backed priority rule.",
      "This readiness check does not rank interests or determine first priority.",
    ],
    requiresHumanReview: false,
    priorityDetermined: false,
  };
}
