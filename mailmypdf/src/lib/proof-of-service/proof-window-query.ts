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
