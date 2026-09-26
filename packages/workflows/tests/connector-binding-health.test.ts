import assert from "node:assert/strict";
import test from "node:test";

import {
  probeConnectorBindings,
  type ConnectorBindingProbe,
} from "../src/connector-binding-health.js";

test("binding probes run once per provider family and map results to capabilities", async () => {
  let checks = 0;
  const probes: ConnectorBindingProbe[] = [{
    id: "workflow-database",
    capabilities: ["matterState", "facts", "approval"],
    async check() {
      checks += 1;
      return { health: "healthy" };
    },
  }];

  const result = await probeConnectorBindings(
    ["matterState", "facts", "approval"],
    probes,
    { now: () => "2026-09-26T12:00:00.000Z" },
  );

  assert.equal(checks, 1);
  assert.equal(result.bindingHealth.matterState, "healthy");
  assert.equal(result.bindingHealth.approval, "healthy");
  assert.equal(result.probes[0]?.source, "workflow-database");
});

test("binding probes fail safely on errors and leave unprobed capabilities unknown", async () => {
  const probes: ConnectorBindingProbe[] = [{
    id: "payment-provider",
    capabilities: ["payment"],
    async check() {
      throw new Error("provider secret must not escape");
    },
  }];

  const result = await probeConnectorBindings(
    ["payment", "draft"],
    probes,
    { now: () => "2026-09-26T12:00:00.000Z" },
  );

  assert.equal(result.bindingHealth.payment, "unavailable");
  assert.equal(result.bindingHealth.draft, "unknown");
  assert.equal(JSON.stringify(result).includes("provider secret"), false);
  assert.equal(result.probes.find((probe) => probe.capability === "payment")?.message, "Binding health check failed.");
});

test("binding probes time out without hanging connector readiness", async () => {
  const probes: ConnectorBindingProbe[] = [{
    id: "slow-provider",
    capabilities: ["mailing"],
    check: () => new Promise(() => {}),
  }];

  const result = await probeConnectorBindings(
    ["mailing"],
    probes,
    { timeoutMs: 5 },
  );

  assert.equal(result.bindingHealth.mailing, "unavailable");
  assert.equal(result.probes[0]?.message, "Binding health check timed out.");
});

test("binding probe identities and capability ownership are unambiguous", async () => {
  const check = async () => ({ health: "healthy" as const });

  await assert.rejects(
    () => probeConnectorBindings(["payment"], [
      { id: "provider", capabilities: ["payment"], check },
      { id: "provider", capabilities: ["mailing"], check },
    ]),
    /duplicate binding probe id/i,
  );

  await assert.rejects(
    () => probeConnectorBindings(["payment"], [
      { id: "payment-primary", capabilities: ["payment"], check },
      { id: "payment-secondary", capabilities: ["payment"], check },
    ]),
    /multiple binding probes registered/i,
  );
});
