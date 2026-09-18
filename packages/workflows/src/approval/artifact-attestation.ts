export type AttestationMethod = "checkbox" | "typed_name" | "external_signature";

export type AttestationArtifactBinding = {
  kind: "draft" | "form" | "packet" | "other";
  id: string;
  sha256: string;
};

export type AttestationSigner = {
  userId: string;
  role: "owner" | "claimant" | "representative" | "authorized_signer";
  typedName?: string;
};

export type ArtifactAttestation = {
  id: string;
  ownerId: string;
  matterId: string;
  workflowId: string;
  statementId: string;
  statementVersion: string;
  statement: string;
  method: AttestationMethod;
  signer: AttestationSigner;
  artifact: AttestationArtifactBinding;
  acceptedAt: string;
  externalSignatureId?: string;
  metadata?: Readonly<Record<string, unknown>>;
};

export type CreateArtifactAttestationInput = Omit<ArtifactAttestation, "id" | "acceptedAt"> & {
  id?: string;
  acceptedAt?: string;
};

function requireText(value: string, label: string): void {
  if (!value.trim()) throw new Error(`Artifact attestation requires ${label}.`);
}

function assertSha256(value: string): void {
  if (!/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error("Artifact attestation requires an exact SHA-256 artifact binding.");
  }
}

export function createArtifactAttestation(input: CreateArtifactAttestationInput): ArtifactAttestation {
  requireText(input.ownerId, "ownerId");
  requireText(input.matterId, "matterId");
  requireText(input.workflowId, "workflowId");
  requireText(input.statementId, "statementId");
  requireText(input.statementVersion, "statementVersion");
  requireText(input.statement, "statement");
  requireText(input.signer.userId, "signer userId");
  requireText(input.artifact.id, "artifact id");
  assertSha256(input.artifact.sha256);

  if (input.method === "typed_name") requireText(input.signer.typedName ?? "", "typed signer name");
  if (input.method === "external_signature") requireText(input.externalSignatureId ?? "", "external signature id");

  const acceptedAt = input.acceptedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(acceptedAt))) throw new Error("Artifact attestation acceptedAt must be a valid date.");

  return Object.freeze({
    ...input,
    id: input.id ?? crypto.randomUUID(),
    acceptedAt,
    signer: Object.freeze({ ...input.signer }),
    artifact: Object.freeze({ ...input.artifact }),
    metadata: input.metadata ? Object.freeze({ ...input.metadata }) : undefined,
  });
}

export function attestationMatchesArtifact(
  attestation: ArtifactAttestation,
  artifact: AttestationArtifactBinding,
): boolean {
  return (
    attestation.artifact.kind === artifact.kind &&
    attestation.artifact.id === artifact.id &&
    attestation.artifact.sha256.toLowerCase() === artifact.sha256.toLowerCase()
  );
}

export type RequiredAttestation = {
  statementId: string;
  statementVersion: string;
  artifactKind: AttestationArtifactBinding["kind"];
};

export function missingRequiredAttestations(
  attestations: readonly ArtifactAttestation[],
  required: readonly RequiredAttestation[],
  artifact: AttestationArtifactBinding,
): RequiredAttestation[] {
  return required.filter((requirement) => {
    if (requirement.artifactKind !== artifact.kind) return true;
    return !attestations.some(
      (attestation) =>
        attestation.statementId === requirement.statementId &&
        attestation.statementVersion === requirement.statementVersion &&
        attestationMatchesArtifact(attestation, artifact),
    );
  });
}

export function hasRequiredAttestations(
  attestations: readonly ArtifactAttestation[],
  required: readonly RequiredAttestation[],
  artifact: AttestationArtifactBinding,
): boolean {
  return required.length > 0 && missingRequiredAttestations(attestations, required, artifact).length === 0;
}

export function assertRequiredAttestations(
  attestations: readonly ArtifactAttestation[],
  required: readonly RequiredAttestation[],
  artifact: AttestationArtifactBinding,
): void {
  const missing = missingRequiredAttestations(attestations, required, artifact);
  if (!required.length) throw new Error("No artifact attestation requirements were configured.");
  if (missing.length) {
    throw new Error(
      `Required attestations are missing for the exact approved artifact: ${missing
        .map((item) => `${item.statementId}@${item.statementVersion}`)
        .join(", ")}`,
    );
  }
}
