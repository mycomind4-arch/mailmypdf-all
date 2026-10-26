/**
 * Exclude already-notified windows before applying the scan limit.
 * A missing metadata key yields SQL NULL, so both NULL and values other than
 * true must be included. Filtering after LIMIT can starve later windows forever.
 */
export const UNNOTIFIED_PROOF_WINDOW_FILTER =
  "metadata->>window_expiry_notified.is.null,metadata->>window_expiry_notified.neq.true";

/** Fail closed when the proof-of-service expiry scan cannot read its rows. */
export function requireProofWindowRows<T>(query: {
  data: T[] | null;
  error: { message: string } | null;
}): T[] {
  if (query.error) {
    throw new Error(`Expired proof communications query failed: ${query.error.message}`);
  }
  if (query.data === null) {
    throw new Error("Expired proof communications query returned no rows array");
  }
  return query.data;
}
