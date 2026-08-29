export const MAX_ANALYSIS_CHARS = 120_000;

export function sanitizeUserContext(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, 8_000).trim() || undefined;
}

export function limitDocumentText(value: string): { text: string; truncated: boolean } {
  const text = value.trim();
  if (text.length <= MAX_ANALYSIS_CHARS) return { text, truncated: false };
  return { text: text.slice(0, MAX_ANALYSIS_CHARS), truncated: true };
}

export function wrapUntrustedDocumentText(text: string): string {
  return `BEGIN_UNTRUSTED_DOCUMENT_TEXT\n${text}\nEND_UNTRUSTED_DOCUMENT_TEXT`;
}
