/**
 * Cryptographic hashing utilities for the Proof-of-Service layer.
 *
 * These functions provide the tamper-evident foundation that makes
 * Communication Records and Custody Events admissible as evidence.
 *
 * Design:
 * - SHA-256 for all document and record hashes (NIST-approved, legally recognized)
 * - Hash chains: each record/event references the prior one's hash, so
 *   tampering with any entry breaks the chain visibly
 * - Canonical serialization before hashing to ensure reproducibility
 *   (field ordering is deterministic)
 */

import { createHash } from "node:crypto";

// ── Document Hashing ──────────────────────────────────────────────────────────

/**
 * Compute the SHA-256 hash of a file's contents.
 * This is the anchor — every downstream record references this hash.
 *
 * @param data The raw file bytes
 * @returns Hex-encoded SHA-256 digest (64 chars)
 */
export function hashDocument(data: Uint8Array | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

// ── Record Hashing (Canonical JSON) ──────────────────────────────────────────

/**
 * Serialize an object into a canonical JSON string for hashing.
 *
 * Rules:
 * - Keys are sorted alphabetically at every level
 * - No whitespace, no trailing newlines
 * - `undefined` values are omitted (JSON doesn't have undefined)
 * - `null` values are preserved
 * - Arrays preserve order (arrays are ordered by convention)
 *
 * This ensures that the same logical content always produces the same hash,
 * regardless of field insertion order or formatting.
 */
export function canonicalJSON(obj: unknown): string {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj === "string") return JSON.stringify(obj);
  if (typeof obj === "number" || typeof obj === "boolean") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJSON).join(",") + "]";
  }
  if (typeof obj === "object" && obj !== null) {
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    const pairs = keys
      .filter((k) => (obj as Record<string, unknown>)[k] !== undefined)
      .map((k) => JSON.stringify(k) + ":" + canonicalJSON((obj as Record<string, unknown>)[k]));
    return "{" + pairs.join(",") + "}";
  }
  return JSON.stringify(String(obj));
}

/**
 * Compute the SHA-256 hash of a record's canonical content.
 *
 * The hash is computed over the canonical JSON of a defined set of fields
 * (the "content" of the record), NOT including the hash itself or any
 * server-assigned metadata like `id` or `created_at`.
 *
 * @param content The record content fields to hash
 * @returns Hex-encoded SHA-256 digest
 */
export function hashRecord(content: Record<string, unknown>): string {
  return createHash("sha256").update(canonicalJSON(content)).digest("hex");
}

// ── Custody Event Hashing (Hash Chain) ────────────────────────────────────────

/**
 * Compute the hash of a custody event, linking it to the prior event.
 *
 * The hash is computed over: prior_event_hash + timestamp + event_type + description
 * This forms a chain where modifying any event (or reordering them) breaks
 * the chain at that point.
 *
 * @param params The event fields and the prior event's hash
 * @returns Hex-encoded SHA-256 digest
 */
export function hashCustodyEvent(params: {
  priorEventHash: string | null;
  timestamp: string; // ISO 8601
  eventType: string;
  description: string;
}): string {
  const input = `${params.priorEventHash ?? ""}|${params.timestamp}|${params.eventType}|${params.description}`;
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Verify a custody event hash against its claimed content.
 *
 * @returns true if the hash matches the recomputed value
 */
export function verifyCustodyEvent(params: {
  eventHash: string;
  priorEventHash: string | null;
  timestamp: string;
  eventType: string;
  description: string;
}): boolean {
  const expected = hashCustodyEvent({
    priorEventHash: params.priorEventHash,
    timestamp: params.timestamp,
    eventType: params.eventType,
    description: params.description,
  });
  // Timing-safe comparison
  if (expected.length !== params.eventHash.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ params.eventHash.charCodeAt(i);
  }
  return diff === 0;
}

// ── Record Chain Verification ──────────────────────────────────────────────────

/**
 * Verify that a sequence of communication records forms an unbroken hash chain.
 *
 * Each record must have:
 * - `record_sha256` matching its content
 * - `prior_record_hash` matching the previous record's `record_sha256`
 *
 * @returns { valid: boolean, brokenAt: number | null } — index of first break
 */
export function verifyRecordChain(
  records: Array<{
    record_sha256: string;
    prior_record_hash: string | null;
    content: Record<string, unknown>;
  }>,
): { valid: boolean; brokenAt: number | null } {
  let priorHash: string | null = null;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Check prior hash linkage
    if (record.prior_record_hash !== priorHash) {
      return { valid: false, brokenAt: i };
    }

    // Check content hash
    const expectedHash = hashRecord(record.content);
    if (record.record_sha256 !== expectedHash) {
      return { valid: false, brokenAt: i };
    }

    priorHash = record.record_sha256;
  }

  return { valid: true, brokenAt: null };
}

// ── Custody Chain Verification ────────────────────────────────────────────────

/**
 * Verify that a sequence of custody events forms an unbroken hash chain.
 *
 * @returns { valid: boolean, brokenAt: number | null }
 */
export function verifyCustodyChain(
  events: Array<{
    event_hash: string;
    prior_event_hash: string | null;
    timestamp: string;
    event_type: string;
    description: string;
  }>,
): { valid: boolean; brokenAt: number | null } {
  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Check prior hash linkage
    const expectedPrior = i === 0 ? null : events[i - 1].event_hash;
    if (event.prior_event_hash !== expectedPrior) {
      return { valid: false, brokenAt: i };
    }

    // Check content hash
    if (!verifyCustodyEvent({
      eventHash: event.event_hash,
      priorEventHash: event.prior_event_hash,
      timestamp: event.timestamp,
      eventType: event.event_type,
      description: event.description,
    })) {
      return { valid: false, brokenAt: i };
    }
  }

  return { valid: true, brokenAt: null };
}
