/**
 * Evidence Graph Types
 *
 * Generalized traceability model for workflow lineage:
 * Source → Finding → Strategy → Draft
 *
 * Can represent any domain's evidence chain: code enforcement (complaint → notice → allegation),
 * appeals (decision → analysis → response), records (request → search → fulfillment), etc.
 */

export type EvidenceNodeType =
  | 'source'
  | 'complaint'
  | 'notice'
  | 'inspection_request'
  | 'allegation'
  | 'code_section'
  | 'property'
  | 'evidence_item'
  | 'timeline_event'
  | 'finding'
  | 'strategy'
  | 'draft';

export type FactCategory =
  | 'VERIFIED_FACT'
  | 'USER_ASSERTION'
  | 'EXTRACTED_DATA'
  | 'ANALYZED_FINDING'
  | 'RECOMMENDATION';

export interface EvidenceNode {
  id: string;
  type: EvidenceNodeType;
  label: string;
  description: string;
  factCategory?: FactCategory;
  source?: string;
  confidence?: number; // 0.0–1.0
  metadata?: Record<string, unknown>;
  timestamp?: string; // ISO 8601
}

export interface EvidenceEdge {
  id: string;
  from: string;
  to: string;
  relationship: string; // e.g., "triggers", "contains", "alleges", "cites", "supports", "contradicts"
  description?: string;
  evidence?: string[]; // Supporting quotes or evidence for this edge
}

export interface EvidenceGraph {
  id: string;
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  domain: string; // e.g., "code-enforcement", "appeals", "records-request"
  created: string; // ISO 8601
  summary: string;
}

export interface TraceResult {
  node: EvidenceNode;
  sources: EvidenceNode[]; // Nodes that led to this one
  targets: EvidenceNode[]; // Nodes this one leads to
  sourceEdges: EvidenceEdge[];
  targetEdges: EvidenceEdge[];
}

export interface GraphStatistics {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<EvidenceNodeType, number>;
  nodesByCategory: Record<FactCategory, number>;
  averageConfidence: number;
  unresolvedNodes: EvidenceNode[]; // Nodes with confidence < threshold
}
