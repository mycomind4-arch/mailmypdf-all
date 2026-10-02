import {
  buildWorkflowMaterializationPlan,
  WORKFLOW_MATERIALIZATION_SPEC_VERSION,
  type WorkflowMaterializationSpec,
  type WorkflowStartTemplate,
} from "./workflow-materialization.js";

export type ReviewedNoticeResponseOption = Readonly<{
  value: string;
  label: string;
}>;

export type ReviewedNoticeResponseProfile = Readonly<{
  noticeLabel: string;
  primaryDocumentId: string;
  primaryDocumentLabel: string;
  extractionSchema: string;
  sourcePurpose: string;
  responseModeLabel: string;
  responseModes: readonly ReviewedNoticeResponseOption[];
  evidenceKinds: readonly ReviewedNoticeResponseOption[];
  explanationRequiredModes: readonly string[];
  explanationLabel: string;
  explanationHint: string;
  requestedActionDefault: string;
  analysisInstructions: string;
  draftInstructions: string;
}>;

export type ReviewedFactoryTemplateRequest = Readonly<{
  id: string;
  label: string;
  startTemplate: WorkflowStartTemplate;
  authority?: WorkflowMaterializationSpec["authority"];
  legacyGoldId?: string;
  /**
   * Authority-sensitive Notice Respond builds require a reviewer-authored
   * family profile before the machine executor may materialize them.
   *
   * Optional at the type level only so durable v1 jobs created before the
   * profile adapter continue to restore. The Notice Respond executor refuses
   * to run when this profile is absent.
   */
  noticeProfile?: ReviewedNoticeResponseProfile;
}>;

export type ReviewedFactoryBuildPlan = Readonly<{
  request: ReviewedFactoryTemplateRequest;
  spec: WorkflowMaterializationSpec;
  canonicalId: string;
  sectionId: string;
  slug: string;
  filePaths: readonly string[];
}>;

const TOKEN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

function reviewedText(
  value: unknown,
  label: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be text.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`${label} is invalid.`);
  }
  return normalized;
}

function reviewedToken(
  value: unknown,
  label: string,
  maxLength = 160,
): string {
  const normalized = reviewedText(value, label, maxLength);
  if (!TOKEN.test(normalized)) {
    throw new Error(`${label} must use lowercase token characters.`);
  }
  return normalized;
}

function reviewedOptions(
  value: unknown,
  label: string,
  options: { min: number; max: number },
): readonly ReviewedNoticeResponseOption[] {
  if (!Array.isArray(value) || value.length < options.min || value.length > options.max) {
    throw new Error(`${label} must contain ${options.min}-${options.max} options.`);
  }
  const seen = new Set<string>();
  return Object.freeze(
    value.map((raw, index) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error(`${label} option ${index + 1} is invalid.`);
      }
      const item = raw as Record<string, unknown>;
      const option = Object.freeze({
        value: reviewedToken(item.value, `${label} option value`, 100),
        label: reviewedText(item.label, `${label} option label`, 300),
      });
      if (seen.has(option.value)) {
        throw new Error(`${label} contains duplicate value ${option.value}.`);
      }
      seen.add(option.value);
      return option;
    }),
  );
}

/**
 * Validate and deep-freeze a reviewer-authored Notice Respond profile.
 * No legal rules, deadlines, authorities, addresses, or remedies are inferred
 * here; the factory only persists the exact reviewed profile.
 */
export function normalizeReviewedNoticeResponseProfile(
  value: unknown,
): ReviewedNoticeResponseProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Notice Respond builds require a reviewed noticeProfile object.");
  }
  const source = value as Record<string, unknown>;
  const responseModes = reviewedOptions(source.responseModes, "Response modes", {
    min: 1,
    max: 12,
  });
  const evidenceKinds = reviewedOptions(source.evidenceKinds, "Evidence kinds", {
    min: 1,
    max: 24,
  });
  if (
    !Array.isArray(source.explanationRequiredModes) ||
    source.explanationRequiredModes.some((entry) => typeof entry !== "string") ||
    source.explanationRequiredModes.length > responseModes.length
  ) {
    throw new Error("Explanation-required modes are invalid.");
  }
  const responseModeValues = new Set(responseModes.map((mode) => mode.value));
  const explanationRequiredModes = Object.freeze(
    source.explanationRequiredModes.map((entry) =>
      reviewedToken(entry, "Explanation-required mode", 100),
    ),
  );
  for (const mode of explanationRequiredModes) {
    if (!responseModeValues.has(mode)) {
      throw new Error(
        `Explanation-required mode ${mode} is not a reviewed response mode.`,
      );
    }
  }

  return Object.freeze({
    noticeLabel: reviewedText(source.noticeLabel, "Notice label", 300),
    primaryDocumentId: reviewedToken(
      source.primaryDocumentId,
      "Primary document id",
      160,
    ),
    primaryDocumentLabel: reviewedText(
      source.primaryDocumentLabel,
      "Primary document label",
      500,
    ),
    extractionSchema: reviewedToken(
      source.extractionSchema,
      "Extraction schema",
      200,
    ),
    sourcePurpose: reviewedToken(source.sourcePurpose, "Source purpose", 200),
    responseModeLabel: reviewedText(
      source.responseModeLabel,
      "Response mode label",
      500,
    ),
    responseModes,
    evidenceKinds,
    explanationRequiredModes,
    explanationLabel: reviewedText(
      source.explanationLabel,
      "Explanation label",
      500,
    ),
    explanationHint: reviewedText(
      source.explanationHint,
      "Explanation hint",
      4_000,
    ),
    requestedActionDefault: reviewedText(
      source.requestedActionDefault,
      "Requested action default",
      4_000,
    ),
    analysisInstructions: reviewedText(
      source.analysisInstructions,
      "Analysis instructions",
      12_000,
    ),
    draftInstructions: reviewedText(
      source.draftInstructions,
      "Draft instructions",
      12_000,
    ),
  });
}

export function buildReviewedFactoryTemplatePlan(
  request: ReviewedFactoryTemplateRequest,
): ReviewedFactoryBuildPlan {
  const noticeProfile =
    request.startTemplate === "notice-response" && request.noticeProfile
      ? normalizeReviewedNoticeResponseProfile(request.noticeProfile)
      : undefined;

  const spec: WorkflowMaterializationSpec = Object.freeze({
    schemaVersion: WORKFLOW_MATERIALIZATION_SPEC_VERSION,
    id: request.id.trim(),
    label: request.label.trim(),
    execution: Object.freeze({
      kind: "platform",
      entry: "workspace-start",
      policyFamily: request.startTemplate,
    }),
    ...(request.authority ? { authority: Object.freeze({ ...request.authority }) } : {}),
    ...(request.legacyGoldId ? { legacyGoldId: request.legacyGoldId } : {}),
    startTemplate: request.startTemplate,
  });

  const materialization = buildWorkflowMaterializationPlan(spec);

  return Object.freeze({
    request: Object.freeze({
      id: spec.id,
      label: spec.label,
      startTemplate: request.startTemplate,
      ...(request.authority ? { authority: Object.freeze({ ...request.authority }) } : {}),
      ...(request.legacyGoldId ? { legacyGoldId: request.legacyGoldId } : {}),
      ...(noticeProfile ? { noticeProfile } : {}),
    }),
    spec,
    canonicalId: materialization.canonicalSeed.id,
    sectionId: materialization.sectionId,
    slug: materialization.slug,
    filePaths: Object.freeze(materialization.files.map((file) => file.path)),
  });
}
