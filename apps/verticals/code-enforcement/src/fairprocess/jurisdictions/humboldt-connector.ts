import {
  createRawConnectorArtifact,
  createSourceSnapshot,
  requireConnectorFromPack,
  type ConnectorRawArtifact,
  type ConnectorRequestContext,
  type FetchLike,
  type SourcedConnectorResult,
} from '../connector';
import type { FairProcessSourceSnapshot } from '../store';

export const HUMBOLDT_CONNECTOR_VERSION = '1.1.0';
export const HUMBOLDT_HISTORICAL_CE_DATA_AS_OF = '2025-01-15';

export interface HumboldtParcelRecord {
  apn: string | null;
  apn12: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  acres: number | null;
  zoning: string | null;
  generalPlan: string | null;
  communityPlan: string | null;
  lotSizeSqFt: number | null;
  buildingSqFt: number | null;
  yearBuilt: number | null;
  coastalZone: string | null;
  coastalJurisdiction: string | null;
  floodZone: string | null;
  stateFireResponsibility: string | null;
  supervisorDistrict: string | null;
  latitude: number | null;
  longitude: number | null;
  legalDescription: string | null;
  jurisdiction: string | null;
  inspectorDistrict: string | null;
  raw: Record<string, unknown>;
}

export interface HumboldtHistoricalCodeEnforcementRecord {
  caseNumber: string;
  caseType: string | null;
  dateOpened: string | null;
  apn: string | null;
  dataAsOf: typeof HUMBOLDT_HISTORICAL_CE_DATA_AS_OF;
  raw: Record<string, unknown>;
}

interface ArcGisResponse {
  features?: Array<{ attributes?: Record<string, unknown> }>;
  error?: { code?: number; message?: string; details?: string[] };
}

function normalizeApn(apn: string): { clean: string; dashed: string } {
  const clean = apn.replace(/\D/g, '');
  if (clean.length < 6 || clean.length > 14) {
    throw new Error('APN must contain between 6 and 14 digits.');
  }

  let dashed = clean;
  if (clean.length === 9) {
    dashed = `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)}`;
  } else if (clean.length === 12) {
    dashed = `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)}-${clean.slice(9, 12)}`;
  }

  return { clean, dashed };
}

function apnWhereCandidates(apn: string, fields: string[]): string[] {
  const { clean, dashed } = normalizeApn(apn);
  const values = clean === dashed ? [clean] : [dashed, clean];
  return fields
    .flatMap((field) => values.map((value) => `${field}='${value}'`))
    .filter((value, index, all) => all.indexOf(value) === index);
}

function stringValue(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return null;
}

function numberValue(record: Record<string, unknown>, ...keys: string[]): number | null {
  const value = stringValue(record, ...keys);
  if (value === null) return null;
  const parsed = Number(value.replace(/[$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function integerValue(record: Record<string, unknown>, ...keys: string[]): number | null {
  const value = numberValue(record, ...keys);
  return value === null ? null : Math.trunc(value);
}

function isoDate(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (value === null || value === undefined || value === '') continue;

    const candidate = typeof value === 'number'
      ? new Date(value)
      : /^\d{10,13}$/.test(String(value).trim())
        ? new Date(Number(value))
        : new Date(String(value));

    if (!Number.isNaN(candidate.getTime())) return candidate.toISOString().slice(0, 10);
  }
  return null;
}

async function queryArcGisByApn(
  connectorId: string,
  apn: string,
  apnFields: string[],
  context: ConnectorRequestContext,
  fetcher: FetchLike,
): Promise<{
  attributes: Record<string, unknown>[];
  snapshots: FairProcessSourceSnapshot[];
  artifacts: ConnectorRawArtifact[];
  warnings: string[];
}> {
  const connector = requireConnectorFromPack(context.jurisdiction, connectorId);
  const snapshots: FairProcessSourceSnapshot[] = [];
  const artifacts: ConnectorRawArtifact[] = [];
  const warnings: string[] = [];
  const retrievedAt = context.retrievedAt ?? new Date().toISOString();

  for (const where of apnWhereCandidates(apn, apnFields)) {
    const params = new URLSearchParams({
      where,
      outFields: '*',
      returnGeometry: 'false',
      resultRecordCount: '100',
      f: 'json',
    });
    const requestUrl = `${connector.baseUrl}/query?${params.toString()}`;

    let response: Response;
    let rawResponse: string;
    try {
      response = await fetcher(requestUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      rawResponse = await response.text();
    } catch (error) {
      warnings.push(
        `${connector.name} request failed for ${where}: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    const snapshot = await createSourceSnapshot({
      connector,
      connectorVersion: HUMBOLDT_CONNECTOR_VERSION,
      jurisdiction: context.jurisdiction,
      caseId: context.caseId,
      sourceUrl: requestUrl,
      query: { where, outFields: '*', returnGeometry: false, resultRecordCount: 100 },
      retrievedAt,
      rawResponse,
      httpStatus: response.status,
    });
    snapshots.push(snapshot);
    artifacts.push(
      createRawConnectorArtifact(
        snapshot,
        `${connector.name} response (${where})`,
        rawResponse,
      ),
    );

    if (!response.ok) {
      warnings.push(`${connector.name} returned HTTP ${response.status} for ${where}.`);
      continue;
    }

    let parsed: ArcGisResponse;
    try {
      parsed = JSON.parse(rawResponse) as ArcGisResponse;
    } catch {
      warnings.push(`${connector.name} returned invalid JSON for ${where}.`);
      continue;
    }

    if (parsed.error) {
      warnings.push(
        `${connector.name} ArcGIS error${parsed.error.code ? ` ${parsed.error.code}` : ''}: ${parsed.error.message ?? 'unknown error'}`,
      );
      continue;
    }

    const attributes = (parsed.features ?? [])
      .map((feature) => feature.attributes)
      .filter((value): value is Record<string, unknown> => Boolean(value));

    if (attributes.length > 0) {
      return { attributes, snapshots, artifacts, warnings };
    }
  }

  return { attributes: [], snapshots, artifacts, warnings };
}

function mapParcel(raw: Record<string, unknown>): HumboldtParcelRecord {
  return {
    apn: stringValue(raw, 'APN'),
    apn12: stringValue(raw, 'APN_12', 'APN12'),
    address: stringValue(raw, 'FULLADDR'),
    city: stringValue(raw, 'SITCITY'),
    zip: stringValue(raw, 'SITZIP'),
    acres: numberValue(raw, 'ACRES'),
    zoning: stringValue(raw, 'ZONING'),
    generalPlan: stringValue(raw, 'GEN_PLAN'),
    communityPlan: stringValue(raw, 'COMMPLAN'),
    lotSizeSqFt: numberValue(raw, 'LOTSIZE'),
    buildingSqFt: numberValue(raw, 'SP_AREA'),
    yearBuilt: integerValue(raw, 'YEAR_BUILT'),
    coastalZone: stringValue(raw, 'CZ'),
    coastalJurisdiction: stringValue(raw, 'CJ'),
    floodZone: stringValue(raw, 'FZ'),
    stateFireResponsibility: stringValue(raw, 'SRA'),
    supervisorDistrict: stringValue(raw, 'SUPD_DIST'),
    latitude: numberValue(raw, 'LAT'),
    longitude: numberValue(raw, 'LON'),
    legalDescription: stringValue(raw, 'LEGAL'),
    jurisdiction: stringValue(raw, 'JURIS'),
    inspectorDistrict: stringValue(raw, 'INSP_DIST'),
    raw,
  };
}

function mapHistoricalCodeEnforcement(
  raw: Record<string, unknown>,
): HumboldtHistoricalCodeEnforcementRecord {
  return {
    caseNumber: stringValue(raw, 'RECORD_ID') ?? '',
    caseType: stringValue(raw, 'Type_of_Case_1'),
    dateOpened: isoDate(raw, 'DATE_OPENED_1'),
    apn: stringValue(raw, 'APN_1'),
    dataAsOf: HUMBOLDT_HISTORICAL_CE_DATA_AS_OF,
    raw,
  };
}

export async function lookupHumboldtParcelByApn(
  apn: string,
  context: ConnectorRequestContext,
  fetcher: FetchLike = fetch,
): Promise<SourcedConnectorResult<HumboldtParcelRecord>> {
  const result = await queryArcGisByApn(
    'humboldt-parcels',
    apn,
    ['APN_12', 'APN12', 'APN'],
    context,
    fetcher,
  );

  return {
    records: result.attributes.map(mapParcel),
    snapshots: result.snapshots,
    artifacts: result.artifacts,
    warnings: result.warnings,
  };
}

export async function lookupHumboldtHistoricalCodeEnforcementByApn(
  apn: string,
  context: ConnectorRequestContext,
  fetcher: FetchLike = fetch,
): Promise<SourcedConnectorResult<HumboldtHistoricalCodeEnforcementRecord>> {
  const result = await queryArcGisByApn(
    'humboldt-code-enforcement-cases',
    apn,
    ['APN_1'],
    context,
    fetcher,
  );

  return {
    records: result.attributes.map(mapHistoricalCodeEnforcement),
    snapshots: result.snapshots,
    artifacts: result.artifacts,
    warnings: [
      'Humboldt public GIS code-enforcement data is labeled as of 2025-01-15 and must not be presented as current case status.',
      ...result.warnings,
    ],
  };
}
