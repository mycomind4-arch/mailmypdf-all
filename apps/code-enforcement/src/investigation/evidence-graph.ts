// ─── EVIDENCE GRAPH BUILDER ──────────────────────────────────────────────
// Adapted from ruthlessinvestigator's evidence-graph.ts. Pure function.

import type { InvestigationState, EvidenceGraph, GraphNode, GraphEdge } from "./types";

export function buildEvidenceGraph(state: InvestigationState): EvidenceGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  nodes.push({ id: state.id, type: "investigation", label: state.question, data: { phase: state.phase } });

  for (const hyp of state.hypotheses.values()) {
    nodes.push({ id: hyp.id, type: "hypothesis", label: hyp.statement, data: { supportLevel: hyp.supportLevel } });
    edges.push({ from: state.id, to: hyp.id, type: "belongs_to" });
    for (const claimId of hyp.claims) edges.push({ from: hyp.id, to: claimId, type: "belongs_to" });
  }

  for (const claim of state.claims.values()) {
    nodes.push({ id: claim.id, type: "claim", label: claim.text, data: { type: claim.type, status: claim.status } });
    for (const depId of claim.dependsOn ?? []) edges.push({ from: claim.id, to: depId, type: "depends_on" });
  }

  for (const ev of state.evidence.values()) {
    nodes.push({ id: ev.id, type: "evidence", label: ev.text, data: { type: ev.type, independent: ev.independentConfirmation } });
    edges.push({ from: ev.id, to: ev.sourceId, type: "depends_on", label: "sourced from" });
    if (ev.supportsClaimId) edges.push({ from: ev.id, to: ev.supportsClaimId, type: "supports" });
    if (ev.contradictsClaimId) edges.push({ from: ev.id, to: ev.contradictsClaimId, type: "contradicts" });
  }

  for (const src of state.sources.values()) {
    nodes.push({ id: src.id, type: "source", label: src.title, data: { sourceType: src.sourceType, isPrimary: src.isPrimary, quality: src.quality } });
    for (const citedId of src.cites) edges.push({ from: src.id, to: citedId, type: "cites" });
  }

  for (const con of state.contradictions.values()) {
    nodes.push({ id: con.id, type: "contradiction", label: con.description, data: { status: con.status, resolution: con.resolution } });
    edges.push({ from: con.claimA, to: con.id, type: "related_to" });
    edges.push({ from: con.claimB, to: con.id, type: "related_to" });
  }

  return { nodes, edges };
}

export function countIndependentRoots(
  evidenceIds: string[],
  state: InvestigationState
): { rootCount: number; totalSources: number; rootIds: string[] } {
  const allRoots = new Set<string>();
  const allSources = new Set<string>();
  for (const evId of evidenceIds) {
    const ev = state.evidence.get(evId);
    if (!ev) continue;
    allSources.add(ev.sourceId);
    const visited = new Set<string>();
    function walk(id: string) {
      if (visited.has(id)) return;
      visited.add(id);
      const src = state.sources.get(id);
      if (!src) return;
      if (src.cites.length === 0) allRoots.add(id);
      else for (const citedId of src.cites) walk(citedId);
    }
    walk(ev.sourceId);
  }
  return { rootCount: allRoots.size, totalSources: allSources.size, rootIds: [...allRoots] };
}
