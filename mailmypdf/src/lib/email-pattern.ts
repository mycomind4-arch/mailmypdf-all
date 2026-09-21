/** Preserve case-insensitive email matching without interpreting SQL LIKE wildcards. */
export function literalEmailPattern(email: string): string {
  return email.replace(/[\\%_]/g, "\\$&");
}
