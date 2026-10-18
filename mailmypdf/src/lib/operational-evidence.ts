export type RunEvidence = { status: string; conclusion: string | null; updated_at: string; html_url?: string };
export type JobEvidence = { name: string; conclusion: string | null; steps?: { name: string; conclusion: string | null }[] };
export type OperationCheck = { id: string; label: string; status: "pass" | "warning" | "fail" | "manual"; detail: string };
export function assessExecution(run: RunEvidence, jobs: JobEvidence[], stepName: string, now = Date.now(), maxAgeMs = 36 * 60 * 60_000): OperationCheck["status"] {
  const at = Date.parse(run.updated_at);
  if (!Number.isFinite(at) || at > now + 60_000 || now - at > maxAgeMs) return "warning";
  if (run.status !== "completed") return "warning";
  const steps = jobs.flatMap(job => job.steps ?? []).filter(step => step.name === stepName);
  if (steps.length !== 1) return "manual";
  if (steps[0].conclusion === "failure" || steps[0].conclusion === "cancelled") return "fail";
  if (steps[0].conclusion !== "success") return "warning";
  return run.conclusion === "success" ? "pass" : "fail";
}
export function assessDeployment(main: string | null, deployed: string | null): OperationCheck {
  const valid = (value: string | null) => Boolean(value && /^[a-f0-9]{40}$/i.test(value));
  if (!valid(deployed)) return { id: "deployment-revision", label: "Serving application revision", status: "manual", detail: "Deployment revision is unavailable. The next approved deploy records its exact commit." };
  if (!valid(main)) return { id: "deployment-revision", label: "Serving application revision", status: "manual", detail: "Serving commit " + deployed + "; main could not be verified." };
  return { id: "deployment-revision", label: "Serving application revision", status: main === deployed ? "pass" : "warning", detail: main === deployed ? "Serving application matches main: " + main : "Serving " + deployed + "; main is " + main + ". Review and deploy only after approval." };
}
