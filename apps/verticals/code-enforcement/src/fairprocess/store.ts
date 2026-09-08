import type { AttorneyPacketManifest } from './types';

export interface FairProcessEvidenceRecord {
  id: string;
  caseId: string;
  type: string;
  title: string;
  source?: string;
  sourceUrl?: string;
  retrievedAt?: string;
  documentDate?: string;
  sha256: string;
  mimeType?: string;
  sizeBytes?: number;
  originalFilename?: string;
  storageKey?: string;
  pageReference?: string;
  provenance?: Record<string, unknown>;
  evidenceVersion: number;
  supersedesEvidenceId?: string;
  immutableAt: string;
  withdrawnAt?: string;
  withdrawalReason?: string;
}

export interface FairProcessSourceSnapshot {
  id: string;
  caseId: string;
  connectorId: string;
  connectorVersion?: string;
  jurisdictionPackId: string;
  jurisdictionPackVersion: string;
  sourceUrl: string;
  query?: Record<string, unknown>;
  retrievedAt: string;
  responseSha256: string;
  rawEvidenceId?: string;
  httpStatus?: number;
}

export interface FairProcessPacketExport {
  id: string;
  caseId: string;
  packetType: AttorneyPacketManifest['packetType'];
  formatVersion: AttorneyPacketManifest['formatVersion'];
  rendererVersion: string;
  manifest: AttorneyPacketManifest;
  manifestSha256: string;
  readinessScore: number;
  pdfEvidenceId?: string;
  exhibitArchiveEvidenceId?: string;
  generatedBy?: string;
  generatedAt: string;
}

export interface FairProcessCaseRecordStore {
  putEvidence(record: FairProcessEvidenceRecord): Promise<void>;
  getEvidence(id: string): Promise<FairProcessEvidenceRecord | undefined>;
  listEvidence(caseId: string): Promise<FairProcessEvidenceRecord[]>;
  withdrawEvidence(id: string, reason: string, withdrawnAt?: string): Promise<FairProcessEvidenceRecord>;

  putSourceSnapshot(snapshot: FairProcessSourceSnapshot): Promise<void>;
  listSourceSnapshots(caseId: string): Promise<FairProcessSourceSnapshot[]>;

  putPacketExport(packet: FairProcessPacketExport): Promise<void>;
  listPacketExports(caseId: string): Promise<FairProcessPacketExport[]>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Deterministic store used by domain tests and local composition.
 *
 * Production persistence should implement the same interface over the app's
 * chosen database/runtime. The FairProcess domain must not import D1 or Supabase
 * directly until the vertical's production persistence boundary is settled.
 */
export class InMemoryFairProcessStore implements FairProcessCaseRecordStore {
  private readonly evidence = new Map<string, FairProcessEvidenceRecord>();
  private readonly snapshots = new Map<string, FairProcessSourceSnapshot>();
  private readonly packets = new Map<string, FairProcessPacketExport>();

  async putEvidence(record: FairProcessEvidenceRecord): Promise<void> {
    const existing = this.evidence.get(record.id);

    if (existing) {
      if (existing.sha256 !== record.sha256) {
        throw new Error(
          `Evidence ${record.id} is immutable: existing SHA-256 does not match replacement content. Create a new evidence version instead.`,
        );
      }

      if (existing.caseId !== record.caseId) {
        throw new Error(`Evidence ${record.id} cannot move between cases.`);
      }
    }

    if (record.supersedesEvidenceId) {
      const previous = this.evidence.get(record.supersedesEvidenceId);
      if (!previous) {
        throw new Error(`Superseded evidence ${record.supersedesEvidenceId} does not exist.`);
      }
      if (previous.caseId !== record.caseId) {
        throw new Error('Evidence versions must remain in the same case.');
      }
      if (record.evidenceVersion <= previous.evidenceVersion) {
        throw new Error('A replacement evidence version must increment evidenceVersion.');
      }
    }

    this.evidence.set(record.id, clone(record));
  }

  async getEvidence(id: string): Promise<FairProcessEvidenceRecord | undefined> {
    const record = this.evidence.get(id);
    return record ? clone(record) : undefined;
  }

  async listEvidence(caseId: string): Promise<FairProcessEvidenceRecord[]> {
    return [...this.evidence.values()]
      .filter((record) => record.caseId === caseId)
      .sort((a, b) => a.immutableAt.localeCompare(b.immutableAt))
      .map(clone);
  }

  async withdrawEvidence(
    id: string,
    reason: string,
    withdrawnAt = new Date().toISOString(),
  ): Promise<FairProcessEvidenceRecord> {
    const existing = this.evidence.get(id);
    if (!existing) throw new Error(`Evidence ${id} does not exist.`);
    if (!reason.trim()) throw new Error('Withdrawal reason is required.');

    const withdrawn: FairProcessEvidenceRecord = {
      ...existing,
      withdrawnAt,
      withdrawalReason: reason.trim(),
    };
    this.evidence.set(id, withdrawn);
    return clone(withdrawn);
  }

  async putSourceSnapshot(snapshot: FairProcessSourceSnapshot): Promise<void> {
    const existing = this.snapshots.get(snapshot.id);
    if (existing && existing.responseSha256 !== snapshot.responseSha256) {
      throw new Error(
        `Source snapshot ${snapshot.id} is immutable: response SHA-256 changed. Create a new snapshot.`,
      );
    }
    if (snapshot.rawEvidenceId) {
      const evidence = this.evidence.get(snapshot.rawEvidenceId);
      if (!evidence) throw new Error(`Raw evidence ${snapshot.rawEvidenceId} does not exist.`);
      if (evidence.caseId !== snapshot.caseId) {
        throw new Error('Source snapshot raw evidence must belong to the same case.');
      }
    }
    this.snapshots.set(snapshot.id, clone(snapshot));
  }

  async listSourceSnapshots(caseId: string): Promise<FairProcessSourceSnapshot[]> {
    return [...this.snapshots.values()]
      .filter((snapshot) => snapshot.caseId === caseId)
      .sort((a, b) => a.retrievedAt.localeCompare(b.retrievedAt))
      .map(clone);
  }

  async putPacketExport(packet: FairProcessPacketExport): Promise<void> {
    const existing = this.packets.get(packet.id);
    if (existing && existing.manifestSha256 !== packet.manifestSha256) {
      throw new Error(
        `Packet export ${packet.id} is immutable: manifest SHA-256 changed. Create a new export.`,
      );
    }

    for (const evidenceId of [packet.pdfEvidenceId, packet.exhibitArchiveEvidenceId].filter(Boolean)) {
      const evidence = this.evidence.get(evidenceId!);
      if (!evidence) throw new Error(`Packet artifact evidence ${evidenceId} does not exist.`);
      if (evidence.caseId !== packet.caseId) {
        throw new Error('Packet artifact evidence must belong to the same case.');
      }
    }

    this.packets.set(packet.id, clone(packet));
  }

  async listPacketExports(caseId: string): Promise<FairProcessPacketExport[]> {
    return [...this.packets.values()]
      .filter((packet) => packet.caseId === caseId)
      .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt))
      .map(clone);
  }
}
