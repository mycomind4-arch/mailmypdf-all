/**
 * Shared results-rendering component for all Private Office Gold Standard workflows.
 *
 * This component eliminates ~130 lines of duplicated UI per workflow route.
 * It renders pipeline stages, findings, evidence, timeline, risks, strategy,
 * draft preview, and the disclaimer — all driven by typed props.
 *
 * Domain-specific content (intake forms, authority/SEO sections, hero copy)
 * remains in each workflow's own route file.
 */

import type { WorkflowExecutionResult } from "@/domain/workflow-executor";
import type { WorkflowProfile } from "@/domain/workflow-profiles";
import { Send } from "lucide-react";

export interface WorkflowResultsProps {
  /** The workflow execution result from runPrivateOfficeWorkflow(). */
  result: WorkflowExecutionResult;
  /** The workflow profile for disclaimer + metadata. */
  profile: WorkflowProfile;
}

export function WorkflowResults({ result, profile }: WorkflowResultsProps) {
  return (
    <div className="mt-8 space-y-6">
      {/* Stage results */}
      <div className="card p-6">
        <h3 className="font-semibold text-indigo-800">Pipeline stages</h3>
        <div className="mt-3 space-y-1">
          {result.stages.map((stage) => (
            <div key={stage.stage} className="flex items-center gap-2 text-sm">
              <span
                className={
                  stage.status === "passed"
                    ? "text-green-600"
                    : stage.status === "failed"
                      ? "text-red-600"
                      : stage.status === "blocked"
                        ? "text-red-600"
                        : "text-slate-400"
                }
              >
                {stage.status === "passed"
                  ? "✓"
                  : stage.status === "failed" || stage.status === "blocked"
                    ? "✗"
                    : "○"}{" "}
                {stage.stage}
              </span>
              {stage.detail && (
                <span className="text-slate-400">— {stage.detail}</span>
              )}
            </div>
          ))}
        </div>
        {result.errors.length > 0 && (
          <div className="mt-4 alert alert-danger">
            <strong>Blocking issues:</strong>
            <ul className="mt-2 list-disc pl-5">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Findings */}
      {result.analysis.findings.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-indigo-800">
            Findings ({result.analysis.findings.length})
          </h3>
          <div className="mt-3 space-y-2">
            {result.analysis.findings.map((finding) => (
              <div
                key={finding.id}
                className="flex items-start gap-2 text-sm"
              >
                <span
                  className={
                    finding.state === "confirmed"
                      ? "badge badge-green"
                      : finding.state === "missing"
                        ? "badge badge-red"
                        : "badge badge-gold"
                  }
                >
                  {finding.state}
                </span>
                <div>
                  <p className="font-medium text-indigo-700">{finding.title}</p>
                  <p className="text-slate-500">{finding.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence */}
      {result.analysis.evidence.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-indigo-800">
            Evidence requirements ({result.analysis.evidence.length})
          </h3>
          <div className="mt-3 space-y-2">
            {result.analysis.evidence.map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 text-sm">
                <span
                  className={
                    ev.status === "verified" || ev.status === "provided"
                      ? "badge badge-green"
                      : ev.status === "missing"
                        ? "badge badge-red"
                        : "badge badge-gold"
                  }
                >
                  {ev.status}
                </span>
                <span className="text-slate-600">{ev.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {result.analysis.risks.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-indigo-800">
            Risks ({result.analysis.risks.length})
          </h3>
          <div className="mt-3 space-y-2">
            {result.analysis.risks.map((risk) => (
              <div
                key={risk.title}
                className="flex items-start gap-2 text-sm"
              >
                <span
                  className={
                    risk.severity === "high"
                      ? "badge badge-red"
                      : risk.severity === "medium"
                        ? "badge badge-gold"
                        : "badge badge-green"
                  }
                >
                  {risk.severity}
                </span>
                <div>
                  <p className="font-medium text-indigo-700">{risk.title}</p>
                  <p className="text-slate-500">{risk.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy */}
      {result.analysis.strategy.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-indigo-800">
            Strategy ({result.analysis.strategy.length})
          </h3>
          <ul className="mt-3 space-y-2">
            {result.analysis.strategy.map((strat, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm leading-6 text-slate-600"
              >
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-300" />
                {strat}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Timeline */}
      {result.analysis.timeline.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-indigo-800">
            Chronology ({result.analysis.timeline.length})
          </h3>
          <div className="mt-3 space-y-1">
            {result.analysis.timeline.map((event, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium text-indigo-700">
                  {event.date ?? "Date unknown"}
                </span>
                <span className="text-slate-500"> — {event.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Draft */}
      {result.draft && (
        <div className="card p-6">
          <h3 className="font-semibold text-indigo-800">Draft correspondence</h3>
          <p className="mt-1 text-xs text-slate-400">
            [DRAFT — REVIEW BEFORE SENDING] This draft is generated from your
            facts. Review every word before approving for mailing.
          </p>
          <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-cream p-4 text-sm leading-6 text-slate-700">
            {result.draft}
          </pre>
          <div className="mt-4 flex gap-3">
            <button className="btn-primary" disabled={!result.ready}>
              Approve &amp; Mail <Send size={16} />
            </button>
            <button className="btn-outline">Edit draft</button>
          </div>
          {!result.ready && (
            <p className="mt-3 text-xs text-red-600">
              Cannot mail until all blocking issues are resolved and the draft
              is approved.
            </p>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="alert alert-warning">
        <strong>Important:</strong> {profile.disclaimer}
      </div>
    </div>
  );
}
