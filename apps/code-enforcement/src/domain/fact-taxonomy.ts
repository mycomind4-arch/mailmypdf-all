/**
 * Fact Taxonomy
 *
 * Every important claim must be one of:
 * VERIFIED_FACT, USER_ASSERTION, INFERENCE, UNKNOWN, RULE, RECOMMENDATION, CONFLICT
 *
 * The UI must visibly distinguish these categories.
 */

export type FactCategory =
  | 'VERIFIED_FACT'
  | 'USER_ASSERTION'
  | 'INFERENCE'
  | 'UNKNOWN'
  | 'RULE'
  | 'RECOMMENDATION'
  | 'CONFLICT';

// ─── Fact Status (Correction Lifecycle) ───────────────────────────────────────
//
// FactStatus tracks the lifecycle state of a fact during correction review.
// Distinct from FactCategory (which classifies the *kind* of fact), FactStatus
// tracks whether a fact has been verified against source documents, disputed
// by contradicting evidence, or remains an unverified user assertion.

export type FactStatus =
  | 'verified'        // Confirmed against authoritative source documents
  | 'user_assertion'  // Asserted by the user, not yet verified against sources
  | 'conflict'        // Contradicts other evidence; needs resolution
  | 'inference'       // Derived by inference from other facts
  | 'unknown';        // Status not yet determined

export interface FactProvenance {
  source: string;
  documentId?: string;
  page?: number;
  excerpt?: string;
  url?: string;
  retrievedAt?: string;
  extractionMethod?: 'manual' | 'ocr' | 'ai_assisted' | 'user_provided' | 'official_source';
  confidence: number;
}

export interface ClassifiedFact {
  id: string;
  category: FactCategory;
  claim: string;
  provenance: FactProvenance;
  verified: boolean;
  supportingEvidence?: string[];
  contradictingEvidence?: string[];
  notes?: string;
}

// ─── Fact Category Helpers ───────────────────────────────────────────────────

export function isHighConfidence(fact: ClassifiedFact): boolean {
  return fact.provenance.confidence >= 0.85;
}

export function requiresHumanReview(fact: ClassifiedFact): boolean {
  return fact.category === 'CONFLICT' || fact.category === 'UNKNOWN' ||
    (fact.category === 'INFERENCE' && !isHighConfidence(fact));
}

export function factCategoryLabel(category: FactCategory): string {
  const labels: Record<FactCategory, string> = {
    VERIFIED_FACT: 'Verified Fact',
    USER_ASSERTION: 'User Assertion',
    INFERENCE: 'Inference',
    UNKNOWN: 'Unknown',
    RULE: 'Rule (Official Source)',
    RECOMMENDATION: 'Recommendation',
    CONFLICT: 'Conflict',
  };
  return labels[category];
}

export function factCategoryColor(category: FactCategory): string {
  // These are used by the UI to visually distinguish categories
  const colors: Record<FactCategory, string> = {
    VERIFIED_FACT: 'green',
    USER_ASSERTION: 'amber',
    INFERENCE: 'blue',
    UNKNOWN: 'gray',
    RULE: 'purple',
    RECOMMENDATION: 'teal',
    CONFLICT: 'red',
  };
  return colors[category];
}

// ─── Factory Helpers ─────────────────────────────────────────────────────────

let factCounter = 0;

export function createFact(
  category: FactCategory,
  claim: string,
  provenance: Partial<FactProvenance>,
): ClassifiedFact {
  return {
    id: `fact-${++factCounter}`,
    category,
    claim,
    provenance: {
      source: provenance.source || 'unknown',
      documentId: provenance.documentId,
      page: provenance.page,
      excerpt: provenance.excerpt,
      url: provenance.url,
      retrievedAt: provenance.retrievedAt || new Date().toISOString(),
      extractionMethod: provenance.extractionMethod || 'ai_assisted',
      confidence: provenance.confidence ?? 0.5,
    },
    verified: category === 'VERIFIED_FACT' || category === 'RULE',
  };
}

export function resetFactCounter(): void {
  factCounter = 0;
}

// ─── Assertion Wrapper ────────────────────────────────────────────────────────

/**
 * Wrap a user-supplied event as USER_ASSERTION until independently verified.
 * Never silently convert the user's story into verified fact.
 */
export function asUserAssertion(claim: string, source: string): ClassifiedFact {
  return createFact('USER_ASSERTION', claim, {
    source,
    extractionMethod: 'user_provided',
    confidence: 0.5,
  });
}

export function asVerifiedFact(claim: string, provenance: Partial<FactProvenance>): ClassifiedFact {
  return createFact('VERIFIED_FACT', claim, {
    ...provenance,
    confidence: provenance.confidence ?? 0.9,
    extractionMethod: provenance.extractionMethod || 'official_source',
  });
}

export function asUnknown(claim: string, source: string): ClassifiedFact {
  return createFact('UNKNOWN', claim, {
    source,
    confidence: 0,
  });
}

export function asInference(claim: string, source: string, confidence: number): ClassifiedFact {
  return createFact('INFERENCE', claim, {
    source,
    confidence,
  });
}

export function asRule(claim: string, provenance: Partial<FactProvenance>): ClassifiedFact {
  return createFact('RULE', claim, {
    ...provenance,
    confidence: provenance.confidence ?? 0.9,
    extractionMethod: 'official_source',
  });
}

export function asRecommendation(claim: string, source: string): ClassifiedFact {
  return createFact('RECOMMENDATION', claim, {
    source,
    confidence: 0.7,
  });
}

export function asConflict(claim: string, evidence: string[], source: string): ClassifiedFact {
  return createFact('CONFLICT', claim, {
    source,
    confidence: 0.8,
    excerpt: evidence.join('; '),
  });
}
