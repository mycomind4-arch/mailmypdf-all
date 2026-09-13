import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { runBuilder, runTester, runReviewer, runSeoCheck } from "./roles";
import { isProviderAvailable } from "./providers";
import type { LaunchRequest, RunState, RunEvent, RoleName, RoleStatus } from "./types";

const MAX_RETRIES = 2;
const RUNS_DIRNAME = ".agent-runs";
const INTEGRATION_BRANCH = "agent/integration";

const activeRuns = new Map<string, { kill: () => void }>();

function runsDir(repoRoot: string): string {
  return path.join(repoRoot, RUNS_DIRNAME);
}

function runDir(repoRoot: string, runId: string): string {
  return path.join(runsDir(repoRoot), runId);
}

async function writeRunState(repoRoot: string, state: RunState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await fs.writeFile(path.join(runDir(repoRoot, state.runId), "run.json"), JSON.stringify(state, null, 2));
}

async function appendEvent(repoRoot: string, runId: string, event: RunEvent): Promise<void> {
  await fs.appendFile(path.join(runDir(repoRoot, runId), "events.jsonl"), `${JSON.stringify(event)}\n`);
}

function setRoleStatus(state: RunState, role: RoleName, status: RoleStatus, detail?: string): void {
  const current = state.roles[role] ?? { status: "pending", attempts: 0 };
  state.roles[role] = { status, attempts: current.attempts, detail };
}

async function git(repoRootOrCwd: string, args: string[]): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("git", args, { cwd: repoRootOrCwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
    child.on("error", (error) => resolve({ exitCode: null, stdout, stderr: String(error) }));
  });
}

/** Lists what a caller needs to know before launching: which providers are actually usable right now. */
export async function getProviderAvailability(): Promise<{ claude: boolean; codex: boolean }> {
  const [claude, codex] = await Promise.all([isProviderAvailable("claude"), isProviderAvailable("codex")]);
  return { claude, codex };
}

/** Starts a run and returns immediately with its id; the run continues in the background. */
export async function startOrchestratorRun(request: LaunchRequest & { repoRoot: string }): Promise<{ runId: string }> {
  const runId = `${request.workflowId}-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
  const branch = `agent/${request.workflowId}-${runId.split("-").pop()}`;
  const worktreeDir = path.join(runDir(request.repoRoot, runId), "work");

  const state: RunState = {
    runId,
    verticalId: request.verticalId,
    workflowId: request.workflowId,
    instructions: request.instructions,
    branch,
    worktreeDir,
    status: "running",
    roles: {},
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(runDir(request.repoRoot, runId), { recursive: true });
  await fs.writeFile(path.join(runDir(request.repoRoot, runId), "events.jsonl"), "");
  await writeRunState(request.repoRoot, state);

  void executeRun(request, state)
    .catch(async (error) => {
      state.status = "failed";
      await appendEvent(request.repoRoot, runId, {
        at: new Date().toISOString(),
        role: "orchestrator",
        type: "run.failed",
        detail: error instanceof Error ? error.message : String(error),
      });
      await writeRunState(request.repoRoot, state);
    })
    .finally(() => activeRuns.delete(runId));

  return { runId };
}

export function stopRun(runId: string): boolean {
  const active = activeRuns.get(runId);
  if (!active) return false;
  active.kill();
  activeRuns.delete(runId);
  return true;
}

async function executeRun(request: LaunchRequest & { repoRoot: string }, state: RunState): Promise<void> {
  const { repoRoot } = request;
  const emit = (role: RunEvent["role"], type: string, detail?: string, data?: Record<string, unknown>) =>
    appendEvent(repoRoot, state.runId, { at: new Date().toISOString(), role, type, detail, data });
  const onOutput = (role: RoleName) => (chunk: string) => void emit(role, "output", chunk);

  emit("orchestrator", "run.started", `Preparing worktree for ${state.workflowId} on branch ${state.branch}.`);
  await fs.mkdir(path.dirname(state.worktreeDir), { recursive: true });

  const worktreeAdd = await git(repoRoot, ["worktree", "add", state.worktreeDir, "-b", state.branch]);
  if (worktreeAdd.exitCode !== 0) {
    state.status = "failed";
    await emit("orchestrator", "worktree.failed", worktreeAdd.stderr);
    await writeRunState(repoRoot, state);
    return;
  }
  await emit("orchestrator", "worktree.ready", state.worktreeDir);

  // `git worktree add` only ever checks out committed history. Any repo work
  // that's uncommitted or untracked in repoRoot (which is common — this is a
  // dev tool, not a CI runner) would otherwise be invisible to the agents,
  // silently diverging from what Studio itself is showing you. Overlay the
  // actual current working-tree contents on top of the clean checkout so the
  // run starts from what you're really looking at right now.
  await overlayWorkingTree(repoRoot, state.worktreeDir, (chunk) => void emit("orchestrator", "overlay.output", chunk));
  await emit("orchestrator", "overlay.done");

  let cancelled = false;
  activeRuns.set(state.runId, { kill: () => { cancelled = true; } });

  await runInstall(state.worktreeDir, (chunk) => void emit("orchestrator", "install.output", chunk));
  await emit("orchestrator", "install.done");
  await writeRunState(repoRoot, state);

  const baseBranch = (await git(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"])).stdout.trim() || "main";

  let builderFailure: string | undefined;
  let reviewerComments: string[] = [];
  let testerPass = false;
  let reviewerApproved = false;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (cancelled) break;
    setRoleStatus(state, "builder", "running");
    state.roles.builder!.attempts = attempt + 1;
    await writeRunState(repoRoot, state);
    await emit("builder", "role.started", `Attempt ${attempt + 1}`);

    const builderResult = await runBuilder({
      worktreeDir: state.worktreeDir,
      repoRoot,
      verticalId: state.verticalId,
      workflowId: state.workflowId,
      provider: request.builderProvider ?? "codex",
      instructions: state.instructions,
      priorFailure: builderFailure ?? (reviewerComments.length ? `Reviewer requested changes:\n${reviewerComments.join("\n")}` : undefined),
      onOutput: onOutput("builder"),
      onProcessStart: (kill) => activeRuns.set(state.runId, { kill: () => { cancelled = true; kill(); } }),
    });
    if (cancelled) break;
    setRoleStatus(state, "builder", builderResult.exitCode === 0 ? "pass" : "fail");
    await writeRunState(repoRoot, state);
    await emit("builder", "role.finished", `exit code ${builderResult.exitCode}`);

    setRoleStatus(state, "tester", "running");
    await writeRunState(repoRoot, state);
    await emit("tester", "role.started");
    const testerResult = await runTester({
      worktreeDir: state.worktreeDir,
      repoRoot,
      verticalId: state.verticalId,
      workflowId: state.workflowId,
      onOutput: onOutput("tester"),
    });
    testerPass = testerResult.pass;
    setRoleStatus(state, "tester", testerPass ? "pass" : "fail", testerResult.detail);
    await writeRunState(repoRoot, state);
    await emit("tester", "role.finished", testerResult.detail);

    if (!testerPass) {
      builderFailure = testerResult.detail;
      reviewerComments = [];
      if (attempt === MAX_RETRIES) break;
      await emit("orchestrator", "retry", "Tester failed — sending Builder another attempt.");
      continue;
    }

    setRoleStatus(state, "reviewer", "running");
    await writeRunState(repoRoot, state);
    await emit("reviewer", "role.started");
    const reviewerResult = await runReviewer({
      worktreeDir: state.worktreeDir,
      repoRoot,
      verticalId: state.verticalId,
      workflowId: state.workflowId,
      provider: request.reviewerProvider ?? "codex",
      baseBranch,
      onOutput: onOutput("reviewer"),
    });
    reviewerApproved = reviewerResult.approved;
    setRoleStatus(state, "reviewer", reviewerApproved ? "approved" : "changes_requested", reviewerResult.comments.join("\n"));
    await writeRunState(repoRoot, state);
    await emit("reviewer", "role.finished", reviewerResult.comments.join("\n"));

    if (reviewerApproved) {
      builderFailure = undefined;
      break;
    }
    reviewerComments = reviewerResult.comments;
    builderFailure = undefined;
    if (attempt === MAX_RETRIES) break;
    await emit("orchestrator", "retry", "Reviewer requested changes — sending Builder another attempt.");
  }

  if (cancelled) {
    state.status = "cancelled";
    await emit("orchestrator", "run.cancelled");
    await writeRunState(repoRoot, state);
    return;
  }

  if (!testerPass || !reviewerApproved) {
    state.status = "needs_human";
    await emit("orchestrator", "run.needs_human", !testerPass ? "Tester never passed." : "Reviewer never approved.");
    await writeRunState(repoRoot, state);
    return;
  }

  {
    setRoleStatus(state, "seo", "running");
    await writeRunState(repoRoot, state);
    const seoFindings = await runSeoCheck({
      worktreeDir: state.worktreeDir,
      repoRoot,
      verticalId: state.verticalId,
      workflowId: state.workflowId,
      publicPath: request.publicPath ?? `/workflows/${state.workflowId}`,
      onOutput: onOutput("seo"),
    });
    const seoPass = seoFindings.every((finding) => finding.pass);
    setRoleStatus(state, "seo", seoPass ? "pass" : "fail", JSON.stringify(seoFindings));
    await emit("seo", "role.finished", JSON.stringify(seoFindings));
    await writeRunState(repoRoot, state); // advisory only — never blocks the merge below
  }

  await emit("orchestrator", "merge.started", `Merging ${state.branch} into ${INTEGRATION_BRANCH}.`);
  const ensureIntegrationBranch = await git(repoRoot, ["rev-parse", "--verify", INTEGRATION_BRANCH]);
  if (ensureIntegrationBranch.exitCode !== 0) {
    await git(repoRoot, ["branch", INTEGRATION_BRANCH, baseBranch]);
  }
  const worktreeForMerge = path.join(runDir(repoRoot, state.runId), "merge-target");
  await git(repoRoot, ["worktree", "add", worktreeForMerge, INTEGRATION_BRANCH]);
  const merge = await git(worktreeForMerge, ["merge", "--no-edit", state.branch]);
  await git(repoRoot, ["worktree", "remove", worktreeForMerge, "--force"]);

  if (merge.exitCode !== 0) {
    state.status = "needs_human";
    await emit("orchestrator", "merge.failed", merge.stderr);
    await writeRunState(repoRoot, state);
    return;
  }

  state.status = "merged";
  state.mergedInto = INTEGRATION_BRANCH;
  await emit("orchestrator", "merge.done", `Merged into ${INTEGRATION_BRANCH}.`);
  await writeRunState(repoRoot, state);
}

const OVERLAY_EXCLUDES = [
  ".git",
  "node_modules",
  ".agent-runs",
  ".claude",
  ".turbo",
  ".output",
  ".wrangler",
  ".tanstack",
  "coverage",
];
// Deliberately NOT excluding "dist": several workspace packages (e.g.
// @mailmypdf/documents) resolve via a pre-built dist/, not their TS source —
// skipping it here breaks module resolution in the worktree entirely.

async function overlayWorkingTree(repoRoot: string, worktreeDir: string, onOutput: (chunk: string) => void): Promise<void> {
  const args = ["-a", "--delete", ...OVERLAY_EXCLUDES.map((name) => `--exclude=${name}`), `${repoRoot}/`, `${worktreeDir}/`];
  await new Promise<void>((resolve) => {
    const child = spawn("rsync", args, { stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => onOutput(chunk.toString("utf8")));
    child.stderr.on("data", (chunk) => onOutput(chunk.toString("utf8")));
    child.on("close", () => resolve());
    child.on("error", (error) => { onOutput(String(error)); resolve(); });
  });
}

async function runInstall(cwd: string, onOutput: (chunk: string) => void): Promise<void> {
  await new Promise<void>((resolve) => {
    const child = spawn("pnpm", ["install", "--frozen-lockfile"], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => onOutput(chunk.toString("utf8")));
    child.stderr.on("data", (chunk) => onOutput(chunk.toString("utf8")));
    child.on("close", () => resolve());
    child.on("error", () => resolve());
  });
}

/** Lists run summaries for Studio's run list, newest first. */
export async function listRuns(repoRoot: string): Promise<RunState[]> {
  const dir = runsDir(repoRoot);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  const states = await Promise.all(
    entries.map(async (runId) => {
      try {
        const raw = await fs.readFile(path.join(dir, runId, "run.json"), "utf8");
        return JSON.parse(raw) as RunState;
      } catch {
        return null;
      }
    }),
  );
  return states.filter((state): state is RunState => state !== null).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function runEventsLogPath(repoRoot: string, runId: string): string {
  return path.join(runDir(repoRoot, runId), "events.jsonl");
}
