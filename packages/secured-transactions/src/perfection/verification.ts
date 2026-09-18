import type { PerfectionMethodSelection } from "./method-selector.js";
import type { PerfectionEventRecord } from "./perfection-event.js";

export interface PerfectionEvidenceVerification {
  status: "evidence-verified" | "human-review-required" | "blocked";
  reasons: readonly string[];
  sourceRefIds: readonly string[];
  requiresHumanReview: boolean;
  perfectionLegallyDetermined: false;
}

export function verifyPerfectionEvidence(input: {
  selection: PerfectionMethodSelection;
  event: PerfectionEventRecord;
}): PerfectionEvidenceVerification {
  const reasons: string[] = [];

  if (input.selection.status !== "selected" || !input.selection.selectedMethod) {
    return {
      status: input.selection.requiresHumanReview
        ? "human-review-required"
        : "blocked",
      reasons: ["A supported perfection method must be selected before an execution event can be verified."],
      sourceRefIds: input.event.sourceRefs.map((source) => source.id),
      requiresHumanReview: input.selection.requiresHumanReview,
      perfectionLegallyDetermined: false,
    };
  }

  if (input.event.method !== input.selection.selectedMethod) {
    return {
      status: "human-review-required",
      reasons: ["The recorded execution method does not match the approved perfection-method selection."],
      sourceRefIds: input.event.sourceRefs.map((source) => source.id),
      requiresHumanReview: true,
      perfectionLegallyDetermined: false,
    };
  }

  if (input.event.jurisdiction !== input.selection.jurisdiction) {
    return {
      status: "human-review-required",
      reasons: ["The recorded execution jurisdiction does not match the approved perfection-method selection."],
      sourceRefIds: input.event.sourceRefs.map((source) => source.id),
      requiresHumanReview: true,
      perfectionLegallyDetermined: false,
    };
  }

  if (input.event.status !== "completed") {
    return {
      status: "blocked",
      reasons: [`The perfection event is ${input.event.status}, not completed.`],
      sourceRefIds: input.event.sourceRefs.map((source) => source.id),
      requiresHumanReview: false,
      perfectionLegallyDetermined: false,
    };
  }

  if (input.event.sourceRefs.length === 0) {
    return {
      status: "blocked",
      reasons: ["Completed execution evidence is missing source provenance."],
      sourceRefIds: [],
      requiresHumanReview: false,
      perfectionLegallyDetermined: false,
    };
  }

  reasons.push(
    "The recorded event matches the selected method and jurisdiction and has source evidence.",
    "Evidence verification does not independently establish legal perfection or priority.",
  );

  return {
    status: "evidence-verified",
    reasons,
    sourceRefIds: input.event.sourceRefs.map((source) => source.id),
    requiresHumanReview: false,
    perfectionLegallyDetermined: false,
  };
}
