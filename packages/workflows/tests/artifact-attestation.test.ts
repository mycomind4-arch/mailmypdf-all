import assert from "node:assert/strict";
import test from "node:test";

import {
  assertRequiredAttestations,
  attestationMatchesArtifact,
  createArtifactAttestation,
  hasRequiredAttestations,
  type AttestationArtifactBinding,
} from "../src/approval/artifact-attestation.js";

const artifact: AttestationArtifactBinding = {
  kind: "packet",
  id: "packet-1",
  sha256: "a".repeat(64),
};

function record() {
  return createArtifactAttestation({
    id: "attestation-1",
    acceptedAt: "2026-09-18T00:00:00.000Z",
    ownerId: "owner-1",
    matterId: "matter-1",
    workflowId: "workflow-1",
    statementId: "reviewed-packet",
    statementVersion: "1",
    statement: "I reviewed the exact packet and approve it for submission.",
    method: "typed_name",
    signer: { userId: "owner-1", role: "owner", typedName: "Test User" },
    artifact,
  });
}

test("attestation is bound to the exact artifact id and hash", () => {
  const attestation = record();
  assert.equal(attestationMatchesArtifact(attestation, artifact), true);
  assert.equal(attestationMatchesArtifact(attestation, { ...artifact, sha256: "b".repeat(64) }), false);
  assert.equal(attestationMatchesArtifact(attestation, { ...artifact, id: "packet-2" }), false);
});

test("typed-name attestations fail closed without a signer name", () => {
  assert.throws(
    () =>
      createArtifactAttestation({
        ownerId: "owner-1",
        matterId: "matter-1",
        workflowId: "workflow-1",
        statementId: "reviewed-packet",
        statementVersion: "1",
        statement: "I reviewed it.",
        method: "typed_name",
        signer: { userId: "owner-1", role: "owner" },
        artifact,
      }),
    /typed signer name/,
  );
});

test("required attestations only satisfy the exact packet version", () => {
  const required = [{ statementId: "reviewed-packet", statementVersion: "1", artifactKind: "packet" as const }];
  const attestation = record();

  assert.equal(hasRequiredAttestations([attestation], required, artifact), true);
  assert.doesNotThrow(() => assertRequiredAttestations([attestation], required, artifact));

  const replacement = { ...artifact, sha256: "c".repeat(64) };
  assert.equal(hasRequiredAttestations([attestation], required, replacement), false);
  assert.throws(() => assertRequiredAttestations([attestation], required, replacement), /exact approved artifact/);
});
