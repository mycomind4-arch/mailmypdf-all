import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { git, cleanupWorktree } from "./orchestrator";

/**
 * cleanupWorktree runs real `git worktree remove` / `git branch -D` — never
 * exercised against the actual dev/mailmypdf-all checkout in a test. Build a
 * disposable throwaway repo per test instead.
 */
async function makeTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dev-agent-swarm-test-"));
  await git(dir, ["init", "--quiet"]);
  await git(dir, ["config", "user.email", "test@example.com"]);
  await git(dir, ["config", "user.name", "Test"]);
  await fs.writeFile(path.join(dir, "README.md"), "seed\n");
  await git(dir, ["add", "."]);
  await git(dir, ["commit", "--quiet", "-m", "seed"]);
  return dir;
}

test("cleanupWorktree removes a clean worktree and its branch", async () => {
  const repoRoot = await makeTempRepo();
  const worktreeDir = path.join(repoRoot, ".agent-runs", "run-1", "work");
  const branch = "agent/run-1";
  await fs.mkdir(path.dirname(worktreeDir), { recursive: true });
  const add = await git(repoRoot, ["worktree", "add", worktreeDir, "-b", branch]);
  assert.equal(add.exitCode, 0, add.stderr);

  const result = await cleanupWorktree(repoRoot, { worktreeDir, branch });
  assert.equal(result.pass, true);

  const list = await git(repoRoot, ["worktree", "list"]);
  assert.doesNotMatch(list.stdout, new RegExp(worktreeDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await assert.rejects(fs.access(worktreeDir));

  const branches = await git(repoRoot, ["branch", "--list", branch]);
  assert.equal(branches.stdout.trim(), "");

  await fs.rm(repoRoot, { recursive: true, force: true });
});

test("cleanupWorktree removes a worktree with uncommitted changes (force)", async () => {
  const repoRoot = await makeTempRepo();
  const worktreeDir = path.join(repoRoot, ".agent-runs", "run-2", "work");
  const branch = "agent/run-2";
  await fs.mkdir(path.dirname(worktreeDir), { recursive: true });
  await git(repoRoot, ["worktree", "add", worktreeDir, "-b", branch]);
  // An agent's dirty, uncommitted edit — the exact situation a plain
  // (non-forced) `git worktree remove` refuses to touch.
  await fs.writeFile(path.join(worktreeDir, "README.md"), "dirty, uncommitted\n");

  const result = await cleanupWorktree(repoRoot, { worktreeDir, branch });
  assert.equal(result.pass, true);
  await assert.rejects(fs.access(worktreeDir));

  await fs.rm(repoRoot, { recursive: true, force: true });
});

test("cleanupWorktree is idempotent — a second call on an already-removed worktree still reports success", async () => {
  const repoRoot = await makeTempRepo();
  const worktreeDir = path.join(repoRoot, ".agent-runs", "run-3", "work");
  const branch = "agent/run-3";
  await fs.mkdir(path.dirname(worktreeDir), { recursive: true });
  await git(repoRoot, ["worktree", "add", worktreeDir, "-b", branch]);

  await cleanupWorktree(repoRoot, { worktreeDir, branch });
  const second = await cleanupWorktree(repoRoot, { worktreeDir, branch });
  assert.equal(second.pass, true);

  await fs.rm(repoRoot, { recursive: true, force: true });
});
