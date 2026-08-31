import { useState } from "react";
import {
  ShieldAlert, ShieldCheck, Zap, Target, TrendingDown, TrendingUp,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, X,
  FileText, Crosshair, Lightbulb, Edit3, ArrowRight, Swords, Gauge
} from "lucide-react";
import type {
  StressTestResult, GroundAttack, GroundStrengthProfile,
  DraftVulnerability, ComponentStatus, DraftVulnType
} from "@/domain/stress-test";
import {
  updateAttackStatus, updateDraftVulnerability, applyDraftRevision,
} from "@/domain/stress-test";

/* ── Status colors ── */
const statusColors: Record<ComponentStatus, { dot: string; text: string; label: string }> = {
  strong: { dot: "bg-emerald-500", text: "text-emerald-600", label: "Strong" },
  clear: { dot: "bg-emerald-500", text: "text-emerald-600", label: "Clear" },
  moderate: { dot: "bg-amber-500", text: "text-amber-600", label: "Moderate" },
  needs_verification: { dot: "bg-amber-400", text: "text-amber-500", label: "Needs verification" },
  gap: { dot: "bg-red-500", text: "text-red-500", label: "Gap" },
};

const vulnTypeConfig: Record<DraftVulnType, { label: string; icon: typeof AlertTriangle; color: string }> = {
  exaggeration: { label: "Exaggerated Claim", icon: TrendingUp, color: "text-amber-600" },
  unsupported_claim: { label: "Unsupported Claim", icon: AlertTriangle, color: "text-red-500" },
  factual_error: { label: "Factual Error", icon: AlertTriangle, color: "text-red-500" },
  missing_qualifier: { label: "Missing Qualifier", icon: Lightbulb, color: "text-amber-500" },
  contradiction: { label: "Contradiction", icon: Crosshair, color: "text-red-500" },
};

/* ── Ground Attack Card ── */
function AttackCard({
  attack,
  onAction,
}: {
  attack: GroundAttack;
  onAction: (attackId: string, status: "mitigated" | "unmitigated") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const severityColor =
    attack.severity === "critical" ? "border-red-200 bg-red-50/30" :
    attack.severity === "serious" ? "border-amber-200 bg-amber-50/30" :
    "border-slate-200 bg-slate-50/30";
  const isMitigated = attack.status === "mitigated";

  return (
    <div className={`card overflow-hidden border ${severityColor} ${isMitigated ? "opacity-60" : ""}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-start gap-3 p-5 text-left">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          attack.severity === "critical" ? "bg-red-100 text-red-500" :
          attack.severity === "serious" ? "bg-amber-100 text-amber-600" :
          "bg-slate-100 text-slate-500"
        }`}>
          <Swords size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge ${
              attack.severity === "critical" ? "badge-red" :
              attack.severity === "serious" ? "badge-amber" : "badge-indigo"
            }`}>{attack.severity}</span>
            {isMitigated && <span className="badge badge-green">Mitigated</span>}
          </div>
          <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">{attack.challenge}</p>
        </div>
        {expanded ? <ChevronDown size={18} className="text-slate-300 mt-1" /> : <ChevronRight size={18} className="text-slate-300 mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          {/* Challenge */}
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
              <Swords size={14} /> How the decision-maker could respond
            </div>
            <p className="mt-1.5 text-sm text-slate-500">{attack.challenge}</p>
          </div>

          {/* What would defeat it */}
          <div className="mt-3 rounded-lg bg-indigo-50/40 p-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700">
              <ShieldCheck size={14} /> What would defeat that response
            </div>
            <p className="mt-1.5 text-sm text-slate-500">{attack.whatWouldDefeat}</p>
          </div>

          {/* Evidence needed */}
          <div className="mt-3">
            <div className="text-sm font-semibold text-slate-600 mb-2">Evidence needed</div>
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-md bg-emerald-50/40 px-3 py-2">
                <span className="text-xs font-bold text-emerald-600 mt-0.5">Strong</span>
                <span className="text-sm text-slate-500">{attack.evidenceNeeded.strong}</span>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-amber-50/40 px-3 py-2">
                <span className="text-xs font-bold text-amber-600 mt-0.5">Moderate</span>
                <span className="text-sm text-slate-500">{attack.evidenceNeeded.moderate}</span>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2">
                <span className="text-xs font-bold text-slate-400 mt-0.5">Weak</span>
                <span className="text-sm text-slate-400">{attack.evidenceNeeded.weak}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isMitigated && (
            <div className="mt-4 flex gap-2">
              <button onClick={() => onAction(attack.id, "mitigated")} className="btn-outline text-sm">
                <ShieldCheck size={14} className="inline mr-1" /> I've addressed this
              </button>
              <button onClick={() => onAction(attack.id, "unmitigated")} className="text-sm text-slate-400 hover:text-red-500 px-3 py-2">
                <X size={14} className="inline mr-1" /> Can't address
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Strength Profile Card ── */
function StrengthProfileCard({ profile }: { profile: GroundStrengthProfile }) {
  const [expanded, setExpanded] = useState(false);
  const assessmentConfig = {
    well_supported: { label: "Well Supported", color: "text-emerald-600", bg: "bg-emerald-50" },
    needs_clarification: { label: "Needs Clarification", color: "text-amber-600", bg: "bg-amber-50" },
    potentially_vulnerable: { label: "Potentially Vulnerable", color: "text-red-500", bg: "bg-red-50" },
  };
  const ac = assessmentConfig[profile.assessment];
  const scoreColor = profile.score >= 80 ? "text-emerald-600" : profile.score >= 60 ? "text-amber-600" : "text-red-500";

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-4 p-5 text-left">
        {/* Score gauge */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-slate-100">
          <span className={`text-lg font-bold ${scoreColor}`}>{profile.score}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`badge ${ac.bg.includes("emerald") ? "badge-green" : ac.bg.includes("amber") ? "badge-amber" : "badge-red"}`}>
              {ac.label}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-600 line-clamp-1">{profile.groundClaim}</p>
        </div>
        {expanded ? <ChevronDown size={18} className="text-slate-300" /> : <ChevronRight size={18} className="text-slate-300" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          {/* Component breakdown */}
          <div className="space-y-2.5">
            {profile.components.map((comp) => {
              const sc = statusColors[comp.status];
              return (
                <div key={comp.label} className="flex items-start gap-3">
                  <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${sc.dot}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">{comp.label}</span>
                      <span className={`text-xs font-semibold ${sc.text}`}>{sc.label}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{comp.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* What could change it */}
          <div className="mt-4 rounded-lg bg-indigo-50/40 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
              <Lightbulb size={12} /> What could change this assessment
            </div>
            <p className="mt-1 text-sm text-slate-500">{profile.whatCouldChangeIt}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Weakest Link Banner ── */
function WeakestLinkBanner({
  result,
  onFix,
}: {
  result: StressTestResult;
  onFix: () => void;
}) {
  if (!result.weakestLink) return null;
  const wl = result.weakestLink;

  return (
    <div className={`rounded-xl border p-5 ${
      wl.severity === "critical" ? "border-red-200 bg-red-50/40" :
      wl.severity === "serious" ? "border-amber-200 bg-amber-50/40" :
      "border-slate-200 bg-slate-50/40"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          wl.severity === "critical" ? "bg-red-100 text-red-500" :
          "bg-amber-100 text-amber-600"
        }`}>
          <TrendingDown size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-700">Your appeal's weakest point</h3>
            <span className={`badge ${wl.severity === "critical" ? "badge-red" : "badge-amber"}`}>{wl.severity}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-600">{wl.title}</p>
          <p className="mt-1 text-sm text-slate-400">{wl.description}</p>
        </div>
        <button onClick={onFix} className="btn-amber text-sm shrink-0">
          <Zap size={14} className="inline mr-1" /> Fix This
        </button>
      </div>
    </div>
  );
}

/* ── Draft Vulnerability Card ── */
function DraftVulnCard({
  vuln,
  onAction,
  onApply,
}: {
  vuln: DraftVulnerability;
  onAction: (vulnId: string, status: "applied" | "dismissed") => void;
  onApply: (vuln: DraftVulnerability) => void;
}) {
  const config = vulnTypeConfig[vuln.type];
  const Icon = config.icon;

  return (
    <div className={`card p-5 ${vuln.status === "applied" ? "opacity-60" : ""} ${vuln.status === "dismissed" ? "opacity-40" : ""}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 ${config.color}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400">{config.label}</span>
            {vuln.status === "applied" && <span className="badge badge-green">Applied</span>}
            {vuln.status === "dismissed" && <span className="badge badge-indigo">Dismissed</span>}
          </div>

          {/* The problematic quote */}
          <div className="mt-2 rounded-md bg-slate-50 px-3 py-2">
            <p className="text-sm text-slate-500 italic">"{vuln.quote}"</p>
          </div>

          {/* The issue */}
          <p className="mt-2 text-sm text-slate-600">{vuln.issue}</p>
          <p className="mt-1 text-xs text-slate-400">{vuln.whyItMatters}</p>

          {/* Recommended revision */}
          {vuln.status === "pending" && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <Edit3 size={12} /> Recommended revision
              </div>
              <p className="mt-1 text-sm text-slate-600">{vuln.recommendedRevision}</p>
            </div>
          )}

          {/* Actions */}
          {vuln.status === "pending" && (
            <div className="mt-3 flex gap-2">
              <button onClick={() => onApply(vuln)} className="btn-amber text-sm">
                <CheckCircle2 size={14} className="inline mr-1" /> Apply Revision
              </button>
              <button onClick={() => onAction(vuln.id, "dismissed")} className="text-sm text-slate-400 hover:text-red-500 px-3 py-2">
                <X size={14} className="inline mr-1" /> Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Stress Test View ── */
export interface StressTestViewProps {
  result: StressTestResult;
  onResultChange: (result: StressTestResult) => void;
  draft: string;
  onDraftChange: (draft: string) => void;
  onFix: (target: "evidence" | "grounds" | "draft" | "timeline") => void;
  testing?: boolean;
}

export function StressTestView({
  result, onResultChange, draft, onDraftChange, onFix, testing,
}: StressTestViewProps) {
  const [activeTab, setActiveTab] = useState<"attacks" | "strength" | "draft" | "sensitivity">("attacks");

  function handleAttackAction(attackId: string, status: "mitigated" | "unmitigated") {
    onResultChange(updateAttackStatus(result, attackId, status));
  }

  function handleVulnAction(vulnId: string, status: "applied" | "dismissed") {
    onResultChange(updateDraftVulnerability(result, vulnId, status));
  }

  function handleApplyVuln(vuln: DraftVulnerability) {
    const newDraft = applyDraftRevision(draft, vuln);
    onDraftChange(newDraft);
    onResultChange(updateDraftVulnerability(result, vuln.id, "applied"));
  }

  if (testing) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-red-100" />
          <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-red-500 animate-spin" />
        </div>
        <h2 className="mt-6 text-xl font-bold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>
          Stress testing your appeal…
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Attacking every ground, scoring every argument, checking the draft for vulnerabilities.
        </p>
      </div>
    );
  }

  const pendingVulns = result.draftVulnerabilities.filter((v) => v.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* ── Summary Banner ── */}
      <div className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 md:p-8 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Swords size={22} className="text-amber-400" />
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-serif)" }}>Appeal Stress Test</h2>
        </div>

        {/* Overall score gauge */}
        <div className="flex items-center gap-6 mb-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/20">
            <span className="text-3xl font-bold text-amber-400">{result.summary.overallScore}</span>
          </div>
          <div>
            <div className="text-sm text-white/60">Overall appeal strength</div>
            <div className="text-lg font-semibold text-white">
              {result.summary.overallScore >= 80 ? "Strong" : result.summary.overallScore >= 60 ? "Moderate" : "Needs work"}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold text-amber-400">{result.summary.totalArguments}</div>
            <div className="text-sm text-white/60">arguments reviewed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{result.summary.wellSupported}</div>
            <div className="text-sm text-white/60">well supported</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{result.summary.needClarification}</div>
            <div className="text-sm text-white/60">need clarification</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400">{result.summary.vulnerable}</div>
            <div className="text-sm text-white/60">potentially vulnerable</div>
          </div>
        </div>

        {pendingVulns > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-sm text-white/80">
              <ShieldAlert size={14} className="inline mr-1 text-amber-400" />
              <span className="font-bold text-amber-400">{pendingVulns}</span> draft {pendingVulns === 1 ? "vulnerability" : "vulnerabilities"} need{pendingVulns === 1 ? "s" : ""} your attention.
            </p>
          </div>
        )}
      </div>

      {/* ── Weakest Link ── */}
      <WeakestLinkBanner result={result} onFix={() => result.weakestLink && onFix(result.weakestLink.fixTarget)} />

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab("attacks")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "attacks" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400"}`}
        >
          <Swords size={14} className="inline mr-1" /> Attacks ({result.groundAttacks.length})
        </button>
        <button
          onClick={() => setActiveTab("strength")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "strength" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400"}`}
        >
          <Gauge size={14} className="inline mr-1" /> Strength ({result.strengthProfiles.length})
        </button>
        {result.draftVulnerabilities.length > 0 && (
          <button
            onClick={() => setActiveTab("draft")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "draft" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400"}`}
          >
            <ShieldAlert size={14} className="inline mr-1" /> Draft Issues ({pendingVulns})
          </button>
        )}
        <button
          onClick={() => setActiveTab("sensitivity")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "sensitivity" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400"}`}
        >
          <Lightbulb size={14} className="inline mr-1" /> Sensitivity
        </button>
      </div>

      {/* ── Attacks Tab ── */}
      {activeTab === "attacks" && (
        <div>
          {result.groundAttacks.length === 0 ? (
            <div className="card p-12 text-center">
              <Swords size={32} className="mx-auto text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-indigo-700">No grounds to attack</h3>
              <p className="mt-2 text-sm text-slate-400">Add appeal grounds first, then run the stress test.</p>
            </div>
          ) : (
            <>
              <div className="alert alert-info mb-4 text-sm">
                <Swords size={16} className="inline mr-2" />
                <span>For each ground, here's how the decision-maker could try to defeat it — and what evidence you'd need to counter.</span>
              </div>
              <div className="space-y-3">
                {result.groundAttacks.map((attack) => (
                  <AttackCard key={attack.id} attack={attack} onAction={handleAttackAction} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Strength Tab ── */}
      {activeTab === "strength" && (
        <div>
          {result.strengthProfiles.length === 0 ? (
            <div className="card p-12 text-center">
              <Gauge size={32} className="mx-auto text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-indigo-700">No strength profiles</h3>
              <p className="mt-2 text-sm text-slate-400">Add appeal grounds to see strength scores.</p>
            </div>
          ) : (
            <>
              <div className="alert alert-info mb-4 text-sm">
                <Gauge size={16} className="inline mr-2" />
                <span>This measures how well-supported each argument currently is — not whether the appeal will win.</span>
              </div>
              <div className="space-y-3">
                {result.strengthProfiles.map((profile) => (
                  <StrengthProfileCard key={profile.groundId} profile={profile} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Draft Issues Tab ── */}
      {activeTab === "draft" && (
        <div>
          {result.draftVulnerabilities.length === 0 ? (
            <div className="card p-12 text-center">
              <ShieldCheck size={32} className="mx-auto text-emerald-400" />
              <h3 className="mt-4 text-lg font-semibold text-indigo-700">No draft vulnerabilities found</h3>
              <p className="mt-2 text-sm text-slate-400">Your draft doesn't contain exaggerated claims, unsupported assertions, or factual errors that we could detect.</p>
            </div>
          ) : (
            <>
              <div className="alert alert-warning mb-4 text-sm">
                <ShieldAlert size={16} className="inline mr-2" />
                <span>We found <strong>{pendingVulns}</strong> {pendingVulns === 1 ? "issue" : "issues"} in your draft. These could make your appeal less credible. Review and apply the suggested revisions.</span>
              </div>
              <div className="space-y-3">
                {result.draftVulnerabilities.map((vuln) => (
                  <DraftVulnCard
                    key={vuln.id}
                    vuln={vuln}
                    onAction={handleVulnAction}
                    onApply={handleApplyVuln}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Sensitivity Tab ── */}
      {activeTab === "sensitivity" && (
        <div>
          {result.assessmentSensitivities.length === 0 ? (
            <div className="card p-12 text-center">
              <Lightbulb size={32} className="mx-auto text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-indigo-700">No sensitivity analysis</h3>
              <p className="mt-2 text-sm text-slate-400">Run the X-Ray first to enable sensitivity analysis.</p>
            </div>
          ) : (
            <>
              <div className="alert alert-info mb-4 text-sm">
                <Lightbulb size={16} className="inline mr-2" />
                <span>For each finding: what is the current assessment, and what evidence could change it? This is what makes the analysis honest rather than overconfident.</span>
              </div>
              <div className="space-y-3">
                {result.assessmentSensitivities.map((s) => (
                  <div key={s.findingId} className="card p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <Lightbulb size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-600">Current assessment:</span>
                          <span className={`badge ${s.confidence === "high" ? "badge-green" : s.confidence === "medium" ? "badge-amber" : "badge-indigo"}`}>
                            {s.currentAssessment}
                          </span>
                        </div>
                        <div className="mt-3 rounded-lg bg-slate-50 p-3">
                          <div className="text-xs font-semibold text-slate-500 mb-1">What could change this assessment</div>
                          <p className="text-sm text-slate-600">{s.whatCouldChangeIt}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
