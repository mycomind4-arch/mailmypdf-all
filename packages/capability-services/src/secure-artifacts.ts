export type ShareScope = "view" | "download" | "review";

export type SecureShare = {
  id: string;
  artifactId: string;
  matterId: string;
  audience: string;
  scope: ShareScope;
  expiresAt: string;
  revokedAt: string | null;
  createdBy: string;
};

export type LegalHold = {
  id: string;
  matterId: string;
  artifactIds: readonly string[];
  reason: string;
  createdBy: string;
  createdAt: string;
  releasedAt: string | null;
};

function required(value: string, label: string): string {
  if (!value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function futureIso(value: string): string {
  if (!Number.isFinite(Date.parse(value)) || Date.parse(value) <= Date.now()) throw new Error("Expiry must be a future timestamp.");
  return value;
}

export function createSecureShare(input: Omit<SecureShare, "revokedAt">): SecureShare {
  return Object.freeze({
    ...input,
    id: required(input.id, "Share id"),
    artifactId: required(input.artifactId, "Artifact id"),
    matterId: required(input.matterId, "Matter id"),
    audience: required(input.audience, "Audience"),
    createdBy: required(input.createdBy, "Creator"),
    expiresAt: futureIso(input.expiresAt),
    revokedAt: null,
  });
}

export function revokeSecureShare(share: SecureShare, revokedAt = new Date().toISOString()): SecureShare {
  if (share.revokedAt) return share;
  if (!Number.isFinite(Date.parse(revokedAt))) throw new Error("Revocation timestamp is invalid.");
  return Object.freeze({ ...share, revokedAt });
}

export function canUseSecureShare(share: SecureShare, now = new Date()): boolean {
  return share.revokedAt === null && Date.parse(share.expiresAt) > now.getTime();
}

export function createLegalHold(input: Omit<LegalHold, "releasedAt">): LegalHold {
  if (input.artifactIds.length === 0) throw new Error("A legal hold must cover at least one artifact.");
  const artifactIds = [...new Set(input.artifactIds.map((id) => required(id, "Artifact id")))];
  return Object.freeze({ ...input, id: required(input.id, "Hold id"), matterId: required(input.matterId, "Matter id"), reason: required(input.reason, "Hold reason"), createdBy: required(input.createdBy, "Creator"), artifactIds, releasedAt: null });
}

export function releaseLegalHold(hold: LegalHold, releasedAt = new Date().toISOString()): LegalHold {
  if (hold.releasedAt) return hold;
  if (!Number.isFinite(Date.parse(releasedAt))) throw new Error("Release timestamp is invalid.");
  return Object.freeze({ ...hold, releasedAt });
}

export function deletionBlockedByLegalHold(artifactId: string, holds: readonly LegalHold[]): boolean {
  return holds.some((hold) => hold.releasedAt === null && hold.artifactIds.includes(artifactId));
}
