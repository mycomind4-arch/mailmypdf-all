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
  it('persists raw county responses and returns direct evidence links', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/Building/Building_Permits/')) {
        return jsonResponse({
          features: [{
            attributes: {
              PERMIT_NUM: 'BLD-100',
              STATUS: 'Issued',
              APN: '123-456-789',
            },
          }],
        });
      }
      if (url.includes('/Code_Enforcement/Code_Enforcement/')) {
        return jsonResponse({
          features: [{
            attributes: {
              CASE_NUM: 'CE-100',
              STATUS: 'Open',
              VIOLATION_TYPE: 'Unpermitted structure',
              APN: '123-456-789',
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

    expect(intelligence.permits[0]?.record.permitNumber).toBe('BLD-100');
    expect(intelligence.codeEnforcementCases[0]?.record.caseNumber).toBe('CE-100');
    expect(intelligence.permits[0]?.sourceEvidenceId).toMatch(/^evidence-source-/);
    expect(intelligence.codeEnforcementCases[0]?.sourceEvidenceId).toMatch(/^evidence-source-/);

    const evidence = await recordStore.listEvidence('case-1');
    const snapshots = await recordStore.listSourceSnapshots('case-1');
    expect(evidence).toHaveLength(2);
    expect(snapshots).toHaveLength(2);
    expect(snapshots.every((snapshot) => Boolean(snapshot.rawEvidenceId))).toBe(true);
  });
});
