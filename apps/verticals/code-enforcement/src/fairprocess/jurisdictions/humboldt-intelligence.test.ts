import { describe, expect, it, vi } from 'vitest';
import type { FetchLike } from '../connector';
import {
  InMemoryFairProcessBlobStore,
  InMemoryFairProcessStore,
} from '../store';
import { HUMBOLDT_FAIRPROCESS_PACK } from './humboldt';
import { refreshHumboldtPropertyIntelligence } from './humboldt-intelligence';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Humboldt property intelligence', () => {
  it('persists verified machine-readable sources and exposes direct evidence links', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/Parcels/Parcels/MapServer/0/')) {
        return jsonResponse({
          features: [{
            attributes: {
              APN: '123456789',
              APN_12: '123-456-789',
              FULLADDR: '123 Example Rd',
              SITCITY: 'McKinleyville',
              ZONING: 'RS-5',
            },
          }],
        });
      }
      if (url.includes('/Web/Housing_Public/MapServer/7/')) {
        return jsonResponse({
          features: [{
            attributes: {
              RECORD_ID: 'CE-000100',
              Type_of_Case_1: 'Building',
              DATE_OPENED_1: '2024-10-01',
              APN_1: '123-456-789',
            },
          }],
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    }) as unknown as FetchLike;

    const recordStore = new InMemoryFairProcessStore();
    const blobStore = new InMemoryFairProcessBlobStore();

    const intelligence = await refreshHumboldtPropertyIntelligence({
      caseId: 'case-1',
      apn: '123-456-789',
      jurisdiction: HUMBOLDT_FAIRPROCESS_PACK,
      recordStore,
      blobStore,
      fetcher: fetchMock,
      retrievedAt: '2026-09-07T22:00:00-07:00',
    });

    expect(intelligence.parcels[0]?.record.address).toBe('123 Example Rd');
    expect(intelligence.historicalCodeEnforcementCases[0]?.record.caseNumber).toBe('CE-000100');
    expect(intelligence.parcels[0]?.sourceEvidenceId).toMatch(/^evidence-source-/);
    expect(intelligence.historicalCodeEnforcementCases[0]?.sourceEvidenceId).toMatch(/^evidence-source-/);
    expect(intelligence.currentCodeEnforcementStatusAvailable).toBe(false);
    expect(intelligence.permitSearch.automated).toBe(false);
    expect(intelligence.warnings.some((warning) => warning.includes('2025-01-15'))).toBe(true);

    const evidence = await recordStore.listEvidence('case-1');
    const snapshots = await recordStore.listSourceSnapshots('case-1');
    expect(evidence).toHaveLength(2);
    expect(snapshots).toHaveLength(2);
    expect(snapshots.every((snapshot) => Boolean(snapshot.rawEvidenceId))).toBe(true);
  });
});
