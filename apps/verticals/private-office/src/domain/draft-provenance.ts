/**
 * Draft provenance and version integrity.
 *
 * When a user approves a draft for mailing, the system records a hash of the
 * approved content. If the draft changes after approval (because facts were
 * edited, evidence was added, or the workflow was re-run), the recorded hash
 * no longer matches the current draft hash, and the approval is no longer
 * valid. The user must review and approve the new version before mailing.
 *
 * This prevents a scenario where a user approves version A, the draft is
 * regenerated as version B, and the system mails B without fresh approval.
 */

/**
 * Compute a SHA-256 hash of draft content.
 * Works in both Node.js and browser environments via Web Crypto.
 */
export async function computeDraftHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify that the current draft hash matches the hash recorded at approval time.
 * Returns true only when the approved version is the version being mailed.
 */
export function isApprovalValid(
  currentDraftHash: string | null,
  approvedDraftHash: string | null,
): boolean {
  if (!currentDraftHash || !approvedDraftHash) return false;
  return currentDraftHash === approvedDraftHash;
}
