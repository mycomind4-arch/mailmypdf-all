import { useState } from "react";
import {
  AlertTriangle, CheckCircle2, FileSearch, Calendar, GitCompare, Clock,
  Diff, FileX, ThumbsUp, ChevronDown, ChevronRight, Link2, Plus, X,
  ShieldAlert, Zap, Target, FileText, TrendingUp, ArrowRight, Eye
} from "lucide-react";
import type { XRayResult, XRayFinding, EvidenceGap, Confidence, FindingType } from "@/domain/xray";
import { FINDING_TYPE_LABELS, updateFindingStatus, updateGapStatus } from "@/domain/xray";

/* ── Icon helper ── */
function FindingIcon({ type, size = 18 }: { type: FindingType; size?: number }) {
  switch (type) {
    case "date_conflict": return <Calendar size={size} />;
    case "unaddressed_evidence": return <FileSearch size={size} />;
    case "unsupported_conclusion": return <AlertTriangle size={size} />;
    case "contradiction": return <GitCompare size={size} />;
    case "procedural_issue": return <Clock size={size} />;
    case "factual_discrepancy": return <Diff size={size} />;
    case "missing_reference": return <FileX size={size} />;
    case "strength": return <ThumbsUp size={size} />;
    default: return <AlertTriangle size={size} />;
  }
}

/* ── Confidence badge ── */
function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const config = {
    high: { label: "High", className: "badge badge-green" },
    medium: { label: "Medium", className: "badge badge-amber" },
    low: { label: "Low", className: "badge badge-indigo" },
  };
  const c = config[confidence];
  return <span className={c.className}>{c.label}</span>;
}

/* ── Finding Card ── */
function FindingCard({
  finding,
  index,
  onAction,
}: {
  finding: XRayFinding;
  index: number;
  onAction: (findingId: string, status: "used_in_appeal" | "dismissed" | "confirmed") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isUsed = finding.status === "used_in_appeal";
  const isDismissed = finding.status === "dismissed";

  return (
    <div className={`card overflow-hidden ${isUsed ? "ring-2 ring-amber-400" : ""} ${isDismissed ? "opacity-50" : ""}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-5 text-left"
      >
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          finding.type === "strength" ? "bg-amber-50 text-amber-600" :
          finding.type === "procedural_issue" ? "bg-red-50 text-red-500" :
          "bg-indigo-50 text-indigo-700"
        }`}>
          <FindingIcon type={finding.type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400">#{index + 1}</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-medium text-indigo-600">{FINDING_TYPE_LABELS[finding.type]}</span>
            <ConfidenceBadge confidence={finding.confidence} />
            {isUsed && <span className="badge badge-amber">In Appeal</span>}
          </div>
          <h3 className="mt-1.5 text-base font-semibold text-slate-700">{finding.title}</h3>
          <p className="mt-1 text-sm text-slate-400 line-clamp-2">{finding.description}</p>
        </div>
        <div className="mt-1 shrink-0">
          {expanded ? <ChevronDown size={20} className="text-slate-300" /> : <ChevronRight size={20} className="text-slate-300" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-warm-border px-5 pb-5 pt-4">
          {/* Why it matters */}
          <div className="rounded-lg bg-indigo-50/50 p-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700">
              <Target size={15} /> Why this matters
            </div>
            <p className="mt-1.5 text-sm text-slate-500">{finding.whyItMatters}</p>
          </div>

          {/* Source claims */}
          {finding.claims.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-semibold text-slate-600 mb-2">Source-linked claims</div>
              <div className="space-y-2">
                {finding.claims.map((claim, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <FileText size={12} /> {claim.source.documentName}
                      {claim.source.page && <span>· p. {claim.source.page}</span>}
                    </div>
                    <p className="mt-1.5 text-sm text-slate-600 italic">"{claim.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {finding.sources.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-semibold text-slate-600 mb-2">References</div>
              <div className="flex flex-wrap gap-2">
                {finding.sources.map((src, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500">
                    <Link2 size={12} className="text-indigo-400" />
                    {src.documentName}
                    {src.page && <span className="text-slate-300">· p.{src.page}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested ground */}
          {finding.suggestedClaim && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
              <div className="text-xs font-semibold text-amber-700">SUGGESTED APPEAL GROUND</div>
              <p className="mt-1 text-sm text-slate-600">{finding.suggestedClaim}</p>
              {finding.suggestedGroundType && (
                <div className="mt-1.5 text-xs text-slate-400 capitalize">
                  Ground type: {finding.suggestedGroundType.replace(/_/g, " ")}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {!isDismissed && (
            <div className="mt-4 flex gap-2">
              {!isUsed ? (
                <button
                  onClick={() => onAction(finding.id, "used_in_appeal")}
                  className="btn-amber text-sm"
                >
                  <Zap size={14} className="inline mr-1" /> Use in Appeal
                </button>
              ) : (
                <button
                  onClick={() => onAction(finding.id, "needs_review")}
                  className="btn-outline text-sm"
                >
                  Remove from Appeal
                </button>
              )}
              <button
                onClick={() => onAction(finding.id, "confirmed")}
                className="btn-outline text-sm"
              >
                <CheckCircle2 size={14} className="inline mr-1" /> Confirm
              </button>
              <button
                onClick={() => onAction(finding.id, "dismissed")}
                className="text-sm text-slate-400 hover:text-red-500 px-3 py-2"
              >
                <X size={14} className="inline mr-1" /> Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Evidence Gap Card ── */
function GapCard({
  gap,
  index,
  onAction,
}: {
  gap: EvidenceGap;
  index: number;
  onAction: (gapId: string, status: "addressed" | "dismissed") => void;
}) {
  const severityConfig = {
    critical: { label: "Critical", className: "badge badge-red", dot: "bg-red-500" },
    important: { label: "Important", className: "badge badge-amber", dot: "bg-amber-500" },
    helpful: { label: "Helpful", className: "badge badge-indigo", dot: "bg-indigo-500" },
  };
  const s = severityConfig[gap.severity];
  const isAddressed = gap.status === "addressed";
  const isDismissed = gap.status === "dismissed";

  return (
    <div className={`card p-5 ${isDismissed ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50">
          <ShieldAlert size={18} className={gap.severity === "critical" ? "text-red-500" : "text-amber-500"} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400">Gap {index + 1}</span>
            <span className={s.className}>{s.label}</span>
            {isAddressed && <span className="badge badge-green">Addressed</span>}
          </div>
          <h3 className="mt-1.5 text-base font-semibold text-slate-700">{gap.title}</h3>
          <p className="mt-1 text-sm text-slate-400">{gap.description}</p>

          {gap.suggestedEvidence.length > 0 && !isAddressed && !isDismissed && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-500 mb-2">Potentially useful evidence:</div>
              <div className="flex flex-wrap gap-1.5">
                {gap.suggestedEvidence.map((ev, i) => (
                  <span key={i} className="rounded-md bg-indigo-50 px-2 py-1 text-xs text-indigo-600">
                    {ev}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!isAddressed && !isDismissed && (
            <div className="mt-4 flex gap-2">
              <button onClick={() => onAction(gap.id, "addressed")} className="btn-outline text-sm">
                <Plus size={14} className="inline mr-1" /> I have this
              </button>
              <button onClick={() => onAction(gap.id, "dismissed")} className="text-sm text-slate-400 hover:text-red-500 px-3 py-2">
                Skip
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Appeal Map (simplified visual) ── */
function AppealMapView({ result }: { result: XRayResult }) {
  const { nodes, rootId } = result.map;
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([rootId]));

  function toggle(id: string) {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNode(nodeId: string, depth: number): React.ReactNode {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(nodeId);

    const typeStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      decision: { bg: "bg-indigo-50", text: "text-indigo-700", icon: <FileText size={14} /> },
      reason: { bg: "bg-slate-50", text: "text-slate-600", icon: <AlertTriangle size={12} /> },
      weakness: { bg: "bg-amber-50/50", text: "text-amber-700", icon: <ShieldAlert size={12} /> },
      fact: { bg: "bg-blue-50/50", text: "text-blue-600", icon: <CheckCircle2 size={12} /> },
      evidence: { bg: "bg-emerald-50/50", text: "text-emerald-600", icon: <Link2 size={12} /> },
      ground: { bg: "bg-amber-50", text: "text-amber-700", icon: <Zap size={12} /> },
      outcome: { bg: "bg-indigo-100", text: "text-indigo-700", icon: <CheckCircle2 size={14} /> },
    };
    const style = typeStyles[node.type] || typeStyles.decision;

    return (
      <div key={nodeId} style={{ marginLeft: depth * 20 }} className="mt-1">
        <button
          onClick={() => hasChildren && toggle(nodeId)}
          className={`flex items-center gap-2 rounded-md ${style.bg} ${style.text} px-3 py-1.5 text-sm font-medium w-full text-left ${hasChildren ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
        >
          {hasChildren && (isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
          {!hasChildren && <span className="w-3" />}
          {style.icon}
          <span className="truncate">{node.label}</span>
        </button>
        {isExpanded && hasChildren && (
          <div className="ml-2 border-l border-slate-200 pl-1">
            {node.children.map((childId) => renderNode(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare size={18} className="text-indigo-700" />
        <h2 className="font-semibold text-indigo-700">Appeal Map</h2>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        How your appeal is being constructed. Click to expand each branch.
      </p>
      {renderNode(rootId, 0)}
    </div>
  );
}

/* ── Main X-Ray View ── */
export interface XRayViewProps {
  result: XRayResult;
  onResultChange: (result: XRayResult) => void;
  onBuildAppeal: () => void;
  analyzing?: boolean;
}

export function XRayView({ result, onResultChange, onBuildAppeal, analyzing }: XRayViewProps) {
  const [activeTab, setActiveTab] = useState<"findings" | "gaps" | "map" | "documents">("findings");

  function handleFindingAction(findingId: string, status: "used_in_appeal" | "dismissed" | "confirmed" | "needs_review") {
    onResultChange(updateFindingStatus(result, findingId, status));
  }

  function handleGapAction(gapId: string, status: "addressed" | "dismissed") {
    onResultChange(updateGapStatus(result, gapId, status));
  }

  const usedCount = result.findings.filter((f) => f.status === "used_in_appeal").length;

  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-indigo-100" />
          <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
        </div>
        <h2 className="mt-6 text-xl font-bold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>
          Analyzing your documents…
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Cross-referencing dates, claims, and evidence across all documents.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── X-Ray Summary Banner ── */}
      <div className="rounded-xl bg-gradient-to-br from-indigo-700 to-indigo-900 p-6 md:p-8 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={22} className="text-amber-400" />
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-serif)" }}>Your Appeal X-Ray</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div>
            <div className="text-3xl font-bold text-amber-400">{result.totalPages}</div>
            <div className="text-sm text-white/60">pages analyzed</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-400">{result.totalDocuments}</div>
            <div className="text-sm text-white/60">documents connected</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-400">{result.totalFindings}</div>
            <div className="text-sm text-white/60">findings</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-400">{result.totalGaps}</div>
            <div className="text-sm text-white/60">evidence gaps</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-400">{result.strongFindings}</div>
            <div className="text-sm text-white/60">strong findings</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-400">{result.contradictions}</div>
            <div className="text-sm text-white/60">contradictions</div>
          </div>
        </div>
        {result.findings.length > 0 && (
          <div className="mt-5 pt-5 border-t border-white/10 space-y-2">
            <p className="text-sm text-white/80">
              <span className="font-bold text-amber-400">{result.strongFindings}</span> {result.strongFindings === 1 ? "finding appears" : "findings appear"} strongly supported by your documents.
            </p>
            {result.needsEvidence > 0 && (
              <p className="text-sm text-white/80">
                <span className="font-bold text-amber-400">{result.needsEvidence}</span> {result.needsEvidence === 1 ? "finding needs" : "findings need"} additional evidence.
              </p>
            )}
            {result.contradictions > 0 && (
              <p className="text-sm text-white/80">
                <span className="font-bold text-amber-400">{result.contradictions}</span> {result.contradictions === 1 ? "potential contradiction" : "potential contradictions"} found between documents.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab("findings")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "findings" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400"}`}
        >
          Findings ({result.findings.length})
        </button>
        <button
          onClick={() => setActiveTab("gaps")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "gaps" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400"}`}
        >
          Evidence Gaps ({result.gaps.length})
        </button>
        <button
          onClick={() => setActiveTab("map")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "map" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400"}`}
        >
          Appeal Map
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "documents" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400"}`}
        >
          Documents ({result.documents.length})
        </button>
      </div>

      {/* ── Findings Tab ── */}
      {activeTab === "findings" && (
        <div>
          {result.findings.length === 0 ? (
            <div className="card p-12 text-center">
              <FileSearch size={32} className="mx-auto text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-indigo-700">No issues found</h3>
              <p className="mt-2 text-sm text-slate-400">
                We didn't detect any potential issues across your documents. This could mean the decision is well-supported, or that we need more documents to analyze.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.findings.map((finding, i) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  index={i}
                  onAction={handleFindingAction}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Evidence Gaps Tab ── */}
      {activeTab === "gaps" && (
        <div>
          {result.gaps.length === 0 ? (
            <div className="card p-12 text-center">
              <TrendingUp size={32} className="mx-auto text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-indigo-700">No evidence gaps identified</h3>
              <p className="mt-2 text-sm text-slate-400">
                Your documents appear to address the key issues. If you have additional evidence, upload it to strengthen your appeal further.
              </p>
            </div>
          ) : (
            <>
              <div className="alert alert-info mb-4">
                <ShieldAlert size={18} className="inline mr-2" />
                <span>Your appeal has <strong>{result.gaps.length}</strong> {result.gaps.length === 1 ? "potentially important gap" : "potentially important gaps"}.</span>
              </div>
              <div className="space-y-3">
                {result.gaps.map((gap, i) => (
                  <GapCard
                    key={gap.id}
                    gap={gap}
                    index={i}
                    onAction={handleGapAction}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Appeal Map Tab ── */}
      {activeTab === "map" && <AppealMapView result={result} />}

      {/* ── Documents Tab ── */}
      {activeTab === "documents" && (
        <div className="space-y-3">
          {result.documents.map((doc) => (
            <div key={doc.id} className="card p-5">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${doc.role === "decision" ? "bg-indigo-50 text-indigo-700" : "bg-slate-50 text-slate-500"}`}>
                  <FileText size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-700">{doc.name}</h3>
                    <span className={`badge ${doc.role === "decision" ? "badge-indigo" : "badge-amber"}`}>
                      {doc.role}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-slate-400">
                    <span>{doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"}</span>
                    <span>{doc.wordCount} words</span>
                    {doc.datesFound.length > 0 && <span>{doc.datesFound.length} dates</span>}
                  </div>
                  {doc.datesFound.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {doc.datesFound.slice(0, 8).map((d) => (
                        <span key={d} className="rounded-md bg-slate-50 px-2 py-0.5 text-xs text-slate-500">{d}</span>
                      ))}
                    </div>
                  )}
                  {doc.entities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {doc.entities.slice(0, 6).map((e) => (
                        <span key={e} className="rounded-md bg-indigo-50/50 px-2 py-0.5 text-xs text-indigo-600">{e}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Build Appeal CTA ── */}
      {usedCount > 0 && (
        <div className="sticky bottom-4 z-10">
          <div className="rounded-xl bg-white shadow-lg border border-amber-200 p-4 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-indigo-700">
                {usedCount} {usedCount === 1 ? "finding" : "findings"} selected for appeal
              </span>
              <p className="text-xs text-slate-400 mt-0.5">We'll build your appeal grounds from these findings.</p>
            </div>
            <button onClick={onBuildAppeal} className="btn-amber">
              Build My Appeal <ArrowRight size={16} className="inline ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
