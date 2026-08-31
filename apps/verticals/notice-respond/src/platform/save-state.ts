/* ═══════════════════════════════════════════════════════════
   SAVE STATE
   
   Tracks the persistence status of case saves so the UI can
   distinguish: saving, saved, failed, and retry-available.
   
   No more silent .catch(() => {}) — persistence failures are
   surfaced explicitly.
   ═══════════════════════════════════════════════════════════ */

export type SaveState = "idle" | "saving" | "saved" | "failed";

export interface SaveStatus {
  state: SaveState;
  error?: string;
  lastSavedAt?: string;
  retryCount: number;
}

export const initialSaveStatus: SaveStatus = {
  state: "idle",
  retryCount: 0,
};

/**
 * Execute a save operation with explicit state management.
 * Returns the next SaveStatus — never throws silently.
 */
export async function executeSave<T>(
  operation: () => Promise<T>,
  currentStatus: SaveStatus,
): Promise<{ result: T | null; status: SaveStatus }> {
  const savingStatus: SaveStatus = {
    state: "saving",
    retryCount: currentStatus.retryCount,
  };

  try {
    const result = await operation();
    return {
      result,
      status: {
        state: "saved",
        lastSavedAt: new Date().toISOString(),
        retryCount: 0,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      result: null,
      status: {
        state: "failed",
        error: message,
        retryCount: currentStatus.retryCount + 1,
      },
    };
  }
}
