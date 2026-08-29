import type { PlatformId } from "@mailmypdf/core";

export interface AuditEvent {
  id: PlatformId;
  type: string;
  occurredAt: string;
  actor: "user" | "system" | "ai" | "external";
  subjectId: PlatformId;
  metadata: Record<string, string>;
}

export interface ProofArtifact {
  id: PlatformId;
  kind: "document" | "correspondence" | "attachment" | "receipt" | "tracking" | "delivery" | "other";
  sha256?: string;
  createdAt: string;
  sourceId?: PlatformId;
}

export interface ProofPacket {
  id: PlatformId;
  subjectId: PlatformId;
  artifacts: readonly ProofArtifact[];
  events: readonly AuditEvent[];
  createdAt: string;
}
