import type { FetchLike } from '../connector';
import { persistConnectorCapture } from '../connector-persistence';
import type { FairProcessBlobStore, FairProcessCaseRecordStore } from '../store';
import type { JurisdictionPack } from '../types';
import {
  lookupHumboldtHistoricalCodeEnforcementByApn,
  lookupHumboldtParcelByApn,
  type HumboldtHistoricalCodeEnforcementRecord,
  type HumboldtParcelRecord,
} from './humboldt-connector';

export interface SourcedJurisdictionRecord<T> {
  record: T;
  sourceSnapshotId: string;
  sourceEvidenceId: string;
}

export interface HumboldtPropertyIntelligence {
  apn: string;
  retrievedAt: string;
  parcels: Array<SourcedJurisdictionRecord<HumboldtParcelRecord>>;
  historicalCodeEnforcementCases: Array<SourcedJurisdictionRecord<HumboldtHistoricalCodeEnforcementRecord>>;
  currentCodeEnforcementStatusAvailable: false;
  permitSearch: {
    automated: false;
    url: string;
  };
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
 * Refreshes only Humboldt sources whose machine-readable access has been
 * verified. Exact responses are persisted before normalized records are returned.
 *
 * The county's exposed code-enforcement GIS layer is a historical 2025-01-15
 * snapshot. Current case status must come from a current notice, authenticated
 * source, public-records response, or another separately verified source.
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

  const [parcelResult, enforcementResult] = await Promise.all([
    lookupHumboldtParcelByApn(request.apn, context, fetcher),
    lookupHumboldtHistoricalCodeEnforcementByApn(request.apn, context, fetcher),
  ]);

  const [parcelCapture, enforcementCapture] = await Promise.all([
    persistConnectorCapture(parcelResult, request.recordStore, request.blobStore),
    persistConnectorCapture(enforcementResult, request.recordStore, request.blobStore),
  ]);

  const parcelSourceSnapshotId = parcelResult.records.length > 0
    ? parcelResult.snapshots.at(-1)?.id
    : undefined;
  const enforcementSourceSnapshotId = enforcementResult.records.length > 0
    ? enforcementResult.snapshots.at(-1)?.id
    : undefined;

  const permitConnector = request.jurisdiction.connectors.find(
    (connector) => connector.id === 'humboldt-building-permits',
  );

  return {
    apn: request.apn,
    retrievedAt,
    parcels: attachSource(
      parcelResult.records,
      parcelSourceSnapshotId,
      parcelCapture.evidenceBySnapshot,
    ),
    historicalCodeEnforcementCases: attachSource(
      enforcementResult.records,
      enforcementSourceSnapshotId,
      enforcementCapture.evidenceBySnapshot,
    ),
    currentCodeEnforcementStatusAvailable: false,
    permitSearch: {
      automated: false,
      url: permitConnector?.baseUrl ?? 'https://aca-prod.accela.com/humboldt/Default.aspx',
    },
    captureEvidenceIds: [
      ...parcelCapture.evidenceIds,
      ...enforcementCapture.evidenceIds,
    ],
    warnings: [
      ...parcelResult.warnings,
      ...enforcementResult.warnings,
      'Humboldt permit records are publicly searchable in Accela, but automated retrieval is disabled until a supported machine interface is verified.',
    ],
  };
}
