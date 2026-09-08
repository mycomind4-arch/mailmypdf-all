import { describe, expect, it, vi } from 'vitest';
import type { FetchLike } from '../connector';
import { HUMBOLDT_FAIRPROCESS_PACK } from './humboldt';
import {
  lookupHumboldtHistoricalCodeEnforcementByApn,
  lookupHumboldtParcelByApn,
} from './humboldt-connector';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Humboldt FairProcess connector', () => {
  it('captures every parcel ArcGIS attempt as a SHA-256 source snapshot', async () => {
    const mock = vi.fn()
      .mockResolvedValueOnce(response({ features: [] }))
      .mockResolvedValueOnce(response({
        features: [
          {
            attributes: {
              APN: '123456789',
              APN_12: '123-456-789',
              FULLADDR: '123 Example Rd',
              SITCITY: 'McKinleyville',
              ZONING: 'RS-5',
              LAT: 40.95,
              LON: -124.1,
            },
          },
        ],
      }));
    const fetchMock = mock as unknown as FetchLike;

    const result = await lookupHumboldtParcelByApn(
      '123-456-789',
      {
        caseId: 'case-1',
        jurisdiction: HUMBOLDT_FAIRPROCESS_PACK,
        retrievedAt: '2026-09-07T22:00:00-07:00',
      },
      fetchMock,
    );

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      apn: '123456789',
      address: '123 Example Rd',
      city: 'McKinleyville',
      zoning: 'RS-5',
    });
    expect(result.snapshots).toHaveLength(2);
    expect(result.artifacts).toHaveLength(2);
    expect(result.snapshots.every((snapshot) => snapshot.responseSha256.length === 64)).toBe(true);
    expect(result.snapshots[0]?.connectorId).toBe('humboldt-parcels');

    const firstUrl = String(mock.mock.calls[0]?.[0]);
    expect(firstUrl).toContain('where=APN_12%3D%27123-456-789%27');
    expect(firstUrl).not.toContain('%27%27123-456-789%27%27');
  });

  it('labels the public code-enforcement GIS result as historical, not current status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      features: [
        {
          attributes: {
            RECORD_ID: 'CE-000042',
            Type_of_Case_1: 'Building',
            DATE_OPENED_1: '2024-11-15',
            APN_1: '123-456-789',
          },
        },
      ],
    })) as unknown as FetchLike;

    const result = await lookupHumboldtHistoricalCodeEnforcementByApn(
      '123456789',
      {
        caseId: 'case-1',
        jurisdiction: HUMBOLDT_FAIRPROCESS_PACK,
        retrievedAt: '2026-09-07T22:00:00-07:00',
      },
      fetchMock,
    );

    expect(result.records[0]).toMatchObject({
      caseNumber: 'CE-000042',
      caseType: 'Building',
      dateOpened: '2024-11-15',
      dataAsOf: '2025-01-15',
    });
    expect(result.warnings.some((warning) => warning.includes('2025-01-15'))).toBe(true);
    expect(HUMBOLDT_FAIRPROCESS_PACK.allowJurisdictionSpecificLegalConclusions).toBe(false);
  });

  it('keeps automated Accela permit retrieval disabled until a supported interface is verified', () => {
    const permitConnector = HUMBOLDT_FAIRPROCESS_PACK.connectors.find(
      (connector) => connector.id === 'humboldt-building-permits',
    );

    expect(permitConnector?.enabled).toBe(false);
    expect(permitConnector?.baseUrl).toContain('aca-prod.accela.com/humboldt');
  });

  it('rejects malformed APNs before calling a county endpoint', async () => {
    const mock = vi.fn();
    const fetchMock = mock as unknown as FetchLike;

    await expect(
      lookupHumboldtParcelByApn(
        'not-an-apn',
        { caseId: 'case-1', jurisdiction: HUMBOLDT_FAIRPROCESS_PACK },
        fetchMock,
      ),
    ).rejects.toThrow(/APN/i);

    expect(mock).not.toHaveBeenCalled();
  });
});
