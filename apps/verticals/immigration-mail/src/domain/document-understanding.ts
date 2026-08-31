import type { SupportedLanguage, FactSource, ImmigrationDocument, CaseFact } from './immigration-case';

export type ImmigrationAgency = 'USCIS'|'DOS'|'EOIR'|'ICE'|'CBP'|'DHS'|'UNKNOWN';
export type NoticeType = 'RFE'|'NOID'|'receipt'|'biometrics'|'interview'|'decision'|'appointment'|'request_for_evidence'|'other'|'unknown';
export type DocumentUnderstanding = {
  agency: ImmigrationAgency;
  noticeType: NoticeType;
  detectedLanguage: SupportedLanguage;
  plainLanguageSummary: string;
  requestedActions: string[];
  /** Itemized list items parsed from the notice (numbered, lettered, or bulleted). */
  listItems: string[];
  deadlines: { label: string; date?: string; source: FactSource; confidence: number }[];
  facts: CaseFact[];
  warnings: string[];
};

const agencyPattern: Array<[ImmigrationAgency, RegExp]> = [
  ['USCIS', /u\.s\. citizenship and immigration services|uscis/i],
  ['DOS', /department of state|state department|consular/i],
  ['EOIR', /executive office for immigration review|eoir|immigration court/i],
  ['ICE', /immigration and customs enforcement|\bice\b/i],
  ['CBP', /customs and border protection|\bcbp\b/i],
  ['DHS', /department of homeland security|\bdhs\b/i],
];

const datePatterns: RegExp[] = [
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/gi,
  /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
  /\b\d{4}-\d{2}-\d{2}\b/g,
];

export function detectAgency(text: string): ImmigrationAgency {
  return agencyPattern.find(([, pattern]) => pattern.test(text))?.[0] ?? 'UNKNOWN';
}

export function detectNoticeType(text: string): NoticeType {
  if (/request for evidence|\brfe\b/i.test(text)) return 'RFE';
  if (/notice of intent to deny|\bnoid\b/i.test(text)) return 'NOID';
  if (/receipt notice|receipt number|case was received/i.test(text)) return 'receipt';
  if (/biometrics/i.test(text)) return 'biometrics';
  if (/interview/i.test(text)) return 'interview';
  if (/appointment/i.test(text)) return 'appointment';
  if (/decision|we approved|we denied/i.test(text)) return 'decision';
  return 'unknown';
}

function firstRelevantDate(text: string, windowText: string): string | undefined {
  for (const pattern of datePatterns) {
    const match = windowText.match(pattern);
    if (match?.[0]) return normalizeDate(match[0]);
  }
  return undefined;
}

function normalizeDate(value: string): string {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return value;
}

/**
 * Extract itemized list items from notice text.
 *
 * Detects numbered (`1.`, `1)`), lettered (`a)`, `b)`, `a.`, `b.`), and bulleted
 * (`•`, `-`, `*`) lists. Returns each list item as a separate string.
 *
 * To avoid false positives, requires at least 2 items of the same list type
 * (numbered, lettered, or bulleted) before treating them as a list.
 *
 * For numbered lists, items must be sequential (1, 2, 3, ...) or start from a
 * reasonable number. For lettered lists, items must follow alphabetical order.
 */
export function extractListItems(text: string): string[] {
  const lines = text.split(/\n/);

  // Numbered: "1. text" or "1) text" — number at start of line followed by . or )
  const numberedPattern = /^\s*(\d+)[.)]\s+(.{3,})$/;
  // Lettered: "a) text" or "a. text" — single letter at start followed by ) or .
  const letteredPattern = /^\s*([a-z])[.)]\s+(.{3,})$/i;
  // Bulleted: "• text", "- text", "* text"
  const bulletedPattern = /^\s*[•\-\*]\s+(.{3,})$/;

  const numberedItems: string[] = [];
  const letteredItems: string[] = [];
  const bulletedItems: string[] = [];

  let expectedNum = 1;
  let expectedCharCode = 'a'.charCodeAt(0);

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) continue;

    // Check numbered first (most specific — starts with digits)
    const numMatch = line.match(numberedPattern);
    if (numMatch) {
      const num = parseInt(numMatch[1]);
      if (num === expectedNum) {
        numberedItems.push(numMatch[2].trim());
        expectedNum++;
      } else if (num === 1 && numberedItems.length === 0) {
        // Starting a new list at 1
        numberedItems.push(numMatch[2].trim());
        expectedNum = 2;
      }
      // If the number doesn't match the expected sequence, skip it —
      // it's likely not part of the same list (could be a reference like "8 CFR")
      continue;
    }

    // Check lettered
    const letterMatch = line.match(letteredPattern);
    if (letterMatch) {
      const ch = letterMatch[1].toLowerCase().charCodeAt(0);
      if (ch === expectedCharCode) {
        letteredItems.push(letterMatch[2].trim());
        expectedCharCode++;
      } else if (ch === 'a'.charCodeAt(0) && letteredItems.length === 0) {
        letteredItems.push(letterMatch[2].trim());
        expectedCharCode = 'b'.charCodeAt(0);
      }
      continue;
    }

    // Check bulleted
    const bulletMatch = line.match(bulletedPattern);
    if (bulletMatch) {
      bulletedItems.push(bulletMatch[1].trim());
      continue;
    }
  }

  // Only return list items if we found at least 2 of the same type
  // This prevents false positives from single stray numbers/letters
  const items: string[] = [];
  if (numberedItems.length >= 2) items.push(...numberedItems);
  if (letteredItems.length >= 2) items.push(...letteredItems);
  if (bulletedItems.length >= 2) items.push(...bulletedItems);

  return items;
}

export function extractRequestedActions(text: string): string[] {
  const actions = new Set<string>();

  // 1. Fixed-phrase matching (existing behavior — kept for backward compat)
  const patterns: Array<[RegExp, string]> = [
    [/submit\s+(?:the\s+)?requested evidence|provide\s+(?:the\s+)?requested evidence/i, 'Provide the requested evidence.'],
    [/submit\s+(?:the\s+)?documents?|provide\s+(?:the\s+)?documents?/i, 'Submit the requested documents.'],
    [/schedule\s+(?:your\s+)?interview/i, 'Schedule or attend the interview.'],
    [/attend\s+(?:your\s+)?biometrics/i, 'Attend the biometrics appointment.'],
    [/appear\s+(?:for|at)\s+(?:your\s+)?interview/i, 'Attend the interview.'],
    [/respond\s+to\s+(?:this\s+)?notice/i, 'Respond to the notice.'],
    [/file\s+(?:a\s+)?response|file\s+(?:your\s+)?appeal/i, 'File the required response or appeal.'],
  ];
  for (const [pattern, action] of patterns) if (pattern.test(text)) actions.add(action);

  // 2. Parse itemized lists (numbered, lettered, bulleted) as discrete actions.
  // This is the primary mechanism for RFE/NOID notices that list specific evidence
  // requirements in numbered/bulleted format.
  for (const item of extractListItems(text)) {
    actions.add(item);
  }

  return [...actions];
}

export function extractDeadlines(input: { documentId: string; text: string; source: FactSource }): DocumentUnderstanding['deadlines'] {
  const deadlines: DocumentUnderstanding['deadlines'] = [];
  const windowPatterns: Array<[RegExp, string]> = [
    [/(?:respond|submit|provide|file|reply)[^\.\n]{0,140}?within\s+(\d+)\s+days/i, 'Response deadline'],
    [/no later than\s+([^\.\n]{3,60})/i, 'Response deadline'],
    [/deadline\s*(?:is|:)\s*([^\.\n]{3,60})/i, 'Stated deadline'],
  ];
  for (const [pattern, label] of windowPatterns) {
    const match = input.text.match(pattern);
    if (!match) continue;
    const excerpt = match[0];
    const date = firstRelevantDate(input.text, match[1] ?? excerpt);
    deadlines.push({ label, date, source: { ...input.source, quote: excerpt.slice(0, 300) }, confidence: date ? 0.95 : 0.78 });
  }
  return deadlines;
}

export function buildDocumentUnderstanding(input: { documentId: string; text: string; source: FactSource; language: SupportedLanguage }): DocumentUnderstanding {
  const { text, source, language } = input;
  const agency = detectAgency(text);
  const noticeType = detectNoticeType(text);
  const listItems = extractListItems(text);
  const requestedActions = extractRequestedActions(text);
  const deadlines = extractDeadlines(input);
  const warnings: string[] = [];
  if (agency === 'UNKNOWN') warnings.push('Agency could not be confidently identified.');
  if (noticeType === 'unknown') warnings.push('Notice type could not be confidently identified.');
  if (deadlines.length === 0) warnings.push('No explicit deadline was extracted; verify the notice instructions manually.');
  if (requestedActions.length === 0) warnings.push('No explicit requested action was extracted; verify the notice instructions manually.');

  const plainLanguageSummary = [
    agency !== 'UNKNOWN' ? `${agency} document` : 'Immigration document',
    noticeType !== 'unknown' ? `classified as ${noticeType}` : 'with unknown notice type',
    requestedActions.length ? `requiring ${requestedActions.length} identified action(s)` : 'with no identified action yet',
    deadlines.length ? `and ${deadlines.length} identified deadline signal(s)` : 'and no identified deadline',
  ].join(' ');

  return {
    agency,
    noticeType,
    detectedLanguage: language,
    plainLanguageSummary,
    requestedActions,
    listItems,
    deadlines,
    facts: [],
    warnings,
  };
}

export function toImmigrationDocument(input: { id: string; filename: string; uploadedAt: string; understanding: DocumentUnderstanding }): ImmigrationDocument {
  return { id: input.id, filename: input.filename, type: input.understanding.noticeType, agency: input.understanding.agency, language: input.understanding.detectedLanguage, uploadedAt: input.uploadedAt, facts: input.understanding.facts };
}
