import { describe, expect, it, vi } from 'vitest';
import type { FetchLike } from '../connector';
import { HUMBOLDT_FAIRPROCESS_PACK } from './humboldt';
import {
  lookupHumboldtCodeEnforcementByApn,
  lookupHumboldtPermitsByApn,
} from './humboldt-connector';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Humboldt FairProcess connector', () => {
  it('captures every ArcGIS attempt as a SHA-256 source snapshot', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ features: [] }))
      .mockResolvedValueOnce(response({
        features: [
          {
            attributes: {
              PERMIT_NUM: 'BLD-2026-123',
              PERMIT_TYPE: 'Building',
              STATUS: 'Issued',
              ADDRESS: '123 Example Rd',
              APN: '123456789',
              ISSUED_DATE: '2026-08-15',
            },
          },
        ],
      })) as unknown as FetchLike;

    const result = await lookupHumboldtPermitsByApn(
      '123-456-789',
      {
        caseId: 'case-1',
        jurisdiction: HUMBOLDT_FAIRPROCESS_PACK,
        retrievedAt: '2026-09-07T22:00:00-07:00',
      },
      fetchMock,
    );

    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.permitNumber).toBe('BLD-2026-123');
    expect(result.snapshots).toHaveLength(2);
    expect(result.snapshots.every((snapshot) => snapshot.responseSha256.length === 64)).toBe(true);
    expect(result.snapshots[0]?.connectorId).toBe('humboldt-building-permits');

    const firstUrl = String((fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
    expect(firstUrl).toContain('where=APN%3D%27123-456-789%27');
    expect(firstUrl).not.toContain('%27%27123-456-789%27%27');
  });

  it('maps code enforcement records without treating them as legal conclusions', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      features: [
        {
          attributes: {
            CASE_NUM: 'CE-2026-42',
            VIOLATION_TYPE: 'Unpermitted structure',
            STATUS: 'Open',
            NOTICE_SERVED_DATE: '2026-08-20',
            COMPLIANCE_DEADLINE: '2026-09-15',
            LIEN_FILED: 'N',
            APN: '123-456-789',
          },
        },
      ],
    })) as unknown as FetchLike;

    const result = await lookupHumboldtCodeEnforcementByApn(
      '123456789',
      {
        caseId: 'case-1',
        jurisdiction: HUMBOLDT_FAIRPROCESS_PACK,
        retrievedAt: '2026-09-07T22:00:00-07:00',
      },
      fetchMock,
    );

    expect(result.records[0]).toMatchObject({
      caseNumber: 'CE-2026-42',
      violationType: 'Unpermitted structure',
      status: 'Open',
      lienFiled: false,
    });
    expect(HUMBOLDT_FAIRPROCESS_PACK.allowJurisdictionSpecificLegalConclusions).toBe(false);
  });

  it('rejects malformed APNs before calling the county endpoint', async () => {
    const fetchMock = vi.fn() as unknown as FetchLike;

    await expect(
      lookupHumboldtPermitsByApn(
        'not-an-apn',
        { caseId: 'case-1', jurisdiction: HUMBOLDT_FAIRPROCESS_PACK },
        fetchMock,
      ),
    ).rejects.toThrow(/APN/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
