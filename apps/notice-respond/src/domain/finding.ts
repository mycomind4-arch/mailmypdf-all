/* ═══════════════════════════════════════════════════════════
   SHARED FINDING MODEL — generic structured analysis output.

   A Finding is a single conclusion the system has reached,
   traceable back to supporting facts. The system NEVER
   generates findings without supporting evidence.

   Domain-specific finding types are defined in domain packs.
   This module provides the generic structure.

   ═══════════════════════════════════════════════════════════ */

// ── Generic Types ─────────────────────────────────────────────

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";
export type FindingConfidence = "high" | "medium" | "low";

// ── Provenance Reference ─────────────────────────────────────

export interface ProvenanceRef {
  /** What kind of source this is */
  kind: "fact" | "evidence" | "source" | "extraction" | "user_input";
  /** ID of the referenced item */
  refId: string;
  /** Human-readable label */
  label: string;
  /** Excerpt from the source */
  excerpt?: string;
}

// ── Finding ───────────────────────────────────────────────────

export interface Finding {
  id: string;
  /** Domain-specific type (e.g. "income_mismatch", "deadline_risk") */
  type: string;
  severity: FindingSeverity;
  statement: string;
  /** Supporting fact IDs or labels */
  supportingFacts: string[];
  /** Structured provenance references */
  provenance: ProvenanceRef[];
  /** External source references (URLs, publication numbers) */
  sourceReferences: string[];
  confidence: FindingConfidence;
  recommendedAction: string;
  unresolved: boolean;
  /** Analysis rule that produced this finding */
  analysisRule?: string;
}

export function createFinding(params: {
  type: string;
  severity: FindingSeverity;
  statement: string;
  supportingFacts: string[];
  provenance?: ProvenanceRef[];
  sourceReferences?: string[];
  confidence: FindingConfidence;
  recommendedAction: string;
  unresolved?: boolean;
  analysisRule?: string;
}): Finding {
  if (params.supportingFacts.length === 0) {
    throw new Error("Finding requires at least one supporting fact");
  }
  return {
    id: crypto.randomUUID(),
    type: params.type,
    severity: params.severity,
    statement: params.statement,
    supportingFacts: params.supportingFacts,
    provenance: params.provenance ?? [],
    sourceReferences: params.sourceReferences ?? [],
    confidence: params.confidence,
    recommendedAction: params.recommendedAction,
    unresolved: params.unresolved ?? true,
    analysisRule: params.analysisRule,
  };
}

// ── Finding Summary ───────────────────────────────────────────

export function findingSummary(findings: Finding[]): {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  unresolved: number;
} {
  return {
    total: findings.length,
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
    info: findings.filter((f) => f.severity === "info").length,
    unresolved: findings.filter((f) => f.unresolved).length,
  };
}

// ── Resolve Finding ───────────────────────────────────────────

export function resolveFinding(finding: Finding): Finding {
  return { ...finding, unresolved: false };
}
