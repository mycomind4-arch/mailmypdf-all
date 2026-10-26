/**
 * Complete an expired response-window notification without losing failed work.
 * Dispatch must succeed (or durably queue a retry) before the communication is
 * marked as notified. A failed database update must also fail the cron run.
 */
export async function completeExpiryNotification(options: {
  dispatch?: () => Promise<void>;
  markNotified: () => PromiseLike<{ data: { id: string } | null; error: { message: string } | null }>;
}): Promise<void> {
  if (options.dispatch) {
    await options.dispatch();
  }

  const result = await options.markNotified();
  if (!result || result.error || !result.data?.id) {
    throw new Error(
      `Failed to mark proof response window notification: ${result?.error?.message ?? (result ? "no matching communication row" : "no update result")}`,
    );
  }
}

/**
 * An absent tenant is not the same as a tenant with no webhook configured.
 * Never silently mark an expiry notified when its tenant lookup failed.
 */
export function requireExpiryTenant<T>(result: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (result.error) {
    throw new Error(`Proof tenant lookup failed: ${result.error.message}`);
  }
  if (!result.data) {
    throw new Error("Proof tenant lookup returned no matching tenant");
  }
  return result.data;
}

/**
 * A single malformed communication or failed webhook must not starve every
 * later expired response window in the same cron batch. Preserve an error for
 * the overall HTTP 500 while still attempting independent communications.
 */
export async function processExpiryBatch<T>(
  rows: readonly T[],
  handle: (row: T) => Promise<boolean>,
): Promise<{ completed: number; errors: Error[] }> {
  let completed = 0;
  const errors: Error[] = [];
  for (const row of rows) {
    try {
      if (await handle(row)) completed++;
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  return { completed, errors };
}
