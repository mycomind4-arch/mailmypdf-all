/**
 * Evidence Graph Construction and Query
 *
 * Build and traverse traceability graphs for workflow lineage.
 * Every finding is traceable to its source evidence.
 */

import type {
  EvidenceNode,
  EvidenceEdge,
  EvidenceGraph,
  EvidenceNodeType,
  FactCategory,
  TraceResult,
  GraphStatistics,
} from './types.js';

/**
 * Create an evidence graph
 */
export function createGraph(domain: string): EvidenceGraph {
  return {
    id: `graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    nodes: [],
    edges: [],
    domain,
    created: new Date().toISOString(),
    summary: '',
  };
}

/**
 * Add a node to the graph
 */
export function addNode(
  graph: EvidenceGraph,
  type: EvidenceNodeType,
  label: string,
  description: string,
  options?: {
    factCategory?: FactCategory;
    source?: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
    timestamp?: string;
  },
): EvidenceNode {
  const nodeId = `node-${graph.nodes.length}-${Date.now()}`;
  const node: EvidenceNode = {
    id: nodeId,
    type,
    label,
    description,
    factCategory: options?.factCategory,
    source: options?.source,
    confidence: options?.confidence,
    metadata: options?.metadata,
    timestamp: options?.timestamp,
  };
  graph.nodes.push(node);
  return node;
}

/**
 * Add an edge between two nodes
 */
export function addEdge(
  graph: EvidenceGraph,
  fromNodeId: string,
  toNodeId: string,
  relationship: string,
  options?: {
    description?: string;
    evidence?: string[];
  },
): EvidenceEdge {
  const edgeId = `edge-${graph.edges.length}-${Date.now()}`;
  const edge: EvidenceEdge = {
    id: edgeId,
    from: fromNodeId,
    to: toNodeId,
    relationship,
    description: options?.description,
    evidence: options?.evidence,
  };
  graph.edges.push(edge);
  return edge;
}

/**
 * Trace evidence back to source or forward to targets
 */
export function traceEvidence(
  graph: EvidenceGraph,
  nodeId: string,
): TraceResult | undefined {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return undefined;

  const incomingEdges = graph.edges.filter((e) => e.to === nodeId);
  const outgoingEdges = graph.edges.filter((e) => e.from === nodeId);

  const sources = incomingEdges
    .map((e) => graph.nodes.find((n) => n.id === e.from))
    .filter((n) => n !== undefined) as EvidenceNode[];

  const targets = outgoingEdges
    .map((e) => graph.nodes.find((n) => n.id === e.to))
    .filter((n) => n !== undefined) as EvidenceNode[];

  return {
    node,
    sources,
    targets,
    sourceEdges: incomingEdges,
    targetEdges: outgoingEdges,
  };
}

/**
 * Trace all the way up to source nodes
 */
export function traceToSource(
  graph: EvidenceGraph,
  nodeId: string,
  visited = new Set<string>(),
): EvidenceNode[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);

  const trace = traceEvidence(graph, nodeId);
  if (!trace || trace.sources.length === 0) {
    const node = graph.nodes.find((n) => n.id === nodeId);
    return node ? [node] : [];
  }

  const allSources: EvidenceNode[] = [];
  for (const source of trace.sources) {
    allSources.push(...traceToSource(graph, source.id, visited));
  }
  return allSources;
}

/**
 * Trace all the way down to leaf nodes
 */
export function traceToLeaves(
  graph: EvidenceGraph,
  nodeId: string,
  visited = new Set<string>(),
): EvidenceNode[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);

  const trace = traceEvidence(graph, nodeId);
  if (!trace || trace.targets.length === 0) {
    const node = graph.nodes.find((n) => n.id === nodeId);
    return node ? [node] : [];
  }

  const allLeaves: EvidenceNode[] = [];
  for (const target of trace.targets) {
    allLeaves.push(...traceToLeaves(graph, target.id, visited));
  }
  return allLeaves;
}

/**
 * Find all paths from source to a given node
 */
export function findPaths(
  graph: EvidenceGraph,
  fromNodeId: string,
  toNodeId: string,
  maxDepth = 10,
): EvidenceNode[][] {
  const paths: EvidenceNode[][] = [];
  const visited = new Set<string>();

  function dfs(
    nodeId: string,
    path: EvidenceNode[],
    depth: number,
  ): void {
    if (depth > maxDepth) return;
    if (nodeId === toNodeId) {
      paths.push([...path]);
      return;
    }

    const trace = traceEvidence(graph, nodeId);
    if (!trace) return;

    for (const target of trace.targets) {
      if (!visited.has(target.id)) {
        visited.add(target.id);
        dfs(target.id, [...path, target], depth + 1);
        visited.delete(target.id);
      }
    }
  }

  const startNode = graph.nodes.find((n) => n.id === fromNodeId);
  if (startNode) {
    dfs(fromNodeId, [startNode], 0);
  }

  return paths;
}

/**
 * Get graph statistics
 */
export function getStatistics(graph: EvidenceGraph): GraphStatistics {
  const nodesByType: Record<EvidenceNodeType, number> = {
    source: 0,
    complaint: 0,
    notice: 0,
    inspection_request: 0,
    allegation: 0,
    code_section: 0,
    property: 0,
    evidence_item: 0,
    timeline_event: 0,
    finding: 0,
    strategy: 0,
    draft: 0,
  };

  const nodesByCategory: Record<FactCategory, number> = {
    VERIFIED_FACT: 0,
    USER_ASSERTION: 0,
    EXTRACTED_DATA: 0,
    ANALYZED_FINDING: 0,
    RECOMMENDATION: 0,
  };

  for (const node of graph.nodes) {
    nodesByType[node.type]++;
    if (node.factCategory) {
      nodesByCategory[node.factCategory]++;
    }
  }

  const confidences = graph.nodes
    .filter((n) => n.confidence !== undefined)
    .map((n) => n.confidence!);
  const averageConfidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

  const unresolvedNodes = graph.nodes.filter(
    (n) => n.confidence !== undefined && n.confidence < 0.7,
  );

  return {
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    nodesByType,
    nodesByCategory,
    averageConfidence,
    unresolvedNodes,
  };
}

/**
 * Validate graph integrity
 */
export function validateGraph(
  graph: EvidenceGraph,
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const nodeIds = new Set(graph.nodes.map((n) => n.id));

  // Check all edge endpoints exist
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from)) {
      errors.push(`Edge ${edge.id}: source node ${edge.from} not found`);
    }
    if (!nodeIds.has(edge.to)) {
      errors.push(`Edge ${edge.id}: target node ${edge.to} not found`);
    }
  }

  // Check for duplicate node IDs
  const seen = new Set<string>();
  for (const node of graph.nodes) {
    if (seen.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    seen.add(node.id);
  }

  // Check for duplicate edge IDs
  const edgeSeen = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeSeen.has(edge.id)) {
      errors.push(`Duplicate edge ID: ${edge.id}`);
    }
    edgeSeen.add(edge.id);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Export graph as JSON
 */
export function exportGraph(graph: EvidenceGraph): string {
  return JSON.stringify(graph, null, 2);
}

/**
 * Generate human-readable summary
 */
export function generateSummary(graph: EvidenceGraph): string {
  const stats = getStatistics(graph);
  return `Evidence graph contains ${stats.totalNodes} nodes and ${stats.totalEdges} edges. ` +
    `Average confidence: ${(stats.averageConfidence * 100).toFixed(1)}%. ` +
    `Unresolved nodes: ${stats.unresolvedNodes.length}.`;
}
