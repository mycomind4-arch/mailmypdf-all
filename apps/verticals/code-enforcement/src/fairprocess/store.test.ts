import { describe, expect, it } from 'vitest';
import { InMemoryFairProcessStore, type FairProcessEvidenceRecord } from './store';

function evidence(overrides: Partial<FairProcessEvidenceRecord> = {}): FairProcessEvidenceRecord {
  return {
    id: 'evidence-1',
    caseId: 'case-1',
    type: 'government_notice',
    title: 'County notice',
    sha256: 'a'.repeat(64),
    evidenceVersion: 1,
    immutableAt: '2026-09-07T22:00:00-07:00',
    ...overrides,
  };
}

describe('FairProcess case record store', () => {
  it('rejects silent replacement of evidence bytes', async () => {
    const store = new InMemoryFairProcessStore();
    await store.putEvidence(evidence());

    await expect(
      store.putEvidence(evidence({ sha256: 'b'.repeat(64) })),
    ).rejects.toThrow(/immutable/i);
  });

  it('permits explicit versioned evidence replacement in the same case', async () => {
    const store = new InMemoryFairProcessStore();
    await store.putEvidence(evidence());
    await store.putEvidence(
      evidence({
        id: 'evidence-2',
        sha256: 'b'.repeat(64),
        evidenceVersion: 2,
        supersedesEvidenceId: 'evidence-1',
        immutableAt: '2026-09-07T22:01:00-07:00',
      }),
    );

    expect((await store.listEvidence('case-1')).map((item) => item.id)).toEqual([
      'evidence-1',
      'evidence-2',
    ]);
  });

  it('withdraws evidence without deleting or rewriting the original digest', async () => {
    const store = new InMemoryFairProcessStore();
    await store.putEvidence(evidence());

    const withdrawn = await store.withdrawEvidence('evidence-1', 'Duplicate scan');

    expect(withdrawn.sha256).toBe('a'.repeat(64));
    expect(withdrawn.withdrawalReason).toBe('Duplicate scan');
    expect(await store.getEvidence('evidence-1')).toBeDefined();
  });

  it('requires a source snapshot raw artifact to belong to the same case', async () => {
    const store = new InMemoryFairProcessStore();
    await store.putEvidence(evidence());

    await expect(
      store.putSourceSnapshot({
        id: 'snapshot-1',
        caseId: 'case-2',
        connectorId: 'humboldt-code-enforcement-cases',
        jurisdictionPackId: 'us-ca-humboldt',
        jurisdictionPackVersion: '2026-09-07.1',
        sourceUrl: 'https://example.test/query',
        retrievedAt: '2026-09-07T22:00:00-07:00',
        responseSha256: 'c'.repeat(64),
        rawEvidenceId: 'evidence-1',
      }),
    ).rejects.toThrow(/same case/i);
  });
});
