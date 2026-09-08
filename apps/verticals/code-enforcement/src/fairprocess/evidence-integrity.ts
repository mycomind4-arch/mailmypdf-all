export interface EvidenceIntegrityRecord {
  algorithm: 'SHA-256';
  digest: string;
  byteLength: number;
  representation: 'raw_bytes' | 'utf8_text';
  createdAt: string;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function asUint8Array(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

/**
 * Cryptographic SHA-256 for immutable evidence identity.
 *
 * This is intentionally separate from the existing secure-ingest `hash`, which is
 * useful for lightweight duplicate detection but is not a cryptographic digest.
 */
export async function sha256Bytes(input: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = asUint8Array(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return toHex(new Uint8Array(digest));
}

export async function sha256Text(text: string): Promise<string> {
  return sha256Bytes(new TextEncoder().encode(text));
}

export async function createEvidenceIntegrityRecord(
  input: ArrayBuffer | Uint8Array | string,
  createdAt = new Date().toISOString(),
): Promise<EvidenceIntegrityRecord> {
  if (typeof input === 'string') {
    const bytes = new TextEncoder().encode(input);
    return {
      algorithm: 'SHA-256',
      digest: await sha256Bytes(bytes),
      byteLength: bytes.byteLength,
      representation: 'utf8_text',
      createdAt,
    };
  }

  const bytes = asUint8Array(input);
  return {
    algorithm: 'SHA-256',
    digest: await sha256Bytes(bytes),
    byteLength: bytes.byteLength,
    representation: 'raw_bytes',
    createdAt,
  };
}

export async function verifyEvidenceIntegrity(
  input: ArrayBuffer | Uint8Array | string,
  expectedDigest: string,
): Promise<boolean> {
  const actual = typeof input === 'string' ? await sha256Text(input) : await sha256Bytes(input);
  return actual.toLowerCase() === expectedDigest.trim().toLowerCase();
}
