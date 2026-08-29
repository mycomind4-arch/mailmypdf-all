import type { EvidenceItem } from "./gold-standard";

export interface DisputeEvidenceRepository {
  list(ownerId: string, caseId: string): Promise<EvidenceItem[]>;
  upsert(ownerId: string, caseId: string, item: EvidenceItem, sourceDocumentId?: string): Promise<EvidenceItem>;
  verify(ownerId: string, caseId: string, evidenceId: string, reviewerId: string): Promise<EvidenceItem>;
  reject(ownerId: string, caseId: string, evidenceId: string, reviewerId: string): Promise<EvidenceItem>;
}
