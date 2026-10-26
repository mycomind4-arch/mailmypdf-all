/** A failed retry scan must not be reported as zero work completed. */
export function requireWebhookRetryRows<T>(query: {
  data: T[] | null;
  error: { message: string } | null;
}): T[] {
  if (query.error) {
    throw new Error(`Pending proof webhook retries query failed: ${query.error.message}`);
  }
  if (query.data === null) {
    throw new Error("Pending proof webhook retries query returned no rows array");
  }
  return query.data;
}
