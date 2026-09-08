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

export const HUMBOLDT_CONNECTOR_VERSION = '1.0.0';

export interface HumboldtPermitRecord {
  permitNumber: string;
  permitType: string;
  status: string;
  issuedDate: string | null;
  finalizedDate: string | null;
  expiredDate: string | null;
  valuation: number | null;
  description: string | null;
  address: string | null;
  apn: string | null;
  applicantName: string | null;
  contractorName: string | null;
  squareFootage: number | null;
  unitCount: number | null;
  lastInspectionDate: string | null;
  lastInspectionResult: string | null;
  raw: Record<string, unknown>;
}

export interface HumboldtCodeEnforcementRecord {
  caseNumber: string;
  violationType: string;
  status: string;
  noticeServedDate: string | null;
  complianceDeadline: string | null;
  hearingDate: string | null;
  hearingType: string | null;
  abatementDate: string | null;
  abatementCost: number | null;
  appealDate: string | null;
  outcome: string | null;
  address: string | null;
  apn: string | null;
  noticeMethod: string | null;
  noticePeriodDays: number | null;
  lienFiled: boolean;
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

function apnWhereCandidates(apn: string): string[] {
  const { clean, dashed } = normalizeApn(apn);
  return [
    `APN='${dashed}'`,
    `APN='${clean}'`,
    `APN12='${clean}'`,
    `APN12='${dashed}'`,
    `PARCEL_APN='${clean}'`,
  ].filter((value, index, all) => all.indexOf(value) === index);
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

function booleanValue(record: Record<string, unknown>, ...keys: string[]): boolean {
  const value = stringValue(record, ...keys)?.toLowerCase();
  return value === 'y' || value === 'yes' || value === '1' || value === 'true';
}

async function queryArcGisByApn(
  connectorId: string,
  apn: string,
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

  for (const where of apnWhereCandidates(apn)) {
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

function mapPermit(raw: Record<string, unknown>): HumboldtPermitRecord {
  return {
    permitNumber: stringValue(raw, 'PERMIT_NUM', 'PERMIT_NUMBER', 'PERMITNO') ?? '',
    permitType: stringValue(raw, 'PERMIT_TYPE', 'TYPE') ?? '',
    status: stringValue(raw, 'STATUS', 'PERMIT_STATUS') ?? '',
    issuedDate: isoDate(raw, 'ISSUED_DATE', 'ISSUE_DATE'),
    finalizedDate: isoDate(raw, 'FINALIZED_DATE', 'FINAL_DATE'),
    expiredDate: isoDate(raw, 'EXPIRED_DATE', 'EXPIRATION_DATE'),
    valuation: numberValue(raw, 'VALUATION', 'VALUE'),
    description: stringValue(raw, 'DESCRIPTION', 'DESC'),
    address: stringValue(raw, 'ADDRESS', 'SITE_ADDRESS'),
    apn: stringValue(raw, 'APN', 'APN12', 'PARCEL_APN'),
    applicantName: stringValue(raw, 'APPLICANT_NAME', 'APPLICANT'),
    contractorName: stringValue(raw, 'CONTRACTOR_NAME', 'CONTRACTOR'),
    squareFootage: numberValue(raw, 'SQFT', 'SQUARE_FOOTAGE'),
    unitCount: integerValue(raw, 'NUM_UNITS', 'UNITS'),
    lastInspectionDate: isoDate(raw, 'LAST_INSP_DATE', 'LAST_INSPECTION_DATE'),
    lastInspectionResult: stringValue(raw, 'LAST_INSP_RESULT', 'LAST_INSPECTION_RESULT'),
    raw,
  };
}

function mapCodeEnforcement(raw: Record<string, unknown>): HumboldtCodeEnforcementRecord {
  return {
    caseNumber: stringValue(raw, 'CASE_NUM', 'CASE_NUMBER', 'CASENO') ?? '',
    violationType: stringValue(raw, 'VIOLATION_TYPE', 'VIOLATION', 'TYPE') ?? '',
    status: stringValue(raw, 'STATUS', 'CASE_STATUS') ?? '',
    noticeServedDate: isoDate(raw, 'NOTICE_SERVED_DATE', 'NOTICE_DATE'),
    complianceDeadline: isoDate(raw, 'COMPLIANCE_DEADLINE', 'DUE_DATE'),
    hearingDate: isoDate(raw, 'HEARING_DATE'),
    hearingType: stringValue(raw, 'HEARING_TYPE'),
    abatementDate: isoDate(raw, 'ABATEMENT_DATE'),
    abatementCost: numberValue(raw, 'ABATEMENT_COST', 'COST'),
    appealDate: isoDate(raw, 'APPEAL_DATE'),
    outcome: stringValue(raw, 'OUTCOME', 'DISPOSITION'),
    address: stringValue(raw, 'ADDRESS', 'SITE_ADDRESS'),
    apn: stringValue(raw, 'APN', 'APN12', 'PARCEL_APN'),
    noticeMethod: stringValue(raw, 'NOTICE_METHOD'),
    noticePeriodDays: integerValue(raw, 'NOTICE_PERIOD_DAYS'),
    lienFiled: booleanValue(raw, 'LIEN_FILED', 'LIEN'),
    raw,
  };
}

export async function lookupHumboldtPermitsByApn(
  apn: string,
  context: ConnectorRequestContext,
  fetcher: FetchLike = fetch,
): Promise<SourcedConnectorResult<HumboldtPermitRecord>> {
  const result = await queryArcGisByApn(
    'humboldt-building-permits',
    apn,
    context,
    fetcher,
  );

  return {
    records: result.attributes.map(mapPermit),
    snapshots: result.snapshots,
    artifacts: result.artifacts,
    warnings: result.warnings,
  };
}

export async function lookupHumboldtCodeEnforcementByApn(
  apn: string,
  context: ConnectorRequestContext,
  fetcher: FetchLike = fetch,
): Promise<SourcedConnectorResult<HumboldtCodeEnforcementRecord>> {
  const result = await queryArcGisByApn(
    'humboldt-code-enforcement-cases',
    apn,
    context,
    fetcher,
  );

  return {
    records: result.attributes.map(mapCodeEnforcement),
    snapshots: result.snapshots,
    artifacts: result.artifacts,
    warnings: result.warnings,
  };
}
