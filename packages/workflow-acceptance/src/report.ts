import type { AcceptanceFailure, AcceptanceReport, CheckResult } from "./types.js";

/**
 * Builds the final report.json. mailReady is derived, never asserted
 * directly by a caller: it is true only when every check passed and there
 * are zero hard_failure entries. See "Hard Gates" in
 * docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md.
 */
export function buildReport(params: {
  runId: string;
  workflow: string;
  scenario: string;
  startedAt: string;
  checks: CheckResult[];
  failures: AcceptanceFailure[];
  artifacts: AcceptanceReport["artifacts"];
}): AcceptanceReport {
  const checksRecord: Record<string, AcceptanceReport["checks"][string]> = {};
  for (const check of params.checks) checksRecord[check.name] = check.status;

  const hardFailures = params.failures.filter((f) => f.severity === "hard_failure");
  const qualityFindings = params.failures.filter((f) => f.severity === "quality_finding");
  const anyCheckFailed = params.checks.some((c) => c.status === "fail" || c.status === "blocked");
  const mailReady = hardFailures.length === 0 && !anyCheckFailed;

  return {
    runId: params.runId,
    workflow: params.workflow,
    scenario: params.scenario,
    startedAt: params.startedAt,
    finishedAt: new Date().toISOString(),
    status: mailReady ? "passed" : "failed",
    mailReady,
    checks: checksRecord,
    failures: hardFailures,
    qualityFindings,
    artifacts: params.artifacts,
  };
}

/** Renders a human-readable summary matching the CLI's terminal output shape from the build spec. */
export function formatReportSummary(report: AcceptanceReport): string {
  const lines: string[] = [];
  lines.push(`${report.workflow.toUpperCase()}`);
  lines.push(`Acceptance Run #${report.runId}`);
  lines.push("");
  for (const [name, status] of Object.entries(report.checks)) {
    const label = name.padEnd(28, " ");
    const statusLabel = status.toUpperCase();
    lines.push(`${label} ${statusLabel}`);
  }
  lines.push("");
  lines.push(`MAIL READY${" ".repeat(18)} ${report.mailReady ? "YES" : "NO"}`);
  if (!report.mailReady && report.failures.length > 0) {
    lines.push("");
    lines.push("FAILED");
    lines.push("");
    for (const failure of report.failures) {
      lines.push(failure.code);
      lines.push("");
      lines.push(failure.message);
      lines.push("");
    }
  }
  return lines.join("\n");
}
