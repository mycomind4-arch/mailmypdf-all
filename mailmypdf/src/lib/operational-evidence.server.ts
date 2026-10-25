import { assessDeployment, assessExecution, type JobEvidence, type RunEvidence, type OperationCheck } from "./operational-evidence";
import { findStudioProject } from "@/studio/domain/studio-project";

export async function readOperationalEvidence(): Promise<OperationCheck[]> {
  const checks: OperationCheck[] = [];
  const token = process.env.GITHUB_ACCESS_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim();
  const deployed = process.env.MAILMYPDF_DEPLOYED_SHA?.trim() || null;
  const project = findStudioProject("mailmypdf");
  if (!token || !project) return [
    { id: "github-operations", label: "GitHub operations evidence", status: "manual", detail: "Configure server-side GitHub repository/Actions read access to verify actual execution. No credential values are displayed." },
    assessDeployment(null, deployed),
  ];
  const repository = new URL(project.repoUrl).pathname.replace(/^\//, "").replace(/\.git$/, "");
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("Invalid operational repository");
  const get = async (path: string) => {
    const response = await fetch("https://api.github.com/repos/" + repository + "/" + path, {
      headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      redirect: "error", signal: AbortSignal.timeout(8_000), cache: "no-store",
    });
    if (!response.ok) throw new Error("GitHub evidence unavailable");
    return response.json();
  };
  let main: string | null = null;
  try {
    const branch = await get("branches/" + encodeURIComponent(project.defaultBranch));
    main = typeof branch.commit?.sha === "string" ? branch.commit.sha : null;
  } catch {
    checks.push({ id: "github-main", label: "Main branch", status: "manual", detail: "Could not read main. Verify repository access and retry." });
  }
  checks.push(assessDeployment(main, deployed));
  const workflows = [
    { file: "cloud-agent-mailmypdf.yml", label: "Cloud development agent", steps: ["Implement one bounded task (estimated API cap $2/run)"], age: 36 * 60 * 60_000 },
    { file: "secure-core-jobs.yml", label: "Secure document operations", steps: ["Run the scanner job", "Run connector operation reconciliation", "Run the retention job"], age: 36 * 60 * 60_000 },
  ];
  await Promise.all(workflows.map(async workflow => {
    try {
      const result = await get("actions/workflows/" + workflow.file + "/runs?branch=" + encodeURIComponent(project.defaultBranch) + "&per_page=1");
      const run = result.workflow_runs?.[0] as (RunEvidence & { id: number }) | undefined;
      if (!run || !Number.isSafeInteger(run.id)) throw new Error("No run");
      const resultJobs = await get("actions/runs/" + run.id + "/jobs?filter=latest&per_page=100");
      if (!Array.isArray(resultJobs.jobs) || resultJobs.total_count > 100) throw new Error("Incomplete evidence");
      for (const step of workflow.steps) {
        const state = assessExecution(run, resultJobs.jobs as JobEvidence[], step, Date.now(), step === "Run the retention job" ? workflow.age : workflow.file === "secure-core-jobs.yml" ? 60 * 60_000 : workflow.age);
        checks.push({ id: "execution-" + step, label: step, status: state,
          detail: state === "pass" ? "Processing step completed in run " + run.id + " at " + run.updated_at + ". This proves execution, not customer outcomes."
            : "Latest run " + run.id + " does not prove fresh successful execution of this step (failed, skipped, pending, stale, or not scheduled in this run). Inspect GitHub Actions." });
      }
    } catch {
      checks.push({ id: workflow.file, label: workflow.label, status: "manual", detail: "Execution evidence unavailable. Verify Actions read permission and inspect the latest run; health is unknown." });
    }
  }));
  return checks;
}
