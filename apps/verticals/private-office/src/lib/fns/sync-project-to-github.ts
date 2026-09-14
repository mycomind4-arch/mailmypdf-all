import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { studioFileScanAuthMiddleware } from "@/lib/fns/scan-project-files";
import { findStudioProject, resolveProjectRoot } from "@/domain/studio-project";

const inputSchema = z.object({
  projectId: z.string(),
  /** Set true only after the caller has shown the user the exact file list/commit message and they confirmed. */
  confirmed: z.boolean().optional(),
  commitMessage: z.string().min(1).max(500).optional(),
});

/**
 * Status check: what would Sync do? Called first (confirmed=false/omitted) so the
 * UI can show the real diff before asking the user to confirm the push.
 *
 * Note: today Studio's workflow builder only persists to browser localStorage,
 * so there is nothing Studio itself writes to disk yet — this syncs whatever is
 * currently dirty in the working tree (your own edits, e.g. from this session).
 * Once Studio writes real files, scope `git add` to those paths specifically
 * instead of `-A`.
 */
export const syncProjectToGithub = createServerFn({ method: "POST" })
  .middleware([studioFileScanAuthMiddleware])
  .validator(inputSchema)
  .handler(async ({ data }) => {
    const project = findStudioProject(data.projectId);
    if (!project) throw new Error(`Unknown Studio project: ${data.projectId}`);

    // Dynamic imports: this file is imported by studio.tsx (a client
    // component), so Node built-ins must stay out of top-level imports.
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const run = promisify(execFile);
    const git = (cwd: string, args: string[]) =>
      run("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 });

    const rootDir = await resolveProjectRoot(project);
    const { stdout: statusOut } = await git(rootDir, ["status", "--porcelain"]);
    const dirtyFiles = statusOut
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (dirtyFiles.length === 0) {
      return { synced: false, message: "Nothing to sync — the working tree is clean.", files: [] as string[] };
    }

    if (!data.confirmed) {
      return {
        synced: false,
        message: `${dirtyFiles.length} file(s) changed. Confirm to commit and push.`,
        files: dirtyFiles,
      };
    }

    const commitMessage =
      data.commitMessage?.trim() || `Studio sync: ${dirtyFiles.length} file(s)`;

    await git(rootDir, ["add", "-A"]);
    await git(rootDir, ["commit", "-m", commitMessage]);
    const { stdout: branchOut } = await git(rootDir, ["rev-parse", "--abbrev-ref", "HEAD"]);
    const branch = branchOut.trim() || project.defaultBranch;
    await git(rootDir, ["push", "origin", branch]);

    return {
      synced: true,
      message: `Pushed ${dirtyFiles.length} file(s) to ${branch}.`,
      files: dirtyFiles,
      branch,
      commitMessage,
    };
  });
