import type { EvidenceItem } from "./gold-standard";

export interface MatterEvidenceRepository {
  list(ownerId: string, matterId: string): Promise<EvidenceItem[]>;
  upsert(
    ownerId: string,
    matterId: string,
    item: EvidenceItem,
    sourceDocumentId?: string,
  ): Promise<EvidenceItem>;
  verify(
    ownerId: string,
    matterId: string,
    evidenceId: string,
    reviewerId: string,
  ): Promise<EvidenceItem>;
  reject(
    ownerId: string,
    matterId: string,
    evidenceId: string,
    reviewerId: string,
  ): Promise<EvidenceItem>;
}
