import assert from "node:assert/strict";
import test from "node:test";
import { emitWorkflowEvent } from "../src/workflow-observability.js";

test("workflow telemetry strips sensitive content fields", async () => {
  const events:any[]=[];
  await emitWorkflowEvent({emit(event){events.push(event);}},{
    workflowId:"cp2000-response",stage:"analysis",event:"completed",level:"info",
    occurredAt:"2026-09-16T00:00:00Z",
    metadata:{documentText:"secret",token:"secret",pageCount:4,status:"ok"},
  });
  assert.deepEqual(events[0].metadata,{pageCount:4,status:"ok"});
});
