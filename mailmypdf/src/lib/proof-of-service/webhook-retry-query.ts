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

/**
 * A broken webhook delivery must not starve independent retries later in the
 * batch. Keep processing, but fail the cron run if any delivery failed.
 */
export async function processWebhookRetryBatch<T>(
  rows: readonly T[],
  handle: (row: T) => Promise<boolean>,
): Promise<number> {
  let processed = 0;
  const errors: Error[] = [];
  for (const row of rows) {
    try {
      if (await handle(row)) processed++;
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  if (errors.length) {
    throw new AggregateError(
      errors,
      `Proof webhook retry batch failed for ${errors.length} delivery(s) after ${processed} processed: ${errors.map((error) => error.message).join("; ")}`,
    );
  }
  return processed;
}

/** A queued delivery without a valid tenant destination must not disappear as a zero-work retry. */
export function requireWebhookRetryTarget(tenant: Record<string, unknown> | null | undefined): {
  webhookUrl: string;
  webhookSecret: string | null;
} {
  if (!tenant) throw new Error("Proof webhook retry tenant record is missing");
  const webhookUrl = tenant.webhook_url;
  if (typeof webhookUrl !== "string" || webhookUrl.trim() === "") {
    throw new Error("Proof webhook retry tenant has no configured webhook URL");
  }
  const secret = tenant.webhook_secret;
  if (secret != null && typeof secret !== "string") {
    throw new Error("Proof webhook retry tenant has an invalid webhook secret");
  }
  return { webhookUrl, webhookSecret: (secret ?? null) as string | null };
}
