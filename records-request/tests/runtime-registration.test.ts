import assert from "node:assert/strict";
import test from "node:test";
import {
  platformWorkflowRuntimePolicyFor,
  type WorkflowRuntimeStoredEvent,
} from "@mailmypdf/workflows";
import {
  recordsRequestRuntimePolicyFor,
  recordsRequestStartRouteFor,
  recordsRequestStartRoutes,
} from "../runtime.js";

const ids = [
  "agency-records-request",
  "public-records-request",
  "open-records-request",
  "government-documents-request",
  "public-information-request",
] as const;

test("records request vertical registers every executable start route", () => {
  assert.equal(recordsRequestStartRoutes.length, ids.length);
  assert.equal(
    new Set(recordsRequestStartRoutes.map((route) => route.workflowId)).size,
    ids.length,
  );
  for (const workflowId of ids) {
    assert.equal(
      recordsRequestStartRouteFor(workflowId)?.path,
      `/records-request/workflows/${workflowId}/start/`,
    );
    assert.ok(recordsRequestRuntimePolicyFor(workflowId));
    assert.ok(platformWorkflowRuntimePolicyFor(workflowId));
  }
  assert.equal(recordsRequestStartRouteFor("not-real"), null);
  assert.equal(recordsRequestRuntimePolicyFor("not-real"), null);
});

test("records request policies are request-first and bind exact workflow identity", async () => {
  for (const workflowId of ids) {
    const policy = recordsRequestRuntimePolicyFor(workflowId)!;
    assert.equal(policy.requiresSourceDocument, false);
    assert.doesNotThrow(() =>
      policy.validateMatter({
        workflowId,
        verticalId: "records-request",
      }),
    );
    assert.throws(
      () =>
        policy.validateMatter({
          workflowId,
          verticalId: "notice-respond",
        }),
      /identity does not match/i,
    );

    const analysis = await policy.createAnalysisFromInput?.({
      matter: {
        matter: {
          id: "matter-1",
          workflowId,
          verticalId: "records-request",
          status: "active",
          createdAt: "2026-09-17T00:00:00.000Z",
          updatedAt: "2026-09-17T00:00:00.000Z",
        },
        documents: [],
      },
      caseInput: {
        version: 1,
        createdAt: "2026-09-17T00:00:00.000Z",
        input: {
          agency: "Example County",
          recordsSought: "Inspection reports for CE-123",
        },
      },
    });
    assert.equal(analysis?.issuer, "Example County");
    assert.equal(analysis?.deadline, null);
  }
});

test("response events require a trusted actual-send event", () => {
  const policy = recordsRequestRuntimePolicyFor("public-records-request")!;
  assert.throws(
    () =>
      policy.validateUserEvent?.({
        event: {
          responded: true,
          responseDate: "2026-09-20",
        },
        matter: {
          matter: {
            id: "matter-1",
            workflowId: "public-records-request",
            verticalId: "records-request",
            status: "active",
            createdAt: "2026-09-17T00:00:00.000Z",
            updatedAt: "2026-09-17T00:00:00.000Z",
          },
          documents: [],
        },
        existingEvents: [],
      }),
    /trusted provider\/system actual-send event/i,
  );

  const sent: WorkflowRuntimeStoredEvent = {
    id: "event-sent",
    type: "records_request_sent",
    occurredOn: "2026-09-17",
    data: { providerId: "letter-1" },
    createdAt: "2026-09-17T23:45:00.000Z",
    source: "provider",
  };
  const event = policy.validateUserEvent?.({
    event: {
      responded: false,
      observationDate: "2026-10-01",
      note: "No response received as of this observation date.",
    },
    matter: {
      matter: {
        id: "matter-1",
        workflowId: "public-records-request",
        verticalId: "records-request",
        status: "active",
        createdAt: "2026-09-17T00:00:00.000Z",
        updatedAt: "2026-09-17T00:00:00.000Z",
      },
      documents: [],
    },
    existingEvents: [sent],
  });

  assert.equal(event?.type, "records_response_not_received");
  assert.equal(event?.occurredOn, "2026-10-01");
});
