import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAttestationMatchesArtifact,
  createWorkflowAttestation,
} from "../src/approval/attestation";

const packet = { kind: "packet" as const, id: "packet-1", sha256: "a".repeat(64) };

const statements = [
  { id: "reviewed", text: "I reviewed the packet.", required: true },
  { id: "accurate", text: "The information is accurate to the best of my knowledge.", required: true },
] as const;

test("required attestations fail closed", () => {
  assert.throws(() => createWorkflowAttestation({
    attestationId: "att-1",
    matterId: "matter-1",
    workflowId: "workflow-1",
    userId: "user-1",
    statements,
    acceptedStatementIds: ["reviewed"],
    artifact: packet,
  }), /Required attestations were not accepted/);
});

test("typed-name attestation requires a typed name", () => {
  assert.throws(() => createWorkflowAttestation({
    attestationId: "att-1",
    matterId: "matter-1",
    workflowId: "workflow-1",
    userId: "user-1",
    statements,
    acceptedStatementIds: ["reviewed", "accurate"],
    artifact: packet,
    method: "typed_name",
  }), /requires a name/);
});

test("attestation is bound to exact artifact hash", () => {
  const attestation = createWorkflowAttestation({
    attestationId: "att-1",
    matterId: "matter-1",
    workflowId: "workflow-1",
    userId: "user-1",
    statements,
    acceptedStatementIds: ["reviewed", "accurate"],
    artifact: packet,
    typedName: "Example User",
  });

  assert.doesNotThrow(() => assertAttestationMatchesArtifact(attestation, packet));
  assert.throws(() => assertAttestationMatchesArtifact(attestation, {
    ...packet,
    sha256: "b".repeat(64),
  }), /changed/);
});
