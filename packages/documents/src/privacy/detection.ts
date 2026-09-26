import type { SensitiveDataKind, SensitiveFinding } from "./privacy-release-review.js";

export interface PiiDetector {
  readonly name: string;
  detect(input: { documentId: string; text: string }): Promise<SensitiveFinding[]>;
}

type Pattern = { kind: SensitiveDataKind; regex: RegExp; confidence: number };

// Deliberately conservative, common US-format patterns only. False negatives
// (and some false positives, e.g. bank_account against any long digit run)
// are expected and normal for a foundation-status regex detector.
const PATTERNS: readonly Pattern[] = [
  { kind: "social_security_number", regex: /\b\d{3}-\d{2}-\d{4}\b/g, confidence: 0.9 },
  { kind: "email", regex: /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/gi, confidence: 0.95 },
  { kind: "phone", regex: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, confidence: 0.7 },
  { kind: "payment_card", regex: /\b(?:\d[ -]?){13,16}\b/g, confidence: 0.5 },
];

let sequence = 0;
function nextFindingId(): string {
  sequence += 1;
  return `finding_${sequence}`;
}

/**
 * Reference/foundation-status detector: common regex patterns for
 * US-formatted SSNs, emails, phone numbers, and payment-card-shaped digit
 * runs. This is NOT a substitute for a real NLP/ML PII detection service
 * (e.g. Microsoft Presidio, AWS Comprehend PII, Google Cloud DLP) — no
 * international coverage, no name/address/date-of-birth detection, and it
 * will both over- and under-match. It exists to feed `SensitiveFinding[]`
 * into the already-built `createPrivacyReleaseReview` review/redaction gate
 * in privacy-release-review.ts; a human reviewer still makes every
 * retain/redact/exclude decision — this detector only surfaces candidates.
 */
export class RegexPiiDetector implements PiiDetector {
  readonly name = "regex-reference-detector";

  async detect(input: { documentId: string; text: string }): Promise<SensitiveFinding[]> {
    const findings: SensitiveFinding[] = [];
    for (const pattern of PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(input.text)) !== null) {
        findings.push({
          id: nextFindingId(),
          kind: pattern.kind,
          confidence: pattern.confidence,
          excerpt: match[0],
          location: { type: "text_range", start: match.index, end: match.index + match[0].length },
          detector: this.name,
        });
        if (match[0].length === 0) pattern.regex.lastIndex += 1;
      }
    }
    return findings;
  }
}
