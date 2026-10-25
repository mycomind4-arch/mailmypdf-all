import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReviewedFactoryTemplatePlan,
  type FactoryJob,
  type ReviewedFactoryTemplateRequest,
  type WorkflowSeed,
} from "@mailmypdf/workflows";
import {
  buildFactoryProposalPlan,
} from "../src/studio/factory-proposal-plan";

function factoryJob(request: ReviewedFactoryTemplateRequest): FactoryJob {
  const build = buildReviewedFactoryTemplatePlan(request);
  return {
    build: {
      request: build.request,
      canonicalId: build.canonicalId,
      sectionId: build.sectionId,
      slug: build.slug,
      filePaths: build.filePaths,
    },
  } as unknown as FactoryJob;
}

test("remote proposal plan emits the deterministic new Records Request patch", () => {
  const job = factoryJob({
    id: "records-request/city-contracts-records-request",
    label: "City Contracts Records Request",
    startTemplate: "records-request",
  });
  const seeds: readonly WorkflowSeed[] = [
    {
      id: "records-request/existing-records-request",
      label: "Existing Records Request",
    },
  ];

  const plan = buildFactoryProposalPlan({
    job,
    canonicalSeeds: seeds,
    profileSpecs: [],
    existingConfig: null,
    existingSpec: null,
  });

  const paths = new Set(plan.files.map((file) => file.path));
  assert.ok(paths.has("records-request/workflows/city-contracts-records-request/config.ts"));
  assert.ok(paths.has("records-request/workflows/city-contracts-records-request/workflow.spec.json"));
  assert.ok(paths.has("records-request/workflows/city-contracts-records-request/start/index.tsx"));
  assert.ok(paths.has("mailmypdf/src/routes/records-request/workflows/city-contracts-records-request/start/index.tsx"));
  assert.ok(paths.has("packages/workflows/src/canonical-workflows.json"));
  assert.ok(paths.has("mailmypdf/WORKFLOW_INVENTORY.json"));

  const config = plan.files.find((file) => file.path === plan.configPath);
  assert.ok(config);
  assert.match(config.content, /indexable: false/);

  const registry = plan.files.find(
    (file) => file.path === "packages/workflows/src/canonical-workflows.json",
  );
  assert.ok(registry);
  const canonical = JSON.parse(registry.content) as Array<{
    id: string;
    execution?: { policyFamily?: string };
  }>;
  const generated = canonical.find(
    (entry) => entry.id === "records-request/city-contracts-records-request",
  );
  assert.equal(generated?.execution?.policyFamily, "records-request");
});

test("catalog adoption preserves reviewed config by omitting it from the write plan", () => {
  const job = factoryJob({
    id: "records-request/police-records-request",
    label: "Police Records Request",
    startTemplate: "records-request",
    adoptExisting: true,
    legacyGoldId: "records/police-records",
  });

  const plan = buildFactoryProposalPlan({
    job,
    canonicalSeeds: [
      {
        id: "records-request/police-records-request",
        label: "Police Records Request",
        legacyGoldId: "records/police-records",
      },
    ],
    profileSpecs: [],
    existingConfig: "export default { reviewed: true }\n",
    existingSpec: null,
  });

  assert.equal(
    plan.files.some((file) => file.path === plan.configPath),
    false,
  );
  const registry = plan.files.find(
    (file) => file.path === "packages/workflows/src/canonical-workflows.json",
  );
  assert.ok(registry);
  const canonical = JSON.parse(registry.content) as Array<{
    id: string;
    legacyGoldId?: string;
    execution?: { policyFamily?: string };
  }>;
  const adopted = canonical.find(
    (entry) => entry.id === "records-request/police-records-request",
  );
  assert.equal(adopted?.legacyGoldId, "records/police-records");
  assert.equal(adopted?.execution?.policyFamily, "records-request");
});

test("remote proposal plan refuses partially adopted workflows", () => {
  const job = factoryJob({
    id: "records-request/police-records-request",
    label: "Police Records Request",
    startTemplate: "records-request",
    adoptExisting: true,
  });

  assert.throws(
    () =>
      buildFactoryProposalPlan({
        job,
        canonicalSeeds: [
          {
            id: "records-request/police-records-request",
            label: "Police Records Request",
          },
        ],
        profileSpecs: [],
        existingConfig: "export default {}\n",
        existingSpec: "{}\n",
      }),
    /already has workflow\.spec\.json/,
  );
});
