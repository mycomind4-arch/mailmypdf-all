/* ═══════════════════════════════════════════════════════════
   DOCUMENT CLASSIFICATION — classifies uploaded documents
   into appeal-relevant categories with confidence scoring.
   Adapted from Notice Respond's classification system.

   Classification determines:
   - document type (denial letter, policy, medical record, etc.)
   - confidence score
   - whether the document is the primary decision document
   - whether OCR is needed

   The classifier uses pattern matching — NOT AI — so results
   are deterministic and testable.

   ═══════════════════════════════════════════════════════════ */

import type { DomainPackSet } from "./workflow-capabilities";

// ── Types ────────────────────────────────────────────────────

export type DocumentClass =
  | "denial_letter"
  | "explanation_of_benefits"
  | "insurance_policy"
  | "medical_record"
  | "billing_statement"
  | "correspondence"
  | "appeal_form"
  | "court_order"
  | "agency_notice"
  | "supporting_document"
  | "unknown";

export const DOCUMENT_CLASS_LABELS: Record<DocumentClass, string> = {
  denial_letter: "Denial Letter",
  explanation_of_benefits: "Explanation of Benefits (EOB)",
  insurance_policy: "Insurance Policy / Plan Document",
  medical_record: "Medical Record",
  billing_statement: "Billing Statement",
  correspondence: "Correspondence",
  appeal_form: "Appeal Form",
  court_order: "Court Order / Judgment",
  agency_notice: "Agency Notice",
  supporting_document: "Supporting Document",
  unknown: "Unknown Document Type",
};

export interface ClassificationResult {
  documentClass: DocumentClass;
  confidence: number;
  isPrimaryDecision: boolean;
  matchedPatterns: string[];
  needsOCR: boolean;
}

// ── Classification Patterns ───────────────────────────────────
// Primary decision documents are checked FIRST and get a
// priority boost so they win over generic correspondence.

interface ClassPattern {
  class: DocumentClass;
  patterns: RegExp[];
  isPrimary: boolean;
}

const CLASSIFICATION_PATTERNS: ClassPattern[] = [
  // ── Primary decision documents (checked first) ──
  {
    class: "denial_letter",
    patterns: [
      /\b(denied|denial|disapproved|not covered|not eligible)\b/i,
      /\b(claim.{0,20}den(ied|ial))\b/i,
      /\b(we.{0,10}deny|your claim.{0,20}denied|denial of)\b/i,
      /\b(after.{0,30}review.{0,30}deny|unable to (approve|cover|process))\b/i,
      /\b(not covered under|does not (cover|meet))\b/i,
    ],
    isPrimary: true,
  },
  {
    class: "explanation_of_benefits",
    patterns: [
      /\b(explanation of benefits|EOB)\b/i,
      /\b(benefit.{0,10}determination|remittance advice)\b/i,
      /\b(determination:\s*(not covered|denied|approved))\b/i,
    ],
    isPrimary: true,
  },
  {
    class: "agency_notice",
    patterns: [
      /\b(notice of (decision|determination|denial|action))\b/i,
      /\b(department of|bureau of|office of|administration)\b/i,
      /\b(you (are|were) (denied|disqualified|not eligible))\b/i,
    ],
    isPrimary: true,
  },
  {
    class: "court_order",
    patterns: [
      /\b(judgment|judgement|ruling|order|verdict|conviction|decree)\b/i,
      /\b(court of|superior court|municipal court|district court)\b/i,
    ],
    isPrimary: true,
  },
  // ── Supporting documents (checked after) ──
  {
    class: "insurance_policy",
    patterns: [
      /\b(insurance policy|policy provisions|plan document|certificate of coverage)\b/i,
      /\b(section \d|article \d|exclusion.{0,20}provision)\b/i,
      /\b(coverage limits|deductible|coinsurance|out.of.pocket maximum)\b/i,
    ],
    isPrimary: false,
  },
  {
    class: "medical_record",
    patterns: [
      /\b(medical record|progress note|clinical note|treatment note)\b/i,
      /\b(diagnosis|ICD|procedure code|CPT)\b/i,
      /\b(patient name|date of birth|medical history)\b/i,
    ],
    isPrimary: false,
  },
  {
    class: "billing_statement",
    patterns: [
      /\b(billing statement|invoice|statement of account)\b/i,
      /\b(amount due|balance|payment due|charges?)\b/i,
    ],
    isPrimary: false,
  },
  {
    class: "appeal_form",
    patterns: [
      /\b(appeal form|appeal request|request for review|reconsideration form)\b/i,
      /\b(check all that apply|reason for appeal|grounds for appeal)\b/i,
    ],
    isPrimary: false,
  },
  {
    class: "correspondence",
    patterns: [
      /\b(dear (sir|madam|mr|mrs|ms|dr))\b/i,
      /\b(sincerely|regards|best regards)\b/i,
    ],
    isPrimary: false,
  },
];

// ── Classification Engine ─────────────────────────────────────

export function classifyDocument(
  text: string,
  packs?: DomainPackSet,
): ClassificationResult {
  if (!text || text.trim().length < 10) {
    return {
      documentClass: "unknown",
      confidence: 0,
      isPrimaryDecision: false,
      matchedPatterns: [],
      needsOCR: false,
    };
  }

  const matched: string[] = [];
  let bestClass: DocumentClass = "unknown";
  let bestScore = 0;
  let isPrimary = false;

  // Header-based override: if the first line clearly identifies the document type,
  // use that classification with high confidence
  const firstLine = text.split("\n")[0].trim().toUpperCase();
  if (/EXPLANATION OF BENEFITS|\bEOB\b/.test(firstLine)) {
    matched.push("header:explanation_of_benefits");
    bestClass = "explanation_of_benefits";
    bestScore = 5;
    isPrimary = true;
  } else if (/DENIAL|NOT COVERED|DISAPPROVED/.test(firstLine) && !/BENEFITS/.test(firstLine)) {
    matched.push("header:denial_letter");
    bestClass = "denial_letter";
    bestScore = 5;
    isPrimary = true;
  } else if (/NOTICE OF (DECISION|DETERMINATION|DENIAL|ACTION)/.test(firstLine)) {
    matched.push("header:agency_notice");
    bestClass = "agency_notice";
    bestScore = 5;
    isPrimary = true;
  }

  for (const entry of CLASSIFICATION_PATTERNS) {
    let score = 0;
    for (const pattern of entry.patterns) {
      if (pattern.test(text)) {
        score++;
        matched.push(`${entry.class}:${pattern.source.substring(0, 30)}`);
      }
    }
    // Primary decision documents get a priority boost:
    // they win ties and need fewer matches to beat non-primary docs
    const effectiveScore = entry.isPrimary ? score + 0.5 : score;
    if (effectiveScore > bestScore) {
      bestScore = effectiveScore;
      bestClass = entry.class;
      isPrimary = entry.isPrimary;
    }
  }

  // Also check classifier hints from domain pack
  if (packs?.document?.classifierHints) {
    for (const hint of packs.document.classifierHints) {
      if (new RegExp(hint, "i").test(text)) {
        bestScore += 0.5;
        matched.push(`hint:${hint}`);
        if (bestClass === "unknown" || bestClass === "correspondence") {
          bestClass = "denial_letter";
          isPrimary = true;
        }
      }
    }
  }

  // Confidence: pattern matches / max possible patterns for this class
  const maxPatterns = CLASSIFICATION_PATTERNS.find((p) => p.class === bestClass)?.patterns.length ?? 1;
  const confidence = Math.min(1, bestScore / maxPatterns);

  // Detect if OCR might be needed (very short extracted text from a file)
  const needsOCR = text.trim().length < 50 && text.trim().length > 0;

  return {
    documentClass: bestClass,
    confidence,
    isPrimaryDecision: isPrimary,
    matchedPatterns: matched,
    needsOCR,
  };
}
