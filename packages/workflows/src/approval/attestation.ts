import { WorkflowRuntimeError } from "../matter-runtime.js";

export type AttestationStatement = {
  id: string;
  text: string;
  required: boolean;
};

export type ArtifactBinding = {
  kind: "packet" | "form" | "draft" | "document" | "other";
  id: string;
  sha256: string;
};

export type WorkflowAttestation = {
  attestationId: string;
  matterId: string;
  workflowId: string;
  userId: string;
  acceptedStatementIds: readonly string[];
  statements: readonly AttestationStatement[];
  artifact?: ArtifactBinding;
  typedName?: string;
  method: "checkbox" | "typed_name" | "external_signature";
  attestedAt: string;
};

function normalizeHash(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new WorkflowRuntimeError("Attestation artifact hash is invalid", "ATTESTATION_HASH_INVALID");
  }
  return normalized;
}

export function createWorkflowAttestation(input: {
  attestationId: string;
  matterId: string;
  workflowId: string;
  userId: string;
  statements: readonly AttestationStatement[];
  acceptedStatementIds: readonly string[];
  artifact?: ArtifactBinding;
  typedName?: string;
  method?: WorkflowAttestation["method"];
  attestedAt?: string;
}): WorkflowAttestation {
  for (const value of [input.attestationId, input.matterId, input.workflowId, input.userId]) {
    if (!value.trim()) throw new WorkflowRuntimeError("Attestation identity is incomplete", "ATTESTATION_IDENTITY_INCOMPLETE");
  }

  const ids = new Set<string>();
  for (const statement of input.statements) {
    if (!statement.id.trim() || !statement.text.trim()) {
      throw new WorkflowRuntimeError("Attestation statement is incomplete", "ATTESTATION_STATEMENT_INVALID");
    }
    if (ids.has(statement.id)) {
      throw new WorkflowRuntimeError("Attestation statement ids must be unique", "ATTESTATION_STATEMENT_INVALID");
    }
    ids.add(statement.id);
  }

  const accepted = new Set(input.acceptedStatementIds);
  const missing = input.statements.filter((statement) => statement.required && !accepted.has(statement.id));
  if (missing.length) {
    throw new WorkflowRuntimeError(
      `Required attestations were not accepted: ${missing.map((statement) => statement.id).join(", ")}`,
      "ATTESTATION_REQUIRED",
    );
  }

  const method = input.method ?? (input.typedName?.trim() ? "typed_name" : "checkbox");
  if (method === "typed_name" && !input.typedName?.trim()) {
    throw new WorkflowRuntimeError("Typed-name attestation requires a name", "ATTESTATION_NAME_REQUIRED");
  }

  return Object.freeze({
    attestationId: input.attestationId.trim(),
    matterId: input.matterId.trim(),
    workflowId: input.workflowId.trim(),
    userId: input.userId.trim(),
    acceptedStatementIds: Object.freeze([...accepted]),
    statements: Object.freeze(input.statements.map((statement) => Object.freeze({ ...statement }))),
    artifact: input.artifact
      ? Object.freeze({ ...input.artifact, id: input.artifact.id.trim(), sha256: normalizeHash(input.artifact.sha256) })
      : undefined,
    typedName: input.typedName?.trim() || undefined,
    method,
    attestedAt: input.attestedAt ?? new Date().toISOString(),
  });
}

export function assertAttestationMatchesArtifact(
  attestation: WorkflowAttestation,
  artifact: ArtifactBinding,
): void {
  if (!attestation.artifact) {
    throw new WorkflowRuntimeError("Attestation is not bound to an artifact", "ATTESTATION_ARTIFACT_MISSING");
  }
  const currentHash = normalizeHash(artifact.sha256);
  if (
    attestation.artifact.kind !== artifact.kind ||
    attestation.artifact.id !== artifact.id.trim() ||
    attestation.artifact.sha256 !== currentHash
  ) {
    throw new WorkflowRuntimeError(
      "The attested artifact changed. Review and attest again before submission.",
      "ATTESTED_ARTIFACT_CHANGED",
    );
  }
}
