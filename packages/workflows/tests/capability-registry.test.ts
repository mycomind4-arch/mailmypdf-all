import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { CAPABILITIES, CapabilityRegistry, capabilityIds, capabilityRegistry, compileCapabilityManifest, hasCapability, resolveCapabilityDependencies, validateCapabilityRegistry } from "../src/capability-registry.js";
import { CAPABILITY_PACKAGE_CONTRIBUTIONS, validateCapabilityAdapters } from "../src/capability-adapters.js";
import { validateCapabilityValue } from "../src/capability-contract-validation.js";
import { buildCapabilityInventory, renderCapabilityInventoryMarkdown } from "../src/capability-inventory.js";
import type { WorkflowCapability } from "../src/workflow-manifest.js";

const repositoryRoot = process.cwd().endsWith("packages/workflows")
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

test("capability registry includes the complete cross-workflow platform surface", () => {
  const required: WorkflowCapability[] = [
    "identity","matterState","aiExecution","secureUpload","documentStorage","documentScanning","retention",
    "visionAnalysis","pdfGeneration","packetAssembly","pricing","payment","addressVerification",
    "notifications","resilience","observability","acceptanceTesting","proofAudit","archive",
  ];
  for (const id of required) {
    assert.equal(hasCapability(id),true,`missing capability ${id}`);
    assert.ok(CAPABILITIES[id].implementation.startsWith("@mailmypdf/"));
  }
  assert.equal(new Set(capabilityIds).size,capabilityIds.length);
});


test("capability dependency graph is acyclic and consequential actions remain gated", () => {
  assert.deepEqual(validateCapabilityRegistry(), []);
});


test("every capability implementation package exists in the workspace", () => {
  for (const capability of Object.values(CAPABILITIES)) {
    const packageFolder = capability.implementation.replace("@mailmypdf/", "");
    const packageJson = path.join(repositoryRoot, "packages", packageFolder, "package.json");
    assert.equal(
      existsSync(packageJson),
      true,
      `${capability.id} points to missing package ${capability.implementation}`,
    );
  }
});

test("canonical capability contracts expose schemas, security, failure, fixture, certification, and runtime metadata", () => {
  for (const capability of Object.values(CAPABILITIES)) {
    assert.match(capability.version, /^\d+\.\d+\.\d+$/);
    assert.ok(capability.inputSchema.type);
    assert.ok(capability.outputSchema.type);
    assert.equal(typeof capability.security.failClosed, "boolean");
    assert.ok(capability.failureModes.length > 0);
    assert.ok(["planned", "implemented", "certified"].includes(capability.certification.state));
    assert.ok(capability.runtimeBindings.length > 0);
    assert.ok(capability.sources.length > 0);
    for (const fixture of capability.fixtures) {
      if (fixture.status === "present") {
        assert.equal(existsSync(path.join(repositoryRoot, fixture.path)), true, `${capability.id} fixture is missing: ${fixture.path}`);
      }
    }
    for (const binding of capability.runtimeBindings) {
      const packageFolder = binding.package.replace("@mailmypdf/", "");
      const packageJsonPath = path.join(repositoryRoot, "packages", packageFolder, "package.json");
      assert.equal(existsSync(packageJsonPath), true, `${capability.id} binding package is missing: ${binding.package}`);
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { main?: string; exports?: Record<string, unknown> };
      const exported = binding.exportPath === "."
        ? Boolean(packageJson.main || packageJson.exports?.["."])
        : Boolean(packageJson.exports?.[binding.exportPath]);
      assert.equal(exported, true, `${capability.id} binding export is missing: ${binding.package}${binding.exportPath}`);
    }
  }
});

test("discovery and composition resolve transitive dependencies for the factory", () => {
  assert.ok(capabilityRegistry.discover({ category: "documents" }).length > 0);
  const composition = capabilityRegistry.compose({
    required: ["mailing"],
    optional: ["tracking"],
    jurisdiction: "unspecified",
  });
  assert.equal(composition.executable, true);
  assert.ok(composition.resolved.includes("packetAssembly"));
  assert.ok(composition.resolved.includes("approval"));
  assert.ok(composition.resolved.indexOf("packetAssembly") < composition.resolved.indexOf("mailing"));
  assert.ok(composition.required.includes("packetAssembly"));
  assert.ok(composition.required.includes("approval"));
  const manifest = compileCapabilityManifest({ workflowId: "fixture-mailing", composition });
  assert.equal(manifest.schemaVersion, "mailmypdf.capabilities/v2");
  assert.equal(manifest.registryVersion, "2.0.0");
  assert.equal(manifest.capabilities.mailing?.certification.state, "certified");
  assert.ok((manifest.capabilities.mailing?.requirements.length ?? 0) > 0);
  assert.ok((manifest.bindings.mailing?.length ?? 0) > 0);
});

test("dependency resolution and adapter validation fail safely", () => {
  const result = resolveCapabilityDependencies(["mailing"]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(validateCapabilityAdapters(), []);
  const invalid = capabilityRegistry.compose({ required: ["does-not-exist"] });
  assert.equal(invalid.executable, false);
  assert.ok(invalid.diagnostics.some((message) => message.includes("unknown capability")));
});

test("registry instances resolve and compile only from their own definitions", () => {
  const definitions = {
    ...CAPABILITIES,
    translation: {
      ...CAPABILITIES.translation,
      dependencies: ["pricing"] as const,
      requirements: [{ kind: "capability" as const, capability: "pricing" as const, reason: "custom fixture dependency" }],
    },
  };
  const registry = new CapabilityRegistry(definitions);
  const resolution = registry.resolve(["translation"]);
  assert.deepEqual(resolution.errors, []);
  assert.deepEqual(resolution.ordered, ["pricing", "translation"]);
  assert.ok(!resolution.ordered.includes("provenance"));
});

test("composition modes distinguish plans, executable bindings, and production certification", () => {
  const planned = capabilityRegistry.compose({ required: ["uccFiling"], mode: "plan" });
  assert.equal(planned.executable, true);

  const executable = capabilityRegistry.compose({ required: ["uccFiling"], mode: "execute" });
  assert.equal(executable.executable, false);
  assert.ok(executable.issues.some((issue) => issue.code === "CAPABILITY_NOT_IMPLEMENTED" && issue.capability === "uccFiling"));

  const production = capabilityRegistry.compose({ required: ["identity"], mode: "production" });
  assert.equal(production.executable, false);
  assert.ok(production.issues.some((issue) => issue.code === "CAPABILITY_NOT_CERTIFIED"));

  const incompatible = capabilityRegistry.compose({
    required: ["mailing"],
    versionRequirements: { mailing: "^2.0.0" },
  });
  assert.equal(incompatible.executable, false);
  assert.ok(incompatible.issues.some((issue) => issue.code === "VERSION_INCOMPATIBLE"));
});

test("master inventory reports certified, implemented, planned, adapters, and explicit gaps", () => {
  const inventory = buildCapabilityInventory();
  assert.equal(inventory.total, capabilityIds.length);
  assert.ok(inventory.certified.includes("mailing"));
  assert.ok(inventory.implemented.includes("piiDetection"));
  assert.ok(inventory.planned.includes("titleLienSearch"));
  assert.ok(inventory.gaps.some((item) => item.capability === "uccFiling"));
  assert.deepEqual(inventory.validationErrors, []);
  assert.ok(inventory.adapterPackages.includes("@mailmypdf/secured-transactions"));
  assert.match(renderCapabilityInventoryMarkdown(), /Master Capability Registry Inventory/);
  assert.ok(CAPABILITY_PACKAGE_CONTRIBUTIONS.some((item) => item.package === "@mailmypdf/jurisdiction-rules"));
});

test("capability contract validation rejects malformed and unsafe inputs", () => {
  const schema = {
    type: "object" as const,
    properties: {
      matterId: { type: "string" as const },
      approved: { type: "boolean" as const },
    },
    required: ["matterId", "approved"],
    additionalProperties: false,
  };
  assert.equal(validateCapabilityValue(schema, { matterId: "m-1", approved: true }).length, 0);
  const issues = validateCapabilityValue(schema, { matterId: 42, extra: "blocked" });
  assert.ok(issues.some((issue) => issue.code === "type"));
  assert.ok(issues.some((issue) => issue.code === "required"));
  assert.ok(issues.some((issue) => issue.code === "unknown_property"));
});
