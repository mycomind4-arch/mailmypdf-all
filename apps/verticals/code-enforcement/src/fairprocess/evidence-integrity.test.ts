import { describe, expect, it } from 'vitest';
import {
  createEvidenceIntegrityRecord,
  sha256Text,
  verifyEvidenceIntegrity,
} from './evidence-integrity';

describe('FairProcess evidence integrity', () => {
  it('produces the standard SHA-256 digest for text', async () => {
    expect(await sha256Text('hello')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('creates a reproducible integrity record', async () => {
    const record = await createEvidenceIntegrityRecord('county notice', '2026-09-07T22:00:00-07:00');

    expect(record.algorithm).toBe('SHA-256');
    expect(record.representation).toBe('utf8_text');
    expect(record.digest).toHaveLength(64);
    expect(record.byteLength).toBeGreaterThan(0);
    expect(await verifyEvidenceIntegrity('county notice', record.digest)).toBe(true);
    expect(await verifyEvidenceIntegrity('modified notice', record.digest)).toBe(false);
  });
});
