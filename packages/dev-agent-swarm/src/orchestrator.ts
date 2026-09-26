import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { runBuilder, runTester, runReviewer, runSeoCheck, runSpecialistReview } from "./roles";
import { isProviderAvailable } from "./providers";
import type { AgentRole, LaunchRequest, RunState, RunEvent, RoleName, RoleStatus } from "./types";

const MAX_RETRIES = 2;
export const RUNS_DIRNAME = ".agent-runs";
const INTEGRATION_BRANCH = "agent/integration";
const CORE_ROLES = new Set<AgentRole>(["builder", "tester", "reviewer", "seo"]);

const activeRuns = new Map<string, { kill: () => void }>();

/** Shared by chat.ts: batch runs and chat sessions live side by side under
 * the same `.agent-runs/<id>/` container (worktree + events.jsonl + a
 * run.json or session.json), so a lot of the file-layout plumbing is common. */
export function runsDir(repoRoot: string): string {
  return path.join(repoRoot, RUNS_DIRNAME);
}

export function runDir(repoRoot: string, runId: string): string {
  return path.join(runsDir(repoRoot), runId);
}

async function writeRunState(repoRoot: string, state: RunState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await fs.writeFile(path.join(runDir(repoRoot, state.runId), "run.json"), JSON.stringify(state, null, 2));
}

export async function appendEvent(repoRoot: string, runId: string, event: RunEvent): Promise<void> {
  await fs.appendFile(path.join(runDir(repoRoot, runId), "events.jsonl"), `${JSON.stringify(event)}\n`);
}

function setRoleStatus(state: RunState, role: RoleName, status: RoleStatus, detail?: string): void {
  const current = state.roles[role] ?? { status: "pending", attempts: 0 };
  state.roles[role] = { status, attempts: current.attempts, detail };
}

export async function git(repoRootOrCwd: string, args: string[]): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
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

/**
 * Creates a disposable git worktree on a fresh branch, overlays the repo's
 * actual current working-tree contents onto it (see overlayWorkingTree), and
 * installs dependencies — the common setup both a batch run and an
 * interactive chat session need before any agent role can act. Emits
 * progress via `emit` using the same event shape both callers already log.
 */
export async function prepareWorktree(
  repoRoot: string,
  worktreeDir: string,
  branch: string,
  emit: (role: "orchestrator", type: string, detail?: string) => Promise<void> | void,
): Promise<{ pass: boolean; detail: string }> {
  await fs.mkdir(path.dirname(worktreeDir), { recursive: true });

  const worktreeAdd = await git(repoRoot, ["worktree", "add", worktreeDir, "-b", branch]);
  if (worktreeAdd.exitCode !== 0) {
    await emit("orchestrator", "worktree.failed", worktreeAdd.stderr);
    return { pass: false, detail: worktreeAdd.stderr };
  }
  await emit("orchestrator", "worktree.ready", worktreeDir);

  // `git worktree add` only ever checks out committed history. Any repo work
  // that's uncommitted or untracked in repoRoot (which is common — this is a
  // dev tool, not a CI runner) would otherwise be invisible to the agents,
  // silently diverging from what Studio itself is showing you. Overlay the
  // actual current working-tree contents on top of the clean checkout so the
  // run starts from what you're really looking at right now.
  const overlay = await overlayWorkingTree(repoRoot, worktreeDir, (chunk) => void emit("orchestrator", "overlay.output", chunk));
  if (!overlay.pass) {
    await emit("orchestrator", "overlay.failed", overlay.detail);
    return overlay;
  }
  await emit("orchestrator", "overlay.done");

  const install = await runInstall(worktreeDir, (chunk) => void emit("orchestrator", "install.output", chunk));
  if (!install.pass) {
    await emit("orchestrator", "install.failed", install.detail);
    return install;
  }
  await emit("orchestrator", "install.done");
  return { pass: true, detail: "Worktree ready." };
}

async function executeRun(request: LaunchRequest & { repoRoot: string }, state: RunState): Promise<void> {
  const { repoRoot } = request;
  const emit = (role: RunEvent["role"], type: string, detail?: string, data?: Record<string, unknown>) =>
    appendEvent(repoRoot, state.runId, { at: new Date().toISOString(), role, type, detail, data });
  const onOutput = (role: RoleName) => (chunk: string) => void emit(role, "output", chunk);

  emit("orchestrator", "run.started", `Preparing worktree for ${state.workflowId} on branch ${state.branch}.`);

  const prepared = await prepareWorktree(repoRoot, state.worktreeDir, state.branch, emit);
  if (!prepared.pass) {
    state.status = "failed";
    // Preparation may have created the worktree before a later overlay or
    // install step failed. Clean it up immediately so failed autonomous runs
    // do not leak branches and registered worktrees.
    await cleanupWorktree(repoRoot, state);
    await writeRunState(repoRoot, state);
    return;
  }

  let cancelled = false;
  activeRuns.set(state.runId, { kill: () => { cancelled = true; } });
  await writeRunState(repoRoot, state);

  const baseBranch = (await git(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"])).stdout.trim() || "main";

  let builderFailure: string | undefined;
  let reviewerComments: string[] = [];
  let testerPass = false;
  let reviewerApproved = false;
  let seoPass = false;

  const maxRetries = Math.min(MAX_RETRIES, Math.max(0, (request.budget?.maxAttempts ?? MAX_RETRIES + 1) - 1));
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
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
      model: request.builderModel,
      timeoutMs: request.budget?.timeoutMs,
      instructions: state.instructions,
      priorFailure: builderFailure ?? (reviewerComments.length ? `Reviewer requested changes:\n${reviewerComments.join("\n")}` : undefined),
      onOutput: onOutput("builder"),
      onProcessStart: (kill) => activeRuns.set(state.runId, { kill: () => { cancelled = true; kill(); } }),
    });
    if (cancelled) break;
    setRoleStatus(state, "builder", builderResult.exitCode === 0 ? "pass" : "fail");
    await writeRunState(repoRoot, state);
    await emit("builder", "role.finished", `exit code ${builderResult.exitCode}`);

    await commitBuilderChanges(state.worktreeDir, state.workflowId, emit);

    setRoleStatus(state, "tester", "running");
    await writeRunState(repoRoot, state);
    await emit("tester", "role.started");
    const testerResult = await runTester({
      worktreeDir: state.worktreeDir,
      repoRoot,
      verticalId: state.verticalId,
      workflowId: state.workflowId,
      baseBranch,
      onOutput: onOutput("tester"),
    });
    testerPass = testerResult.pass;
    setRoleStatus(state, "tester", testerPass ? "pass" : "fail", testerResult.detail);
    await writeRunState(repoRoot, state);
    await emit("tester", "role.finished", testerResult.detail);

    if (!testerPass) {
      builderFailure = testerResult.detail;
      reviewerComments = [];
      if (attempt === maxRetries) break;
      await emit("orchestrator", "retry", "Tester failed — sending Builder another attempt.");
      continue;
    }

    // The SEO gate runs inside the attempt loop, before the Reviewer, so a
    // thin or unreachable-source page comes back to the Builder as actionable
    // feedback. Running it after the merge (as it used to) meant a page that
    // ships noindex and absent from sitemap.xml was still recorded as a
    // successful run.
    setRoleStatus(state, "seo", "running");
    await writeRunState(repoRoot, state);
    await emit("seo", "role.started");
    const seoFindings = await runSeoCheck({
      worktreeDir: state.worktreeDir,
      repoRoot,
      verticalId: state.verticalId,
      workflowId: state.workflowId,
      publicPath: request.publicPath ?? `/workflows/${state.workflowId}`,
      onOutput: onOutput("seo"),
    });
    const seoBlockers = seoFindings.filter((finding) => !finding.pass && finding.severity !== "warning");
    seoPass = seoBlockers.length === 0;
    setRoleStatus(state, "seo", seoPass ? "pass" : "fail", JSON.stringify(seoFindings));
    await writeRunState(repoRoot, state);
    await emit("seo", "role.finished", JSON.stringify(seoFindings));

    if (!seoPass) {
      builderFailure = [
        "The SEO gate rejected this page. Fix each item below; a page that fails this gate is served noindex and never reaches sitemap.xml.",
        ...seoBlockers.map((finding) => `- [${finding.check}] ${finding.detail}`),
      ].join("\n");
      reviewerComments = [];
      if (attempt === maxRetries) break;
      await emit("orchestrator", "retry", "SEO gate failed — sending Builder another attempt.");
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
      model: request.reviewerModel,
      timeoutMs: request.budget?.timeoutMs,
      baseBranch,
      onOutput: onOutput("reviewer"),
      onProcessStart: (kill) => activeRuns.set(state.runId, { kill: () => { cancelled = true; kill(); } }),
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
    if (attempt === maxRetries) break;
    await emit("orchestrator", "retry", "Reviewer requested changes — sending Builder another attempt.");
  }

  if (cancelled) {
    state.status = "cancelled";
    await emit("orchestrator", "run.cancelled");
    await writeRunState(repoRoot, state);
    await cleanupWorktree(repoRoot, state);
    return;
  }

  if (!testerPass || !seoPass || !reviewerApproved) {
    const reason = !testerPass
      ? "Tester never passed."
      : !seoPass
        ? "SEO gate never passed — the page would ship noindex and absent from sitemap.xml."
        : "Reviewer never approved.";
    state.status = "needs_human";
    await emit("orchestrator", "run.needs_human", reason);
    await writeRunState(repoRoot, state);
    return;
  }

  const requestedSpecialists = [...new Set(request.requestedRoles ?? [])].filter(
    (role): role is Exclude<AgentRole, "builder" | "tester" | "reviewer" | "seo"> => !CORE_ROLES.has(role),
  );
  if (requestedSpecialists.length) {
    const specialistLimit = Math.min(4, Math.max(1, request.budget?.maxConcurrentAgents ?? 2));
    const specialistKills = new Set<() => void>();
    const results = await runWithConcurrency(requestedSpecialists, specialistLimit, async (role) => {
      setRoleStatus(state, role, "running");
      await writeRunState(repoRoot, state);
      await emit(role, "role.started");
      const result = await runSpecialistReview({
        worktreeDir: state.worktreeDir,
        repoRoot,
        verticalId: state.verticalId,
        workflowId: state.workflowId,
        role,
        provider: request.reviewerProvider ?? "codex",
        model: request.reviewerModel,
        timeoutMs: request.budget?.timeoutMs,
        baseBranch,
        onOutput: onOutput(role),
        onProcessStart: (kill) => {
          specialistKills.add(kill);
          activeRuns.set(state.runId, {
            kill: () => {
              cancelled = true;
              for (const stop of specialistKills) stop();
            },
          });
        },
      });
      setRoleStatus(state, role, result.approved ? "approved" : "changes_requested", result.comments.join("\n"));
      await writeRunState(repoRoot, state);
      await emit(role, "role.finished", result.comments.join("\n"));
      return result;
    });
    if (cancelled) {
      state.status = "cancelled";
      await emit("orchestrator", "run.cancelled");
      await writeRunState(repoRoot, state);
      await cleanupWorktree(repoRoot, state);
      return;
    }
    if (results.some((result) => !result.approved)) {
      state.status = "needs_human";
      await emit("orchestrator", "run.needs_human", "One or more specialist gates requested a human decision.");
      await writeRunState(repoRoot, state);
      return;
    }
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
  // The run's own branch is now fully captured in INTEGRATION_BRANCH's
  // history — its worktree and branch have served their purpose.
  await cleanupWorktree(repoRoot, state);
}

/**
 * The Builder role deliberately has no Bash access — see providers.ts's
 * comment on why: a disposable worktree doesn't stop a shell command from
 * reaching the rest of the developer machine, so `acceptEdits` (file edits
 * only) is used instead of `bypassPermissions`. That means the Builder can
 * write and edit files but can never run `git commit` itself. Confirmed by a
 * real run: genuinely correct, hand-verified edits sat uncommitted in the
 * worktree, and the Reviewer correctly reported an empty diff since nothing
 * had been committed for it to review. The orchestrator already runs
 * trusted `git` commands directly for worktree setup and merge, so it is the
 * right place to capture whatever the Builder actually wrote, before
 * Tester/Reviewer look at it — this preserves the Builder's sandboxing while
 * fixing the run so real edits are not silently lost.
 */
async function commitBuilderChanges(
  worktreeDir: string,
  workflowId: string,
  emit: (role: RunEvent["role"], type: string, detail?: string) => Promise<void> | void,
): Promise<void> {
  const add = await git(worktreeDir, ["add", "-A"]);
  if (add.exitCode !== 0) {
    await emit("orchestrator", "commit.failed", add.stderr || "git add failed.");
    return;
  }
  const staged = await git(worktreeDir, ["diff", "--cached", "--stat"]);
  if (!staged.stdout.trim()) {
    await emit("orchestrator", "commit.skipped", "No file changes after the Builder's turn.");
    return;
  }
  const commit = await git(worktreeDir, ["commit", "-m", `agent: ${workflowId} builder changes`]);
  if (commit.exitCode !== 0) {
    await emit("orchestrator", "commit.failed", commit.stderr || "git commit failed.");
    return;
  }
  await emit("orchestrator", "commit.done", staged.stdout.trim());
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
    }
  }));
  return results;
}

/**
 * Overlays only tracked changes. Copying the whole developer checkout also
 * copied ignored files such as .env.local into an LLM-controlled workspace.
 * A new worktree already has every tracked file at HEAD; applying the tracked
 * staged and unstaged diffs gives agents the current code without secrets.
 */
async function overlayWorkingTree(repoRoot: string, worktreeDir: string, onOutput: (chunk: string) => void): Promise<{ pass: boolean; detail: string }> {
  for (const args of [["diff", "--binary", "--no-ext-diff", "HEAD"], ["diff", "--cached", "--binary", "--no-ext-diff"]]) {
    const diff = await git(repoRoot, args);
    if (diff.exitCode !== 0) return { pass: false, detail: diff.stderr || "Could not read the current git diff." };
    if (!diff.stdout) continue;
    const applied = await new Promise<{ pass: boolean; detail: string }>((resolve) => {
      const child = spawn("git", ["apply", "--whitespace=nowarn", "-"], { cwd: worktreeDir, stdio: ["pipe", "pipe", "pipe"] });
      child.stdin.write(diff.stdout);
      child.stdin.end();
      let output = "";
    child.stdout.on("data", (chunk) => onOutput(chunk.toString("utf8")));
      child.stderr.on("data", (chunk) => { const text = chunk.toString("utf8"); output += text; onOutput(text); });
      child.on("close", (code) => resolve({ pass: code === 0, detail: output || `git apply exited ${code}` }));
      child.on("error", (error) => resolve({ pass: false, detail: String(error) }));
    });
    if (!applied.pass) return applied;
  }

  // Several workspace packages (e.g. @mailmypdf/documents) resolve via a
  // pre-built dist/, not their TS source — and dist/ is gitignored, so
  // neither `git worktree add` (checks out committed history only) nor the
  // tracked-diff overlay above ever puts it in a fresh worktree. dist/ is
  // build output, not a secret, so it's safe to copy directly (unlike a
  // whole-checkout copy, which is what leaked .env.local before).
  const distCopy = await copyPackageDistOutputs(repoRoot, worktreeDir, onOutput);
  if (!distCopy.pass) return distCopy;

  // `git diff HEAD` only ever covers files git already knows about — a
  // brand-new file (a new route mount, a new module) that was never `git
  // add`-ed is invisible to it, so it silently never reached the worktree.
  // Confirmed by a real run: a Builder had to reconstruct a reference file
  // from scratch because a genuinely new file from the current session
  // wasn't there. `git ls-files --others --exclude-standard` is exactly the
  // same "Untracked files" list `git status` shows — it can never surface
  // something .gitignore excludes, so this preserves the exact secret
  // boundary the tracked-diff-only design above exists for.
  const untrackedCopy = await copyUntrackedFiles(repoRoot, worktreeDir, onOutput);
  if (!untrackedCopy.pass) return untrackedCopy;

  return { pass: true, detail: "Tracked changes overlaid." };
}

async function copyUntrackedFiles(repoRoot: string, worktreeDir: string, onOutput: (chunk: string) => void): Promise<{ pass: boolean; detail: string }> {
  const list = await git(repoRoot, ["ls-files", "--others", "--exclude-standard"]);
  if (list.exitCode !== 0) return { pass: false, detail: list.stderr || "Could not list untracked files." };
  const files = list.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  for (const relPath of files) {
    const src = path.join(repoRoot, relPath);
    const dest = path.join(worktreeDir, relPath);
    try {
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
    } catch (error) {
      const detail = `Could not copy untracked file ${relPath} into the worktree: ${error instanceof Error ? error.message : String(error)}`;
      onOutput(`${detail}\n`);
      return { pass: false, detail };
    }
  }
  return { pass: true, detail: `${files.length} untracked file(s) copied.` };
}

async function copyPackageDistOutputs(repoRoot: string, worktreeDir: string, onOutput: (chunk: string) => void): Promise<{ pass: boolean; detail: string }> {
  const packagesDir = path.join(repoRoot, "packages");
  let entries: string[];
  try {
    entries = await fs.readdir(packagesDir);
  } catch {
    return { pass: true, detail: "No packages/ directory." };
  }
  for (const name of entries) {
    const distSrc = path.join(packagesDir, name, "dist");
    const distDest = path.join(worktreeDir, "packages", name, "dist");
    try {
      await fs.access(distSrc);
    } catch {
      continue; // No dist/ for this package — nothing to copy.
    }
    try {
      await fs.rm(distDest, { recursive: true, force: true });
      await fs.cp(distSrc, distDest, { recursive: true });
    } catch (error) {
      const detail = `Could not copy packages/${name}/dist into the worktree: ${error instanceof Error ? error.message : String(error)}`;
      onOutput(`${detail}\n`);
      return { pass: false, detail };
    }
  }
  return { pass: true, detail: "dist/ outputs copied." };
}

async function runInstall(cwd: string, onOutput: (chunk: string) => void): Promise<{ pass: boolean; detail: string }> {
  return new Promise((resolve) => {
    const child = spawn("pnpm", ["install", "--frozen-lockfile"], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => onOutput(chunk.toString("utf8")));
    child.stderr.on("data", (chunk) => { const text = chunk.toString("utf8"); output += text; onOutput(text); });
    child.on("close", (code) => resolve({ pass: code === 0, detail: output || `pnpm install exited ${code}` }));
    child.on("error", (error) => resolve({ pass: false, detail: String(error) }));
  });
}

/**
 * Removes a run/session's worktree and branch. Nothing in this package
 * called this before it existed — every batch run and every chat session
 * left its worktree directory and its `agent/*`/`agent/chat-*` branch behind
 * permanently, with no cleanup path at all, growing unbounded the moment the
 * swarm was ever actually used. Safe to call on a run/session in any state;
 * a still-running one is stopped first. `git worktree remove` handles the
 * normal case; if a worktree is dirty or its administrative files are
 * already gone, fall back to `--force` and then a plain directory removal so
 * this never leaves an orphaned worktree registration behind.
 */
export async function cleanupWorktree(
  repoRoot: string,
  info: { worktreeDir: string; branch: string },
): Promise<{ pass: boolean; detail: string }> {
  const remove = await git(repoRoot, ["worktree", "remove", info.worktreeDir, "--force"]);
  if (remove.exitCode !== 0) {
    // The worktree's own directory may already be half-gone (e.g. a prior
    // partial cleanup) while git still has it registered — prune first, then
    // make sure the directory itself doesn't linger either way.
    await git(repoRoot, ["worktree", "prune"]);
    await fs.rm(info.worktreeDir, { recursive: true, force: true });
  }
  const branchDelete = await git(repoRoot, ["branch", "-D", info.branch]);
  const detail = [remove.stderr, branchDelete.exitCode !== 0 ? branchDelete.stderr : ""].filter(Boolean).join(" / ");
  return { pass: true, detail: detail || "Worktree and branch removed." };
}

/**
 * Manual cleanup for a run a human has finished reviewing — the batch-run
 * equivalent of closing a chat session. executeRun already cleans up
 * automatically once a run reaches "merged" or "cancelled", where nothing
 * further needs human eyes; "needs_human" and "failed" runs keep their
 * worktree until this is called explicitly, since those are exactly the
 * states where someone may want to inspect what the agents actually did.
 * run.json/events.jsonl (small, no worktree content) are left in place as
 * the audit trail; only the worktree directory and its branch are removed.
 */
export async function cleanupRun(repoRoot: string, runId: string): Promise<{ pass: boolean; detail: string }> {
  const raw = await fs.readFile(path.join(runDir(repoRoot, runId), "run.json"), "utf8").catch(() => null);
  if (!raw) return { pass: false, detail: "Run not found." };
  const state = JSON.parse(raw) as RunState;
  if (state.status === "running") return { pass: false, detail: "Stop the run before cleaning it up." };
  return cleanupWorktree(repoRoot, state);
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
