import { describe, expect, it } from 'vitest';
import { createRawConnectorArtifact, createSourceSnapshot } from './connector';
import { persistConnectorCapture } from './connector-persistence';
import {
  InMemoryFairProcessBlobStore,
  InMemoryFairProcessStore,
} from './store';
import { HUMBOLDT_FAIRPROCESS_PACK } from './jurisdictions/humboldt';

async function captureFixture() {
  const connector = HUMBOLDT_FAIRPROCESS_PACK.connectors.find(
    (item) => item.id === 'humboldt-code-enforcement-cases',
  );
  if (!connector) throw new Error('fixture connector missing');

  const rawResponse = JSON.stringify({ features: [{ attributes: { CASE_NUM: 'CE-42' } }] });
  const snapshot = await createSourceSnapshot({
    connector,
    connectorVersion: '1.0.0',
    jurisdiction: HUMBOLDT_FAIRPROCESS_PACK,
    caseId: 'case-1',
    sourceUrl: `${connector.baseUrl}/query?where=APN%3D%27123%27`,
    query: { where: "APN='123'" },
    retrievedAt: '2026-09-07T22:00:00-07:00',
    rawResponse,
    httpStatus: 200,
  });

  return {
    rawResponse,
    snapshot,
    artifact: createRawConnectorArtifact(snapshot, 'Humboldt CE response', rawResponse),
  };
}

describe('FairProcess connector persistence', () => {
  it('stores raw source bytes before linking the source snapshot', async () => {
    const store = new InMemoryFairProcessStore();
    const blobs = new InMemoryFairProcessBlobStore();
    const fixture = await captureFixture();

    const persisted = await persistConnectorCapture(
      {
        records: [{ caseNumber: 'CE-42' }],
        snapshots: [fixture.snapshot],
        artifacts: [fixture.artifact],
        warnings: [],
      },
      store,
      blobs,
    );

    expect(persisted.evidenceIds).toHaveLength(1);
    const evidence = await store.getEvidence(persisted.evidenceIds[0]!);
    expect(evidence?.sha256).toBe(fixture.snapshot.responseSha256);
    expect(evidence?.type).toBe('public_source_snapshot');

    const snapshots = await store.listSourceSnapshots('case-1');
    expect(snapshots[0]?.rawEvidenceId).toBe(evidence?.id);

    const blob = await blobs.getBlob(evidence!.storageKey!);
    expect(new TextDecoder().decode(blob?.bytes)).toBe(fixture.rawResponse);
  });

  it('rejects a raw response changed after its snapshot was hashed', async () => {
    const store = new InMemoryFairProcessStore();
    const blobs = new InMemoryFairProcessBlobStore();
    const fixture = await captureFixture();

    await expect(
      persistConnectorCapture(
        {
          records: [],
          snapshots: [fixture.snapshot],
          artifacts: [{ ...fixture.artifact, rawResponse: '{"tampered":true}' }],
          warnings: [],
        },
        store,
        blobs,
      ),
    ).rejects.toThrow(/integrity/i);
  });
});
