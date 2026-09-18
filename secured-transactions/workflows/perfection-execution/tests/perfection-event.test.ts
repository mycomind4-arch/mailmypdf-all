import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { recordPerfectionEvent } from "../rules/perfection-event";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";

describe("Perfection Execution workflow", () => {
  test("completed execution cannot be recorded without evidence", () => {
    assert.throws(() =>
      recordPerfectionEvent({
        eventId: "event-1",
        method: "filing",
        jurisdiction: "TEST-1",
        status: "completed",
        occurredAt: "2026-09-17T21:30:00Z",
      }),
    );
  });

  test("workflow remains non-executable", () => {
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, false);
  });
});
