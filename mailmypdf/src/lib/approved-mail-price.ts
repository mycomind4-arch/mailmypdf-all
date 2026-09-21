/** Optional only for legacy callers; Mail Desk always supplies the reviewed total. */
export function approvedMailPriceMatches(
  approved: number | undefined,
  actual: number | null,
): boolean {
  return (
    approved === undefined ||
    (actual !== null && Number.isSafeInteger(approved) && approved >= 0 && approved === actual)
  );
}
