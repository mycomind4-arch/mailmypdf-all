import { existsSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { CAPABILITIES, capabilityIds, capabilityRegistry, compileCapabilityManifest, hasCapability, resolveCapabilityDependencies, validateCapabilityRegistry } from "../src/capability-registry.js";
import { validateCapabilityAdapters } from "../src/capability-adapters.js";
import { validateCapabilityValue } from "../src/capability-contract-validation.js";
import type { WorkflowCapability } from "../src/workflow-manifest.js";

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
  const packagesRoot = path.resolve(process.cwd(), "..");

  for (const capability of Object.values(CAPABILITIES)) {
    const packageFolder = capability.implementation.replace("@mailmypdf/", "");
    const packageJson = path.join(packagesRoot, packageFolder, "package.json");
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
  const manifest = compileCapabilityManifest({ workflowId: "fixture-mailing", composition });
  assert.equal(manifest.schemaVersion, "mailmypdf.capabilities/v1");
  assert.ok(manifest.bindings.mailing.length > 0);
});

test("dependency resolution and adapter validation fail safely", () => {
  const result = resolveCapabilityDependencies(["mailing"]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(validateCapabilityAdapters(), []);
  const invalid = capabilityRegistry.compose({ required: ["does-not-exist"] });
  assert.equal(invalid.executable, false);
  assert.ok(invalid.diagnostics.some((message) => message.includes("unknown capability")));
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
