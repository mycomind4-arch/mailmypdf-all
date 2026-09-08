import { sha256Text } from './evidence-integrity';
import type { JurisdictionConnector, JurisdictionPack } from './types';
import type { FairProcessSourceSnapshot } from './store';

export type FetchLike = typeof fetch;

export interface ConnectorRequestContext {
  caseId: string;
  jurisdiction: JurisdictionPack;
  retrievedAt?: string;
}

export interface ConnectorRawArtifact {
  snapshotId: string;
  connectorId: string;
  title: string;
  sourceUrl: string;
  retrievedAt: string;
  mimeType: 'application/json';
  rawResponse: string;
  sha256: string;
  query?: Record<string, unknown>;
}

export interface SourcedConnectorResult<T> {
  records: T[];
  snapshots: FairProcessSourceSnapshot[];
  artifacts: ConnectorRawArtifact[];
  warnings: string[];
}

export interface JurisdictionDataConnector<TQuery, TResult> {
  readonly connector: JurisdictionConnector;
  readonly version: string;
  query(
    request: TQuery,
    context: ConnectorRequestContext,
  ): Promise<SourcedConnectorResult<TResult>>;
}

export interface SourceSnapshotInput {
  connector: JurisdictionConnector;
  connectorVersion: string;
  jurisdiction: JurisdictionPack;
  caseId: string;
  sourceUrl: string;
  query?: Record<string, unknown>;
  retrievedAt: string;
  rawResponse: string;
  httpStatus?: number;
  rawEvidenceId?: string;
}

export async function createSourceSnapshot(
  input: SourceSnapshotInput,
): Promise<FairProcessSourceSnapshot> {
  const responseSha256 = await sha256Text(input.rawResponse);
  const idMaterial = [
    input.caseId,
    input.connector.id,
    input.jurisdiction.id,
    input.retrievedAt,
    input.sourceUrl,
    responseSha256,
  ].join('|');
  const snapshotDigest = await sha256Text(idMaterial);

  return {
    id: `snapshot-${snapshotDigest.slice(0, 32)}`,
    caseId: input.caseId,
    connectorId: input.connector.id,
    connectorVersion: input.connectorVersion,
    jurisdictionPackId: input.jurisdiction.id,
    jurisdictionPackVersion: input.jurisdiction.version,
    sourceUrl: input.sourceUrl,
    query: input.query,
    retrievedAt: input.retrievedAt,
    responseSha256,
    rawEvidenceId: input.rawEvidenceId,
    httpStatus: input.httpStatus,
  };
}

export function createRawConnectorArtifact(
  snapshot: FairProcessSourceSnapshot,
  title: string,
  rawResponse: string,
): ConnectorRawArtifact {
  return {
    snapshotId: snapshot.id,
    connectorId: snapshot.connectorId,
    title,
    sourceUrl: snapshot.sourceUrl,
    retrievedAt: snapshot.retrievedAt,
    mimeType: 'application/json',
    rawResponse,
    sha256: snapshot.responseSha256,
    query: snapshot.query,
  };
}

export function requireConnectorFromPack(
  jurisdiction: JurisdictionPack,
  connectorId: string,
): JurisdictionConnector {
  const connector = jurisdiction.connectors.find((candidate) => candidate.id === connectorId);
  if (!connector) {
    throw new Error(`Jurisdiction pack ${jurisdiction.id} does not declare connector ${connectorId}.`);
  }
  if (!connector.enabled) {
    throw new Error(`Jurisdiction connector ${connectorId} is disabled.`);
  }
  return connector;
}
