import canonicalSeeds from "./canonical-workflows.json" with { type: "json" };
import {
  buildCanonicalWorkflowRegistry,
  type WorkflowSeed,
} from "./canonical-workflow-registry.js";
export type { WorkflowSeed } from "./canonical-workflow-registry.js";
import {
  buildWorkflowMaterializationPlan,
  WORKFLOW_MATERIALIZATION_SPEC_VERSION,
  type WorkflowMaterializationSpec,
  type WorkflowStartTemplate,
} from "./workflow-materialization.js";

export type ReviewedFactoryTemplateFamily = WorkflowStartTemplate;

export type ReviewedFactoryTemplateRequest = Readonly<{
  id: string;
  label: string;
  startTemplate: ReviewedFactoryTemplateFamily;
  authority?: WorkflowMaterializationSpec["authority"];
  legacyGoldId?: string;
}>;

export type ReviewedFactoryBootstrapFile = Readonly<{
  path: string;
  content: string;
}>;

export type ReviewedFactoryBuildPlan = Readonly<{
  request: ReviewedFactoryTemplateRequest;
  spec: WorkflowMaterializationSpec;
  canonicalId: string;
  sectionId: string;
  slug: string;
  bootstrapFiles: readonly ReviewedFactoryBootstrapFile[];
  filePaths: readonly string[];
}>;

function renderRecordsRequestConfig(slug: string, label: string): string {
  return `import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "${slug}",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/${slug}",
  startPath: "/records-request/workflows/${slug}/start",
  title: ${JSON.stringify(label)},
  seoTitle: ${JSON.stringify(`${label} | Records Requests | MailMyPDF`)},
  seoDescription: ${JSON.stringify(`Use the ${label} workflow to organize the requester, agency, records scope, supporting context, reviewable correspondence, mailing, and proof record.`)},
  eyebrow: "Records Requests workflow",
  heroTitle: ${JSON.stringify(label)},
  heroDescription: ${JSON.stringify(`Use a guided ${label.toLowerCase()} workflow built around the records you want, the receiving agency, confirmed facts, optional context documents, exact review, mailing, and proof.`)},
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
`;
}

export function buildReviewedFactoryTemplatePlan(
  request: ReviewedFactoryTemplateRequest,
): ReviewedFactoryBuildPlan {
  const id = request.id.trim();
  const label = request.label.trim();
  if (
    request.startTemplate === "records-request" &&
    !/^records-request\/[a-z0-9]+(?:-[a-z0-9]+)*-records-request$/.test(id)
  ) {
    throw new Error(
      "Autonomous Records Request workflow IDs must use records-request/<slug>-records-request.",
    );
  }

  const spec: WorkflowMaterializationSpec = Object.freeze({
    schemaVersion: WORKFLOW_MATERIALIZATION_SPEC_VERSION,
    id,
    label,
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
  const workflowRoot = `${materialization.sectionId}/workflows/${materialization.slug}`;
  const bootstrapFiles = request.startTemplate === "records-request"
    ? Object.freeze([
        Object.freeze({
          path: `${workflowRoot}/workflow.spec.json`,
          content: JSON.stringify(spec, null, 2) + "\n",
        }),
        Object.freeze({
          path: `${workflowRoot}/config.ts`,
          content: renderRecordsRequestConfig(materialization.slug, label),
        }),
      ])
    : Object.freeze([]);

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
    bootstrapFiles,
    filePaths: Object.freeze([
      ...bootstrapFiles.map((file) => file.path),
      ...materialization.files.map((file) => file.path),
    ]),
  });
}


export type ReviewedFactoryRepositoryFile = Readonly<{
  path: string;
  content: string;
}>;

export type ReviewedFactoryRepositoryPlan = Readonly<{
  build: ReviewedFactoryBuildPlan;
  files: readonly ReviewedFactoryRepositoryFile[];
}>;

function canonicalRegistryContent(seeds: readonly WorkflowSeed[]): string {
  return "[\n" + seeds.map((seed) => `  ${JSON.stringify(seed)}`).join(",\n") + "\n]\n";
}

function workflowInventoryContent(seeds: readonly WorkflowSeed[]): string {
  const registry = buildCanonicalWorkflowRegistry(seeds);
  const inventory = {
    generatedFrom: "packages/workflows/src/canonical-workflows.json",
    total: registry.length,
    workflows: registry.map((workflow) => ({
      id: workflow.id,
      vertical: workflow.sectionId,
      route: workflow.publicHref,
      maturity: workflow.maturity,
      hasGoldContent: workflow.legacyGoldId !== null,
      hasApiEndpoint: workflow.execution?.kind === "platform",
      sourceVerified: workflow.authority !== null,
      testStatus: "pending",
      lastReviewed: workflow.authority?.reviewedAt ?? null,
    })),
  };
  return JSON.stringify(inventory, null, 2) + "\n";
}

/**
 * Produce the exact repository patch for one reviewed new Records Request
 * workflow. Existing canonical IDs are deliberately rejected: adoption of
 * existing hand-authored/catalog routes needs a separate reviewed migration.
 */
export function buildReviewedFactoryRepositoryPlan(
  request: ReviewedFactoryTemplateRequest,
  baseSeeds: readonly WorkflowSeed[] = canonicalSeeds as readonly WorkflowSeed[],
): ReviewedFactoryRepositoryPlan {
  const build = buildReviewedFactoryTemplatePlan(request);
  if (build.request.startTemplate !== "records-request") {
    throw new Error(
      "Autonomous repository materialization currently supports records-request only.",
    );
  }
  const seeds = [...baseSeeds];

  if (seeds.some((seed) => seed.id === build.canonicalId)) {
    throw new Error(
      `Autonomous factory build refuses existing canonical workflow ${build.canonicalId}; use a reviewed adoption path instead.`,
    );
  }

  const newSeed = buildWorkflowMaterializationPlan(build.spec).canonicalSeed;
  const lastSectionIndex = seeds.reduce(
    (last, seed, index) =>
      seed.id.startsWith(`${build.sectionId}/`) ? index : last,
    -1,
  );
  seeds.splice(
    lastSectionIndex >= 0 ? lastSectionIndex + 1 : seeds.length,
    0,
    newSeed,
  );

  // Fail closed on duplicate runtime slugs, invalid policy families, and any
  // canonical registry invariant before emitting a remote repository patch.
  buildCanonicalWorkflowRegistry(seeds);

  const materialization = buildWorkflowMaterializationPlan(build.spec);
  const files: ReviewedFactoryRepositoryFile[] = [
    ...build.bootstrapFiles,
    ...materialization.files,
    {
      path: "packages/workflows/src/canonical-workflows.json",
      content: canonicalRegistryContent(seeds),
    },
    {
      path: "mailmypdf/WORKFLOW_INVENTORY.json",
      content: workflowInventoryContent(seeds),
    },
  ];

  return Object.freeze({
    build,
    files: Object.freeze(files.map((file) => Object.freeze({ ...file }))),
  });
}
