import { sha256Text } from './evidence-integrity';
import type { SourcedConnectorResult } from './connector';
import type {
  FairProcessBlobStore,
  FairProcessCaseRecordStore,
  FairProcessEvidenceRecord,
} from './store';

export interface PersistedConnectorCapture {
  evidenceIds: string[];
  snapshotIds: string[];
}

function sourceEvidenceId(snapshotId: string): string {
  return `evidence-source-${snapshotId.replace(/^snapshot-/, '')}`;
}

function sourceStorageKey(caseId: string, evidenceId: string): string {
  return `fairprocess/${caseId}/sources/${evidenceId}.json`;
}

/**
 * Persists the exact public-source response before any normalized connector
 * records are used by analysis. The snapshot then points back to that immutable
 * raw artifact, preserving the chain from derived fact to original response.
 */
export async function persistConnectorCapture<T>(
  result: SourcedConnectorResult<T>,
  recordStore: FairProcessCaseRecordStore,
  blobStore: FairProcessBlobStore,
): Promise<PersistedConnectorCapture> {
  const evidenceIds: string[] = [];
  const snapshotIds: string[] = [];
  const artifactsBySnapshot = new Map(
    result.artifacts.map((artifact) => [artifact.snapshotId, artifact]),
  );

  for (const snapshot of result.snapshots) {
    const artifact = artifactsBySnapshot.get(snapshot.id);
    if (!artifact) {
      throw new Error(`Connector snapshot ${snapshot.id} is missing its raw response artifact.`);
    }

    const recalculatedSha256 = await sha256Text(artifact.rawResponse);
    if (recalculatedSha256 !== snapshot.responseSha256 || recalculatedSha256 !== artifact.sha256) {
      throw new Error(`Connector capture ${snapshot.id} failed SHA-256 integrity verification.`);
    }

    const evidenceId = sourceEvidenceId(snapshot.id);
    const storageKey = sourceStorageKey(snapshot.caseId, evidenceId);
    const bytes = new TextEncoder().encode(artifact.rawResponse);

    await blobStore.putBlob({
      key: storageKey,
      bytes,
      mimeType: artifact.mimeType,
      sha256: recalculatedSha256,
    });

    const evidence: FairProcessEvidenceRecord = {
      id: evidenceId,
      caseId: snapshot.caseId,
      type: 'public_source_snapshot',
      title: artifact.title,
      source: artifact.connectorId,
      sourceUrl: artifact.sourceUrl,
      retrievedAt: artifact.retrievedAt,
      sha256: recalculatedSha256,
      mimeType: artifact.mimeType,
      sizeBytes: bytes.byteLength,
      storageKey,
      provenance: {
        snapshotId: snapshot.id,
        connectorId: snapshot.connectorId,
        connectorVersion: snapshot.connectorVersion,
        jurisdictionPackId: snapshot.jurisdictionPackId,
        jurisdictionPackVersion: snapshot.jurisdictionPackVersion,
        query: snapshot.query,
        httpStatus: snapshot.httpStatus,
      },
      evidenceVersion: 1,
      immutableAt: artifact.retrievedAt,
    };

    await recordStore.putEvidence(evidence);
    await recordStore.putSourceSnapshot({
      ...snapshot,
      rawEvidenceId: evidenceId,
    });

    evidenceIds.push(evidenceId);
    snapshotIds.push(snapshot.id);
  }

  return { evidenceIds, snapshotIds };
}
