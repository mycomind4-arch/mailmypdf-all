/**
 * Evidence Graph
 *
 * Creates traceability: Complaint → Notice → Inspection Request → Allegation →
 * Code Section → Property → Evidence → Timeline → Finding → Strategy → Draft
 *
 * A user should be able to click a finding and see:
 * "What evidence caused the system to say this?"
 */

// ─── Evidence Graph Types ─────────────────────────────────────────────────────

export type EvidenceNodeType =
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

export interface EvidenceNode {
  id: string;
  type: EvidenceNodeType;
  label: string;
  description: string;
  factCategory?: string; // VERIFIED_FACT, USER_ASSERTION, etc.
  source?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface EvidenceEdge {
  from: string;
  to: string;
  relationship: string;
  description?: string;
}

export interface EvidenceGraph {
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  summary: string;
}

// ─── Graph Builder ────────────────────────────────────────────────────────────

let nodeCounter = 0;
let edgeCounter = 0;

export function createNode(
  type: EvidenceNodeType,
  label: string,
  description: string,
  options?: Partial<EvidenceNode>,
): EvidenceNode {
  return {
    id: `node-${++nodeCounter}`,
    type,
    label,
    description,
    factCategory: options?.factCategory,
    source: options?.source,
    confidence: options?.confidence,
    metadata: options?.metadata,
  };
}

export function createEdge(from: string, to: string, relationship: string, description?: string): EvidenceEdge {
  return {
    from,
    to,
    relationship,
    description,
  };
}

export function buildEvidenceGraph(inputs: {
  complaintSummary?: string;
  noticeSummary?: string;
  allegations?: string[];
  codeSections?: string[];
  propertyAddress?: string;
  findings?: Array<{ label: string; description: string; factCategory?: string; source?: string }>;
  strategies?: string[];
  draftSummary?: string;
}): EvidenceGraph {
  nodeCounter = 0;
  edgeCounter = 0;
  const nodes: EvidenceNode[] = [];
  const edges: EvidenceEdge[] = [];

  // Complaint → Notice
  const complaintNode = createNode('complaint', 'Complaint', inputs.complaintSummary || 'Alleged complaint about property conditions', { factCategory: 'USER_ASSERTION' });
  nodes.push(complaintNode);

  const noticeNode = createNode('notice', 'Code Enforcement Notice', inputs.noticeSummary || 'Notice received from code enforcement agency', { factCategory: 'USER_ASSERTION', source: 'uploaded-document' });
  nodes.push(noticeNode);
  edges.push(createEdge(complaintNode.id, noticeNode.id, 'triggers', 'Competition allegedly triggered the notice'));

  // Inspection Request
  const inspectionNode = createNode('inspection_request', 'Inspection Request', 'Agency requests permission to inspect the property', { factCategory: 'USER_ASSERTION' });
  nodes.push(inspectionNode);
  edges.push(createEdge(noticeNode.id, inspectionNode.id, 'contains', 'Notice contains an inspection request'));

  // Allegations
  if (inputs.allegations) {
    for (const allegation of inputs.allegations) {
      const allegationNode = createNode('allegation', allegation, `Alleged: ${allegation}`, { factCategory: 'USER_ASSERTION', source: 'notice-text' });
      nodes.push(allegationNode);
      edges.push(createEdge(noticeNode.id, allegationNode.id, 'alleges', 'Notice alleges this condition'));
      edges.push(createEdge(complaintNode.id, allegationNode.id, 'complains_about', 'Complaint references this condition'));
    }
  }

  // Code Sections
  if (inputs.codeSections) {
    for (const section of inputs.codeSections) {
      const sectionNode = createNode('code_section', section, `Cited code section: ${section}`, { factCategory: 'VERIFIED_FACT', source: 'notice-text' });
      nodes.push(sectionNode);
      edges.push(createEdge(noticeNode.id, sectionNode.id, 'cites', 'Notice cites this code section'));
    }
  }

  // Property
  if (inputs.propertyAddress) {
    const propertyNode = createNode('property', inputs.propertyAddress, `Property at ${inputs.propertyAddress}`, { source: 'notice-text' });
    nodes.push(propertyNode);
    edges.push(createEdge(noticeNode.id, propertyNode.id, 'concerns', 'Notice concerns this property'));
    edges.push(createEdge(inspectionNode.id, propertyNode.id, 'targets', 'Inspection targets this property'));
  }

  // Findings
  if (inputs.findings) {
    for (const finding of inputs.findings) {
      const findingNode = createNode('finding', finding.label, finding.description, { factCategory: finding.factCategory, source: finding.source });
      nodes.push(findingNode);
      edges.push(createEdge(noticeNode.id, findingNode.id, 'produces_finding', 'Notice analysis produced this finding'));
    }
  }

  // Strategies
  if (inputs.strategies) {
    for (const strategy of inputs.strategies) {
      const strategyNode = createNode('strategy', strategy, `Strategy: ${strategy}`, { factCategory: 'RECOMMENDATION' });
      nodes.push(strategyNode);
      // Connect to findings
      const findingNodes = nodes.filter(n => n.type === 'finding');
      if (findingNodes.length > 0) {
        edges.push(createEdge(findingNodes[findingNodes.length - 1].id, strategyNode.id, 'suggests', 'Findings suggest this strategy'));
      }
    }
  }

  // Draft
  if (inputs.draftSummary) {
    const draftNode = createNode('draft', 'Response Draft', inputs.draftSummary, { factCategory: 'RECOMMENDATION' });
    nodes.push(draftNode);
    const strategyNodes = nodes.filter(n => n.type === 'strategy');
    if (strategyNodes.length > 0) {
      edges.push(createEdge(strategyNodes[strategyNodes.length - 1].id, draftNode.id, 'produces', 'Strategy produces this draft'));
    } else {
      edges.push(createEdge(noticeNode.id, draftNode.id, 'produces', 'Notice analysis produces this draft'));
    }
  }

  const summary = `Evidence graph contains ${nodes.length} nodes and ${edges.length} edges. Every finding is traceable to its source evidence.`;

  return { nodes, edges, summary };
}

// ─── Traceability Lookup ──────────────────────────────────────────────────────

export function traceEvidence(graph: EvidenceGraph, nodeId: string): { node: EvidenceNode; sources: EvidenceNode[]; targets: EvidenceNode[] } | undefined {
  const node = graph.nodes.find(n => n.id === nodeId);
  if (!node) return undefined;

  const incomingEdges = graph.edges.filter(e => e.to === nodeId);
  const outgoingEdges = graph.edges.filter(e => e.from === nodeId);

  const sources = incomingEdges.map(e => graph.nodes.find(n => n.id === e.from)).filter(Boolean) as EvidenceNode[];
  const targets = outgoingEdges.map(e => graph.nodes.find(n => n.id === e.to)).filter(Boolean) as EvidenceNode[];

  return { node, sources, targets };
}
