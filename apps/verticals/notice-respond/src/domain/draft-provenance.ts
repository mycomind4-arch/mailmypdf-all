/* ═══════════════════════════════════════════════════════════
   DRAFT PROVENANCE — traceability from draft assertions to
   supporting facts, evidence, and sources.

   Internal provenance is represented separately from the
   human-facing letter. The user-facing draft remains readable.

   Each assertion in the draft is mapped to its supporting
   facts/evidence. Unsupported assertions are detected before
   approval.

   ═══════════════════════════════════════════════════════════ */

import type { NoticeFact } from "./fact";
import type { Finding } from "./finding";

// ── Assertion Types ────────────────────────────────────────────

export type AssertionType =
  | "amount"        // A dollar amount claim
  | "date"          // A date claim
  | "identifier"   // A notice/reference number
  | "fact"          // A factual statement
  | "evidence_ref"  // Reference to evidence
  | "source_ref"    // Reference to an external source
  | "action"        // A requested action
  | "position";     // A response position/strategy

export type AssertionSupport =
  | "supported"     // Traceable to extracted fact or user input
  | "partially"     // Some support but missing elements
  | "unsupported"   // No supporting evidence found
  | "placeholder";  // Unresolved placeholder

// ── Draft Assertion ──────────────────────────────────────────

export interface DraftAssertion {
  id: string;
  type: AssertionType;
  /** The text segment in the draft */
  text: string;
  /** Character offset in the draft */
  startOffset: number;
  endOffset: number;
  support: AssertionSupport;
  /** Fact IDs that support this assertion */
  supportingFactIds: string[];
  /** Evidence IDs that support this assertion */
  supportingEvidenceIds: string[];
  /** Source references that support this assertion */
  sourceReferences: string[];
  /** Whether this assertion blocks approval */
  blocking: boolean;
  /** Why this assertion is flagged, if unsupported */
  reason?: string;
}

// ── Draft Provenance Map ─────────────────────────────────────

export interface DraftProvenance {
  assertions: DraftAssertion[];
  supported: number;
  partiallySupported: number;
  unsupported: number;
  placeholders: number;
  blocking: number;
  /** Whether the draft is safe for approval */
  safeForApproval: boolean;
}

// ── Build Provenance ─────────────────────────────────────────

export function buildDraftProvenance(
  draftText: string,
  facts: NoticeFact[],
  findings: Finding[],
  evidenceIds: string[] = [],
): DraftProvenance {
  const assertions: DraftAssertion[] = [];
  const factValues = new Map<string, NoticeFact>();
  for (const f of facts) {
    factValues.set(f.value.toLowerCase(), f);
  }

  // ── Find dollar amounts ──
  const amountMatches = draftText.matchAll(/\$[\d,]+\.?\d*/g);
  for (const match of amountMatches) {
    const amount = match[0];
    const startOffset = match.index ?? 0;
    const endOffset = startOffset + amount.length;
    const fact = factValues.get(amount.toLowerCase());

    if (fact) {
      assertions.push({
        id: crypto.randomUUID(),
        type: "amount",
        text: amount,
        startOffset,
        endOffset,
        support: "supported",
        supportingFactIds: [fact.id],
        supportingEvidenceIds: [],
        sourceReferences: [],
        blocking: false,
      });
    } else {
      assertions.push({
        id: crypto.randomUUID(),
        type: "amount",
        text: amount,
        startOffset,
        endOffset,
        support: "unsupported",
        supportingFactIds: [],
        supportingEvidenceIds: [],
        sourceReferences: [],
        blocking: false,
        reason: `Amount "${amount}" not found in extracted facts or user input`,
      });
    }
  }

  // ── Find dates ──
  const dateMatches = draftText.matchAll(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b/gi,
  );
  for (const match of dateMatches) {
    const date = match[0];
    const startOffset = match.index ?? 0;
    const endOffset = startOffset + date.length;
    const fact = facts.find((f) => f.value.includes(date) || date.includes(f.value));

    assertions.push({
      id: crypto.randomUUID(),
      type: "date",
      text: date,
      startOffset,
      endOffset,
      support: fact ? "supported" : "unsupported",
      supportingFactIds: fact ? [fact.id] : [],
      supportingEvidenceIds: [],
      sourceReferences: [],
      blocking: false,
      reason: fact ? undefined : `Date "${date}" not found in extracted facts`,
    });
  }

  // ── Find notice numbers ──
  const noticeMatch = draftText.match(/CP\s*2000[-\s]*\d{2,4}[-\s]*\d{2,6}[-\s]*[A-Z]?/i);
  if (noticeMatch) {
    const noticeNum = noticeMatch[0];
    const startOffset = noticeMatch.index ?? 0;
    const fact = facts.find((f) => f.label.toLowerCase().includes("notice number"));

    assertions.push({
      id: crypto.randomUUID(),
      type: "identifier",
      text: noticeNum,
      startOffset,
      endOffset: startOffset + noticeNum.length,
      support: fact ? "supported" : "unsupported",
      supportingFactIds: fact ? [fact.id] : [],
      supportingEvidenceIds: [],
      sourceReferences: [],
      blocking: fact ? false : true,
      reason: fact ? undefined : `Notice number "${noticeNum}" not found in extracted facts`,
    });
  }

  // ── Find placeholders ──
  const placeholderMatches = draftText.matchAll(/\[[A-Z_ ]+\]/g);
  for (const match of placeholderMatches) {
    const placeholder = match[0];
    const startOffset = match.index ?? 0;
    assertions.push({
      id: crypto.randomUUID(),
      type: "fact",
      text: placeholder,
      startOffset,
      endOffset: startOffset + placeholder.length,
      support: "placeholder",
      supportingFactIds: [],
      supportingEvidenceIds: [],
      sourceReferences: [],
      blocking: true,
      reason: `Unresolved placeholder "${placeholder}"`,
    });
  }

  // ── Find evidence references ──
  if (/enclosed|attached|include|enclose/i.test(draftText)) {
    assertions.push({
      id: crypto.randomUUID(),
      type: "evidence_ref",
      text: "[evidence reference]",
      startOffset: 0,
      endOffset: 0,
      support: evidenceIds.length > 0 ? "supported" : "partially",
      supportingFactIds: [],
      supportingEvidenceIds: evidenceIds,
      sourceReferences: [],
      blocking: false,
      reason: evidenceIds.length === 0 ? "Draft references enclosed documents but no evidence is attached" : undefined,
    });
  }

  // ── Summary ──
  const supported = assertions.filter((a) => a.support === "supported").length;
  const partiallySupported = assertions.filter((a) => a.support === "partially").length;
  const unsupported = assertions.filter((a) => a.support === "unsupported").length;
  const placeholders = assertions.filter((a) => a.support === "placeholder").length;
  const blocking = assertions.filter((a) => a.blocking).length;

  return {
    assertions,
    supported,
    partiallySupported,
    unsupported,
    placeholders,
    blocking,
    safeForApproval: blocking === 0 && unsupported === 0,
  };
}
