// ─── INVESTIGATION DOMAIN TYPES ──────────────────────────────────────────
// Adapted from ruthlessinvestigator's canonical evidence model.
// Per the blueprint: ruthlessinvestigator's evidence graph is the source of truth
// for investigations. code-enforcement syncs summaries back into its own
// discrepancy-engine for case-specific findings.

export type EvidenceType =
  | "OBSERVATION" | "MEASUREMENT" | "DOCUMENTED_EVENT" | "STATEMENT"
  | "PROJECTION" | "ESTIMATE" | "INFERENCE" | "TESTIMONY"
  | "FINANCIAL_RECORD" | "GOVERNMENT_RECORD" | "ACADEMIC_FINDING"
  | "DATASET" | "CORRESPONDENCE" | "SECONDARY_REPORT"
  | "LIMITATION" | "ATTRIBUTION" | "UNKNOWN";

export type ClaimType =
  | "FACTUAL" | "CAUSAL" | "TEMPORAL" | "QUANTITATIVE"
  | "ATTRIBUTION" | "RELATIONAL" | "MOTIVATIONAL" | "SPECULATIVE";

export interface SourceQuality {
  authority: number; proximity: number; specificity: number;
  independence: number; transparency: number; recency: number; trackRecord: number;
}

export interface InvestigationSource {
  id: string; title: string; url?: string;
  sourceType: EvidenceType; quality: SourceQuality;
  citedBy: string[]; cites: string[]; isPrimary: boolean;
  addedBy: string; addedAt: number;
}

export interface Evidence {
  id: string; text: string; type: EvidenceType; sourceId: string;
  extractedBy: string; extractedAt: number;
  supportsClaimId?: string; contradictsClaimId?: string;
  independentConfirmation: boolean; rootSourceIds: string[];
}

export interface Claim {
  id: string; text: string; type: ClaimType;
  supportingEvidence: string[]; contradictingEvidence: string[];
  status: "UNVERIFIED" | "SUPPORTED" | "CONTRADICTED" | "DISPUTED" | "EXPLAINED";
  createdBy: string; createdAt: number;
  hypothesisId?: string; dependsOn?: string[];
}

export interface ExpectedEvidence {
  id: string; description: string;
  status: "FOUND" | "MISSING" | "NEGATIVE" | "UNKNOWN";
  evidenceId?: string; negativeEvidenceId?: string;
}

export interface HypothesisIteration {
  iteration: number; timestamp: number;
  previousSupport: Hypothesis["supportLevel"]; newSupport: Hypothesis["supportLevel"]; reason: string;
}

export interface Hypothesis {
  id: string; statement: string; type: ClaimType;
  supportLevel: "NONE" | "WEAK" | "MODERATE" | "STRONG" | "INSUFFICIENT_EVIDENCE";
  supportingEvidence: string[]; contradictingEvidence: string[];
  claims: string[]; assumptions: string[];
  expectedEvidence: ExpectedEvidence[]; unknowns: string[];
  iterations: HypothesisIteration[]; createdAt: number; updatedAt: number;
}

export type ContradictionStatus = "POTENTIAL" | "CONFIRMED" | "EXPLAINED" | "UNRESOLVED";

export interface Contradiction {
  id: string; claimA: string; claimB: string;
  description: string; status: ContradictionStatus;
  detectedBy: string; detectedAt: number; resolution?: string;
}

export type GraphEdgeType = "supports" | "contradicts" | "weakens" | "depends_on" | "cites" | "related_to" | "belongs_to";

export interface GraphEdge { from: string; to: string; type: GraphEdgeType; label?: string; }
export interface GraphNode {
  id: string; type: "investigation" | "hypothesis" | "claim" | "evidence" | "source" | "contradiction";
  label: string; data: Record<string, unknown>;
}
export interface EvidenceGraph { nodes: GraphNode[]; edges: GraphEdge[]; }

export interface InvestigationState {
  id: string; question: string; phase: string;
  hypotheses: Map<string, Hypothesis>; claims: Map<string, Claim>;
  evidence: Map<string, Evidence>; sources: Map<string, InvestigationSource>;
  contradictions: Map<string, Contradiction>;
  createdAt: number; updatedAt: number;
}
