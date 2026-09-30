import {
  buildWorkflowMaterializationPlan,
  WORKFLOW_MATERIALIZATION_SPEC_VERSION,
  type WorkflowMaterializationSpec,
  type WorkflowStartTemplate,
} from "./workflow-materialization.js";

export type ReviewedFactoryTemplateRequest = Readonly<{
  id: string;
  label: string;
  startTemplate: WorkflowStartTemplate;
  authority?: WorkflowMaterializationSpec["authority"];
  legacyGoldId?: string;
}>;

export type ReviewedFactoryBuildPlan = Readonly<{
  request: ReviewedFactoryTemplateRequest;
  spec: WorkflowMaterializationSpec;
  canonicalId: string;
  sectionId: string;
  slug: string;
  filePaths: readonly string[];
}>;

export function buildReviewedFactoryTemplatePlan(
  request: ReviewedFactoryTemplateRequest,
): ReviewedFactoryBuildPlan {
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
    }),
    spec,
    canonicalId: materialization.canonicalSeed.id,
    sectionId: materialization.sectionId,
    slug: materialization.slug,
    filePaths: Object.freeze(materialization.files.map((file) => file.path)),
  });
}
