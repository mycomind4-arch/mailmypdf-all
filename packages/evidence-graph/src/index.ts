export type {
  EvidenceNodeType,
  FactCategory,
  EvidenceNode,
  EvidenceEdge,
  EvidenceGraph,
  TraceResult,
  GraphStatistics,
} from './types.js';

export {
  createGraph,
  addNode,
  addEdge,
  traceEvidence,
  traceToSource,
  traceToLeaves,
  findPaths,
  getStatistics,
  validateGraph,
  exportGraph,
  generateSummary,
} from './graph.js';
