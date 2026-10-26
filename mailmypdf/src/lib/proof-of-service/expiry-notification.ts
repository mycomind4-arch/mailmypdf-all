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
