import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  createGraph,
  addNode,
  addEdge,
  traceEvidence,
  traceToSource,
  traceToLeaves,
  findPaths,
  getStatistics,
  validateGraph,
  generateSummary,
  type EvidenceGraph,
} from '../src/index.js';

test('createGraph - initializes empty graph', () => {
  const graph = createGraph('test-domain');
  assert.equal(graph.domain, 'test-domain');
  assert.equal(graph.nodes.length, 0);
  assert.equal(graph.edges.length, 0);
  assert(graph.id);
  assert(graph.created);
});

test('addNode - adds node to graph', () => {
  const graph = createGraph('test');
  const node = addNode(graph, 'source', 'Test Source', 'A test source node');

  assert.equal(graph.nodes.length, 1);
  assert.equal(node.type, 'source');
  assert.equal(node.label, 'Test Source');
  assert(node.id);
});

test('addNode - with options includes metadata', () => {
  const graph = createGraph('test');
  const node = addNode(graph, 'finding', 'Test Finding', 'A finding', {
    factCategory: 'ANALYZED_FINDING',
    confidence: 0.95,
    source: 'ai-analysis',
  });

  assert.equal(node.factCategory, 'ANALYZED_FINDING');
  assert.equal(node.confidence, 0.95);
  assert.equal(node.source, 'ai-analysis');
});

test('addEdge - connects two nodes', () => {
  const graph = createGraph('test');
  const source = addNode(graph, 'source', 'Source', 'source');
  const finding = addNode(graph, 'finding', 'Finding', 'finding');

  const edge = addEdge(
    graph,
    source.id,
    finding.id,
    'produces_finding',
    { description: 'Source analysis produces this finding' },
  );

  assert.equal(graph.edges.length, 1);
  assert.equal(edge.from, source.id);
  assert.equal(edge.to, finding.id);
  assert.equal(edge.relationship, 'produces_finding');
});

test('traceEvidence - finds incoming and outgoing edges', () => {
  const graph = createGraph('test');
  const source = addNode(graph, 'source', 'Source', 'source');
  const finding = addNode(graph, 'finding', 'Finding', 'finding');
  const draft = addNode(graph, 'draft', 'Draft', 'draft');

  addEdge(graph, source.id, finding.id, 'produces');
  addEdge(graph, finding.id, draft.id, 'informs');

  const trace = traceEvidence(graph, finding.id);
  assert(trace);
  assert.equal(trace.sources.length, 1);
  assert.equal(trace.sources[0].id, source.id);
  assert.equal(trace.targets.length, 1);
  assert.equal(trace.targets[0].id, draft.id);
});

test('traceEvidence - returns undefined for unknown node', () => {
  const graph = createGraph('test');
  const trace = traceEvidence(graph, 'unknown-node-id');
  assert.equal(trace, undefined);
});

test('traceToSource - traces back to root nodes', () => {
  const graph = createGraph('test');
  const root1 = addNode(graph, 'source', 'Root 1', 'root 1');
  const root2 = addNode(graph, 'source', 'Root 2', 'root 2');
  const intermediate = addNode(graph, 'allegation', 'Intermediate', 'intermediate');
  const leaf = addNode(graph, 'finding', 'Leaf', 'leaf');

  addEdge(graph, root1.id, intermediate.id, 'triggers');
  addEdge(graph, root2.id, intermediate.id, 'triggers');
  addEdge(graph, intermediate.id, leaf.id, 'produces');

  const sources = traceToSource(graph, leaf.id);
  assert.equal(sources.length, 2);
  const sourceIds = new Set(sources.map((n) => n.id));
  assert(sourceIds.has(root1.id));
  assert(sourceIds.has(root2.id));
});

test('traceToLeaves - traces forward to leaf nodes', () => {
  const graph = createGraph('test');
  const source = addNode(graph, 'source', 'Source', 'source');
  const intermediate = addNode(graph, 'allegation', 'Intermediate', 'intermediate');
  const leaf1 = addNode(graph, 'finding', 'Leaf 1', 'leaf 1');
  const leaf2 = addNode(graph, 'finding', 'Leaf 2', 'leaf 2');

  addEdge(graph, source.id, intermediate.id, 'produces');
  addEdge(graph, intermediate.id, leaf1.id, 'leads_to');
  addEdge(graph, intermediate.id, leaf2.id, 'leads_to');

  const leaves = traceToLeaves(graph, source.id);
  assert.equal(leaves.length, 2);
  const leafIds = new Set(leaves.map((n) => n.id));
  assert(leafIds.has(leaf1.id));
  assert(leafIds.has(leaf2.id));
});

test('findPaths - finds all paths between nodes', () => {
  const graph = createGraph('test');
  const start = addNode(graph, 'source', 'Start', 'start');
  const mid1 = addNode(graph, 'allegation', 'Mid 1', 'mid1');
  const mid2 = addNode(graph, 'allegation', 'Mid 2', 'mid2');
  const end = addNode(graph, 'finding', 'End', 'end');

  addEdge(graph, start.id, mid1.id, 'path1');
  addEdge(graph, start.id, mid2.id, 'path2');
  addEdge(graph, mid1.id, end.id, 'converge');
  addEdge(graph, mid2.id, end.id, 'converge');

  const paths = findPaths(graph, start.id, end.id);
  assert.equal(paths.length, 2);
  assert(paths.every((p) => p.length >= 2));
});

test('getStatistics - counts nodes and edges', () => {
  const graph = createGraph('test');
  addNode(graph, 'source', 'Source 1', 'source 1');
  addNode(graph, 'source', 'Source 2', 'source 2');
  addNode(graph, 'finding', 'Finding 1', 'finding 1', {
    factCategory: 'ANALYZED_FINDING',
    confidence: 0.9,
  });

  const source1 = graph.nodes[0];
  const finding1 = graph.nodes[2];
  addEdge(graph, source1.id, finding1.id, 'produces');

  const stats = getStatistics(graph);
  assert.equal(stats.totalNodes, 3);
  assert.equal(stats.totalEdges, 1);
  assert.equal(stats.nodesByType.source, 2);
  assert.equal(stats.nodesByType.finding, 1);
  assert.equal(stats.nodesByCategory.ANALYZED_FINDING, 1);
  assert(stats.averageConfidence > 0);
});

test('getStatistics - identifies unresolved nodes', () => {
  const graph = createGraph('test');
  addNode(graph, 'finding', 'Low Confidence', 'finding', {
    factCategory: 'USER_ASSERTION',
    confidence: 0.5,
  });
  addNode(graph, 'finding', 'High Confidence', 'finding', {
    factCategory: 'VERIFIED_FACT',
    confidence: 0.95,
  });

  const stats = getStatistics(graph);
  assert.equal(stats.unresolvedNodes.length, 1);
  assert.equal(stats.unresolvedNodes[0].label, 'Low Confidence');
});

test('validateGraph - detects missing node references', () => {
  const graph = createGraph('test');
  const node = addNode(graph, 'source', 'Source', 'source');

  // Manually add bad edge
  graph.edges.push({
    id: 'bad-edge',
    from: node.id,
    to: 'nonexistent-node',
    relationship: 'bad',
  });

  const validation = validateGraph(graph);
  assert.equal(validation.valid, false);
  assert(validation.errors.some((e) => e.includes('nonexistent-node')));
});

test('validateGraph - passes for valid graph', () => {
  const graph = createGraph('test');
  const source = addNode(graph, 'source', 'Source', 'source');
  const finding = addNode(graph, 'finding', 'Finding', 'finding');
  addEdge(graph, source.id, finding.id, 'produces');

  const validation = validateGraph(graph);
  assert.equal(validation.valid, true);
  assert.equal(validation.errors.length, 0);
});

test('generateSummary - creates human-readable summary', () => {
  const graph = createGraph('test');
  addNode(graph, 'source', 'Source', 'source');
  addNode(graph, 'finding', 'Finding', 'finding', {
    confidence: 0.9,
  });

  const source = graph.nodes[0];
  const finding = graph.nodes[1];
  addEdge(graph, source.id, finding.id, 'produces');

  const summary = generateSummary(graph);
  assert(summary.includes('2 nodes'));
  assert(summary.includes('1 edges'));
  assert(summary.includes('confidence'));
});

test('code-enforcement workflow lineage - complaint to draft', () => {
  const graph = createGraph('code-enforcement');

  // Complaint
  const complaint = addNode(graph, 'complaint', 'Property Complaint', 'Complaint about unmaintained property', {
    factCategory: 'USER_ASSERTION',
    confidence: 0.8,
  });

  // Notice
  const notice = addNode(graph, 'notice', 'Code Enforcement Notice', 'Official notice received', {
    factCategory: 'VERIFIED_FACT',
    source: 'uploaded-document',
    confidence: 0.99,
  });
  addEdge(graph, complaint.id, notice.id, 'triggers', {
    description: 'Complaint triggered the enforcement action',
  });

  // Allegation
  const allegation = addNode(graph, 'allegation', 'Building Maintenance Violation', 'Alleged violation of code section 1234', {
    factCategory: 'EXTRACTED_DATA',
    confidence: 0.95,
  });
  addEdge(graph, notice.id, allegation.id, 'alleges');

  // Finding
  const finding = addNode(graph, 'finding', 'Violation Confirmed', 'Evidence supports violation', {
    factCategory: 'ANALYZED_FINDING',
    confidence: 0.92,
  });
  addEdge(graph, allegation.id, finding.id, 'produces_finding');

  // Strategy
  const strategy = addNode(graph, 'strategy', 'Request Inspection', 'Request clarification of scope', {
    factCategory: 'RECOMMENDATION',
    confidence: 0.85,
  });
  addEdge(graph, finding.id, strategy.id, 'suggests');

  // Draft
  const draft = addNode(graph, 'draft', 'Response Letter', 'Request for clarification', {
    factCategory: 'RECOMMENDATION',
  });
  addEdge(graph, strategy.id, draft.id, 'produces');

  // Trace from draft back to complaint
  const sources = traceToSource(graph, draft.id);
  assert(sources.some((n) => n.id === complaint.id), 'Draft should trace back to original complaint');

  // Trace from complaint to draft
  const leaves = traceToLeaves(graph, complaint.id);
  assert(leaves.some((n) => n.id === draft.id), 'Complaint should trace forward to response draft');

  // Validate graph integrity
  const validation = validateGraph(graph);
  assert(validation.valid, `Graph should be valid: ${validation.errors.join(', ')}`);

  const stats = getStatistics(graph);
  assert.equal(stats.totalNodes, 6);
  assert.equal(stats.totalEdges, 5);
});
