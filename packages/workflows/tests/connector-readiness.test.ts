import assert from "node:assert/strict";
import test from "node:test";

import {
  assessConnectorCapabilities,
  buildConnectorAcceptanceCoverage,
  connectorCapabilityVersion,
  dryRunConnectorPlan,
  isCapabilityVersionCompatible,
  isRegisteredConnectorCapability,
} from "../src/connector-readiness.js";

test("connector assessment resolves dependencies and blocks planned bindings", () => {
  const assessment = assessConnectorCapabilities(
    [{ id: "uccFiling", required: true }],
    {
      actor: "authenticated",
      ownership: "verified",
      approvedCapabilities: ["uccFiling"],
    },
  );

  assert.equal(assessment.ready, false);
  assert.ok(assessment.resolved.includes("uccSearch"));
  assert.ok(assessment.resolved.includes("humanReview"));
  assert.ok(
    assessment.diagnostics.some(
      (diagnostic) =>
        diagnostic.capability === "uccFiling" &&
        diagnostic.code === "BINDING_UNAVAILABLE",
    ),
  );
});

test("connector assessment fails closed for unverified ownership and missing approval", () => {
  const ownership = assessConnectorCapabilities(
    [{ id: "documentStorage", required: true }],
    { actor: "authenticated", ownership: "unverified" },
  );
  assert.equal(ownership.ready, false);
  assert.ok(ownership.diagnostics.some((item) => item.code === "OWNERSHIP_REQUIRED"));

  const approval = assessConnectorCapabilities(
    [{ id: "payment", required: true }],
    { actor: "authenticated", ownership: "verified" },
  );
  assert.equal(approval.ready, false);
  assert.ok(approval.diagnostics.some((item) => item.code === "APPROVAL_REQUIRED"));
});

test("connector assessment distinguishes unknown required and optional capabilities", () => {
  assert.equal(isRegisteredConnectorCapability("mailing"), true);
  assert.equal(isRegisteredConnectorCapability("imaginary"), false);
  assert.equal(connectorCapabilityVersion("mailing"), "1.0.0");
  assert.equal(connectorCapabilityVersion("imaginary"), undefined);

  const required = assessConnectorCapabilities(
    [{ id: "imaginary", required: true }],
    { actor: "anonymous", ownership: "not-applicable" },
  );
  assert.equal(required.ready, false);
  assert.equal(required.diagnostics[0]?.severity, "error");

  const optional = assessConnectorCapabilities(
    [{ id: "imaginary", required: false }],
    { actor: "anonymous", ownership: "not-applicable" },
  );
  assert.equal(optional.ready, true);
  assert.equal(optional.diagnostics[0]?.severity, "warning");
});

test("connector assessment reports authentication and version incompatibility", () => {
  const assessment = assessConnectorCapabilities(
    [{ id: "documentStorage", required: true, version: "^2.0.0" }],
    { actor: "anonymous", ownership: "unverified" },
  );
  assert.equal(assessment.ready, false);
  assert.ok(assessment.diagnostics.some((item) => item.code === "AUTHENTICATION_REQUIRED"));
  assert.ok(assessment.diagnostics.some((item) => item.code === "VERSION_INCOMPATIBLE"));
});

test("connector capability versions require matching semantic major versions", () => {
  assert.equal(isCapabilityVersionCompatible("1.4.2", "1.4.2"), true);
  assert.equal(isCapabilityVersionCompatible("1.4.2", "1.4.3"), false);
  assert.equal(isCapabilityVersionCompatible("^1.0.0", "1.4.2"), true);
  assert.equal(isCapabilityVersionCompatible("^1.2.0", "1.9.0"), true);
  assert.equal(isCapabilityVersionCompatible("^1.4.2", "1.0.0"), false);
  assert.equal(isCapabilityVersionCompatible("^0.1.0", "0.1.5"), true);
  assert.equal(isCapabilityVersionCompatible("^0.1.0", "0.2.0"), false);
  assert.equal(isCapabilityVersionCompatible("^0.0.3", "0.0.4"), false);
  assert.equal(isCapabilityVersionCompatible("2.0.0", "1.9.0"), false);
  assert.equal(isCapabilityVersionCompatible("not-semver", "1.0.0"), false);
});

test("connector dry run is side-effect free and reports unavailable runtime health", () => {
  const dryRun = dryRunConnectorPlan({
    workflowId: "fixture-mailing",
    required: [{ id: "mailing", required: true }],
    context: {
      actor: "authenticated",
      ownership: "verified",
      approvedCapabilities: ["approval", "mailing"],
      requireHealthyBindings: true,
      bindingHealth: { mailing: "unavailable" },
    },
  });

  assert.equal(dryRun.sideEffectsPerformed, false);
  assert.equal(dryRun.ready, false);
  assert.ok(dryRun.manifest);
  assert.ok(dryRun.diagnostics.some((item) => item.code === "BINDING_UNAVAILABLE"));
});

test("connector dry run does not compile a manifest with unknown requirements", () => {
  const dryRun = dryRunConnectorPlan({
    workflowId: "fixture-unknown",
    required: [{ id: "imaginary", required: true }],
    context: { actor: "anonymous", ownership: "not-applicable" },
  });
  assert.equal(dryRun.ready, false);
  assert.equal(dryRun.manifest, null);
  assert.ok(dryRun.diagnostics.some((item) => item.code === "UNKNOWN_CAPABILITY"));
});

test("acceptance coverage exposes missing fixtures and certification evidence", () => {
  const coverage = buildConnectorAcceptanceCoverage(["secureUpload", "uccFiling"]);

  assert.equal(coverage.capabilities.length, 2);
  assert.equal(coverage.complete, false);
  const ucc = coverage.capabilities.find((item) => item.id === "uccFiling");
  assert.ok(ucc);
  assert.equal(ucc.bindingImplemented, false);
  assert.equal(ucc.acceptanceFixturePresent, false);
  assert.ok(ucc.gaps.length > 0);
});
