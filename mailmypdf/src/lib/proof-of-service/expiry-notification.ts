/**
 * Complete an expired response-window notification without losing failed work.
 * Dispatch must succeed (or durably queue a retry) before the communication is
 * marked as notified. A failed database update must also fail the cron run.
 */
export async function completeExpiryNotification(options: {
  dispatch?: () => Promise<void>;
  markNotified: () => Promise<{ error: { message: string } | null }>;
}): Promise<void> {
  if (options.dispatch) {
    await options.dispatch();
  }

  const result = await options.markNotified();
  if (!result || result.error) {
    throw new Error(
      `Failed to mark proof response window notification: ${result?.error?.message ?? "no update result"}`,
    );
  }
}
