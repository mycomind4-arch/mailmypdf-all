import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkflowManifest } from "../src/workflow-blueprints.js";
import { createPlatformCapabilityBundle } from "../src/platform-capability-bundle.js";

function manifest() {
  return buildWorkflowManifest({
    id: "bundle-fixture",
    vertical: "notice-respond",
    title: "Bundle Fixture",
    route: "/notice-respond/workflows/bundle-fixture",
    archetype: "official-response",
    adapters: ["government"],
    commerce: "none",
  });
}

test("platform capability bundle reports exact missing executable handlers", () => {
  const workflow = manifest();
  const first = workflow.steps![0]!.uses[0]!;
  const bundle = createPlatformCapabilityBundle({
    [first]: async () => ({
      capability: first,
      status: "passed",
      messages: [],
    }),
  });

  const audit = bundle.audit(workflow);
  assert.equal(audit.ready, false);
  assert.ok(audit.required.includes(first));
  assert.ok(!audit.missing.includes(first));
  assert.ok(audit.missing.length > 0);
});

test("one platform bundle can satisfy every executable step capability", () => {
  const workflow = manifest();
  const executors: Record<string, any> = {};

  for (const capability of new Set(workflow.steps!.flatMap((step) => step.uses))) {
    executors[capability] = async () => ({
      capability,
      status: "passed",
      messages: [],
    });
  }

  const bundle = createPlatformCapabilityBundle(executors);
  assert.equal(bundle.audit(workflow).ready, true);
  assert.doesNotThrow(() => bundle.assertReady(workflow));
});

test("bundle rejects handlers that return another capability identity", async () => {
  const bundle = createPlatformCapabilityBundle({
    security: async () => ({
      capability: "identity",
      status: "passed",
      messages: [],
    }),
  });

  await assert.rejects(
    () => bundle.runtime.executeCapability(
      {
        id: "bad-handler",
        vertical: "fixture",
        title: "Bad handler",
        route: "/bad-handler",
        pipeline: "P01_CORE_MAIL",
        adapters: [],
        requiredCapabilities: ["security"],
        optionalCapabilities: [],
        notApplicableCapabilities: [],
        maturity: "wired",
        primaryInput: "case",
        requiresHumanReview: false,
        allowsConsequentialAction: false,
      },
      "security",
      {
        matterId: "m1",
        actorId: "u1",
        scopes: [],
        approvals: [],
        input: {},
        prior: new Map(),
      },
    ),
    /returned result for identity/,
  );
});
