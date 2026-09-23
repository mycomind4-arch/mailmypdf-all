/**
 * Unresolved template placeholders in mailed correspondence.
 *
 * A draft that still reads `[YOUR NAME]` or `[DATE]` must never reach a
 * packet, an approval, or the mail. This exists because an unresolved
 * `[Your Name]` placeholder was once treated as a valid signature (see the
 * signature-placeholder entry in context/FACTORY_STATUS.md), so the check is
 * enforced server-side at the mailing gates rather than trusted to a UI.
 *
 * The pattern deliberately matches only bracketed ALL-CAPS tokens, which are
 * template markers rather than prose. Case-sensitive on purpose: `[Your Name]`
 * is caught by the mixed-case variant below, while ordinary bracketed asides a
 * customer might legitimately write are not all-caps template slots.
 */

const ALL_CAPS_PLACEHOLDER = /\[[A-Z0-9][A-Z0-9 _/'.-]{1,60}\]/g;
const TITLE_CASE_PLACEHOLDER =
  /\[(?:Your|Their|Insert|Enter|Recipient|Sender|Client|Full)\s[A-Za-z ]{2,40}\]/g;

/** Every distinct unresolved placeholder in `text`, in first-seen order. */
export function findUnresolvedPlaceholders(text: string): string[] {
  const found = [
    ...(text.match(ALL_CAPS_PLACEHOLDER) ?? []),
    ...(text.match(TITLE_CASE_PLACEHOLDER) ?? []),
  ];
  return [...new Set(found)];
}

/** Human-readable reason a draft cannot be mailed, or null when it is clean. */
export function unresolvedPlaceholderMessage(text: string): string | null {
  const placeholders = findUnresolvedPlaceholders(text);
  if (placeholders.length === 0) return null;
  return `The draft still contains unfilled placeholders: ${placeholders.join(
    ", ",
  )}. Replace them before the packet can be built or approved.`;
}
