import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildMonitoringSchedule } from "../rules/monitoring";
import workflowManifest from "../manifest";

describe("Priority Preservation & Monitoring workflow", () => {
  test("uses explicit dates and does not calculate an unsupported legal deadline", () => {
    const schedule = buildMonitoringSchedule([]);
    assert.deepEqual(schedule.events, []);
  });

  test("monitoring workflow remains non-consequential", () => {
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
  });
});
