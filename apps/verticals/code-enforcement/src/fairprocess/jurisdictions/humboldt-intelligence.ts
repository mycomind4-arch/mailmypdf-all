import type { FetchLike } from '../connector';
import { persistConnectorCapture } from '../connector-persistence';
import type { FairProcessBlobStore, FairProcessCaseRecordStore } from '../store';
import type { JurisdictionPack } from '../types';
import {
  lookupHumboldtCodeEnforcementByApn,
  lookupHumboldtPermitsByApn,
  type HumboldtCodeEnforcementRecord,
  type HumboldtPermitRecord,
} from './humboldt-connector';

export interface SourcedJurisdictionRecord<T> {
  record: T;
  sourceSnapshotId: string;
  sourceEvidenceId: string;
}

export interface HumboldtPropertyIntelligence {
  apn: string;
  retrievedAt: string;
  permits: Array<SourcedJurisdictionRecord<HumboldtPermitRecord>>;
  codeEnforcementCases: Array<SourcedJurisdictionRecord<HumboldtCodeEnforcementRecord>>;
  captureEvidenceIds: string[];
  warnings: string[];
}

export interface HumboldtPropertyIntelligenceRequest {
  caseId: string;
  apn: string;
  jurisdiction: JurisdictionPack;
  recordStore: FairProcessCaseRecordStore;
  blobStore: FairProcessBlobStore;
  fetcher?: FetchLike;
  retrievedAt?: string;
}

function attachSource<T>(
  records: T[],
  snapshotId: string | undefined,
  evidenceBySnapshot: Record<string, string>,
): Array<SourcedJurisdictionRecord<T>> {
  if (records.length === 0) return [];
  if (!snapshotId) throw new Error('Normalized jurisdiction records are missing a source snapshot.');
  const evidenceId = evidenceBySnapshot[snapshotId];
  if (!evidenceId) throw new Error(`Source snapshot ${snapshotId} has no persisted evidence artifact.`);

  return records.map((record) => ({
    record,
    sourceSnapshotId: snapshotId,
    sourceEvidenceId: evidenceId,
  }));
}

/**
 * Refreshes the Humboldt public-data view for a property and persists the exact
 * source responses before returning normalized records to the rest of the case.
 *
 * These records are source-backed agency/public records. They are not, by
 * themselves, legal conclusions or proof that an alleged violation is true.
 */
export async function refreshHumboldtPropertyIntelligence(
  request: HumboldtPropertyIntelligenceRequest,
): Promise<HumboldtPropertyIntelligence> {
  const retrievedAt = request.retrievedAt ?? new Date().toISOString();
  const fetcher = request.fetcher ?? fetch;
  const context = {
    caseId: request.caseId,
    jurisdiction: request.jurisdiction,
    retrievedAt,
  };

  const [permitResult, enforcementResult] = await Promise.all([
    lookupHumboldtPermitsByApn(request.apn, context, fetcher),
    lookupHumboldtCodeEnforcementByApn(request.apn, context, fetcher),
  ]);

  const [permitCapture, enforcementCapture] = await Promise.all([
    persistConnectorCapture(permitResult, request.recordStore, request.blobStore),
    persistConnectorCapture(enforcementResult, request.recordStore, request.blobStore),
  ]);

  const permitSourceSnapshotId = permitResult.records.length > 0
    ? permitResult.snapshots.at(-1)?.id
    : undefined;
  const enforcementSourceSnapshotId = enforcementResult.records.length > 0
    ? enforcementResult.snapshots.at(-1)?.id
    : undefined;

  return {
    apn: request.apn,
    retrievedAt,
    permits: attachSource(
      permitResult.records,
      permitSourceSnapshotId,
      permitCapture.evidenceBySnapshot,
    ),
    codeEnforcementCases: attachSource(
      enforcementResult.records,
      enforcementSourceSnapshotId,
      enforcementCapture.evidenceBySnapshot,
    ),
    captureEvidenceIds: [
      ...permitCapture.evidenceIds,
      ...enforcementCapture.evidenceIds,
    ],
    warnings: [...permitResult.warnings, ...enforcementResult.warnings],
  };
}
