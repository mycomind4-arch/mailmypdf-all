import type {
  JurisdictionRuleResult,
  UccLifecycleAction,
  UccLifecycleRuleData,
} from "@mailmypdf/jurisdiction-rules";
import type { SecuredTransactionSourceRef } from "../types.js";

export interface LifecycleAuthorizationEvidence {
  status: "supported" | "unresolved" | "contradicted";
  sourceRefs: readonly SecuredTransactionSourceRef[];
  reasonCodes?: readonly string[];
}

export interface LifecycleActionRequest {
  action: UccLifecycleAction;
  filingRecordId: string;
  jurisdiction: string;
  requestedAt: string;
  fields: Readonly<Record<string, string | number | boolean | null>>;
  authorization: LifecycleAuthorizationEvidence;
}

export interface LifecycleActionReadiness {
  status: "ready-for-review" | "human-review-required" | "blocked" | "unsupported";
  action: UccLifecycleAction;
  ruleId?: string;
  missingFields: readonly string[];
  reasons: readonly string[];
  authorityRefIds: readonly string[];
  authorizationSourceRefIds: readonly string[];
  requiresHumanReview: boolean;
  canSubmit: false;
}

function present(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function assessLifecycleActionReadiness(input: {
  request: LifecycleActionRequest;
  rule: JurisdictionRuleResult<UccLifecycleRuleData>;
}): LifecycleActionReadiness {
  const { request, rule } = input;
  const authorityRefIds = rule.authorityRefs.map((authority) => authority.id);
  const authorizationSourceRefIds = request.authorization.sourceRefs.map((source) => source.id);

  if (rule.status === "unsupported") {
    return {
      status: "unsupported",
      action: request.action,
      missingFields: [],
      reasons: [
        ...rule.reasonCodes,
        "No supported lifecycle rule pack is available for this jurisdiction/date.",
      ],
      authorityRefIds,
      authorizationSourceRefIds,
      requiresHumanReview: false,
      canSubmit: false,
    };
  }

  if (
    rule.status !== "resolved" ||
    rule.requiresHumanReview ||
    !rule.ruleId ||
    !rule.value
  ) {
    return {
      status: "human-review-required",
      action: request.action,
      ruleId: rule.ruleId,
      missingFields: [],
      reasons: [
        ...rule.reasonCodes,
        "Lifecycle rule coverage is unresolved or requires review.",
      ],
      authorityRefIds,
      authorizationSourceRefIds,
      requiresHumanReview: true,
      canSubmit: false,
    };
  }

  if (rule.jurisdiction !== request.jurisdiction) {
    return {
      status: "blocked",
      action: request.action,
      ruleId: rule.ruleId,
      missingFields: [],
      reasons: ["Lifecycle request jurisdiction does not match the resolved rule pack."],
      authorityRefIds,
      authorizationSourceRefIds,
      requiresHumanReview: false,
      canSubmit: false,
    };
  }

  if (rule.value.action !== request.action) {
    return {
      status: "blocked",
      action: request.action,
      ruleId: rule.ruleId,
      missingFields: [],
      reasons: ["The resolved lifecycle rule pack is for a different action."],
      authorityRefIds,
      authorizationSourceRefIds,
      requiresHumanReview: false,
      canSubmit: false,
    };
  }

  const missingFields = rule.value.requiredFields.filter(
    (field) => !present(request.fields[field]),
  );

  if (missingFields.length > 0) {
    return {
      status: "blocked",
      action: request.action,
      ruleId: rule.ruleId,
      missingFields,
      reasons: [`Required lifecycle fields are missing: ${missingFields.join(", ")}.`],
      authorityRefIds,
      authorizationSourceRefIds,
      requiresHumanReview: false,
      canSubmit: false,
    };
  }

  if (
    request.authorization.status === "supported" &&
    request.authorization.sourceRefs.length === 0
  ) {
    return {
      status: "blocked",
      action: request.action,
      ruleId: rule.ruleId,
      missingFields: [],
      reasons: ["Authorization was marked supported but has no source provenance."],
      authorityRefIds,
      authorizationSourceRefIds,
      requiresHumanReview: false,
      canSubmit: false,
    };
  }

  if (request.authorization.status === "contradicted") {
    return {
      status: "human-review-required",
      action: request.action,
      ruleId: rule.ruleId,
      missingFields: [],
      reasons: [
        ...(request.authorization.reasonCodes ?? []),
        "Lifecycle authorization evidence is contradicted.",
      ],
      authorityRefIds,
      authorizationSourceRefIds,
      requiresHumanReview: true,
      canSubmit: false,
    };
  }

  if (request.authorization.status !== "supported") {
    return {
      status: "blocked",
      action: request.action,
      ruleId: rule.ruleId,
      missingFields: [],
      reasons: [
        ...(request.authorization.reasonCodes ?? []),
        "Supported authorization evidence is required.",
      ],
      authorityRefIds,
      authorizationSourceRefIds,
      requiresHumanReview: false,
      canSubmit: false,
    };
  }

  return {
    status: "ready-for-review",
    action: request.action,
    ruleId: rule.ruleId,
    missingFields: [],
    reasons: [
      "The lifecycle request has the fields required by the resolved authority-backed rule pack and sourced authorization evidence.",
      "Readiness does not submit the action or establish its legal effectiveness.",
    ],
    authorityRefIds,
    authorizationSourceRefIds,
    requiresHumanReview: true,
    canSubmit: false,
  };
}

export interface MonitoringEvent {
  id: string;
  kind: "review-date" | "continuation-window" | "change-event" | "source-refresh";
  dueAt: string;
  sourceRefs: readonly SecuredTransactionSourceRef[];
  note?: string;
}

export interface MonitoringSchedule {
  events: readonly MonitoringEvent[];
  warnings: readonly string[];
}

export function buildMonitoringSchedule(
  events: readonly MonitoringEvent[],
): MonitoringSchedule {
  const warnings: string[] = [];
  const normalized = events.map((event) => {
    if (!event.id.trim()) throw new Error("Monitoring event id is required.");
    if (!Number.isFinite(Date.parse(event.dueAt))) {
      throw new Error(`Monitoring event ${event.id} has an invalid dueAt date/time.`);
    }
    if (event.sourceRefs.length === 0) {
      warnings.push(`event:${event.id}:missing-source-provenance`);
    }
    return Object.freeze({
      ...event,
      id: event.id.trim(),
      dueAt: new Date(event.dueAt).toISOString(),
      note: event.note?.trim() || undefined,
    });
  }).sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  return {
    events: normalized,
    warnings: [...new Set(warnings)],
  };
}
