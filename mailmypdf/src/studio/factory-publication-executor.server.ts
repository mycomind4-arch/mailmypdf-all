import type { FactoryJob } from "@mailmypdf/workflows";
import { GitHubRepositoryProvider } from "@mailmypdf/vertical-foundry";
import { findStudioProject, resolveProjectRoot } from "@/studio/domain/studio-project";
import {
  loadPersistentFactoryJob,
  recordPersistentFactoryPublication,
} from "@/studio/factory-job.server";

function normalizeOutput(value: string | undefined, max = 4_000): string {
  const text = (value ?? "").trim();
  return text.length <= max ? text : text.slice(-max);
}

async function git(
  cwd: string,
  args: readonly string[],
): Promise<{ stdout: string; stderr: string }> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  return run("git", [...args], {
    cwd,
    maxBuffer: 20 * 1024 * 1024,
    env: process.env,
  });
}

function repositoryFromUrl(value: string): string {
  const url = new URL(value);
  if (url.hostname.toLowerCase() !== "github.com") {
    throw new Error("Factory publication currently supports github.com repositories only.");
  }
  const parts = url.pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/, "").split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Studio project GitHub repository URL is invalid.");
  }
  return `${parts[0]}/${parts[1]}`;
}

function provider(): GitHubRepositoryProvider {
  const token =
    process.env.GITHUB_ACCESS_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Factory PR publication requires GITHUB_ACCESS_TOKEN or GITHUB_TOKEN.",
    );
  }
  return new GitHubRepositoryProvider({ token });
}

function assertPublishable(job: FactoryJob): asserts job is FactoryJob & {
  build: NonNullable<FactoryJob["build"]>;
  buildArtifact: NonNullable<FactoryJob["buildArtifact"]>;
} {
  if (
    job.stage !== "publication_review" ||
    job.status !== "awaiting_review" ||
    job.review.reason !== "generated-workflow-publication" ||
    !job.build ||
    !job.buildArtifact
  ) {
    throw new Error("Factory job is not ready for generated workflow publication.");
  }
  if (
    job.buildArtifact.checks.length === 0 ||
    job.buildArtifact.checks.some((check) => !check.ok)
  ) {
    throw new Error("Factory publication requires complete passing acceptance evidence.");
  }
}

export async function publishPersistentFactoryProposal(input: {
  jobId: string;
  actorId: string;
}): Promise<FactoryJob> {
  const current = await loadPersistentFactoryJob(input.jobId);
  if (!current) throw new Error("Factory job was not found.");
  if (current.publicationArtifact) {
    return current;
  }
  assertPublishable(current);

  const project = findStudioProject("mailmypdf");
  if (!project) throw new Error("MailMyPDF Studio project is not configured.");

  const rootDir = await resolveProjectRoot(project);
  const repository = repositoryFromUrl(project.repoUrl);
  const branch = current.buildArtifact.branch;
  const acceptedCommit = current.buildArtifact.commitSha;

  const { stdout: localOut } = await git(rootDir, [
    "rev-parse",
    "--verify",
    `refs/heads/${branch}`,
  ]).catch((cause) => {
    const error = cause as Error & { stdout?: string; stderr?: string };
    throw new Error(
      `Accepted factory proposal branch is missing locally: ${normalizeOutput(
        [error.stdout, error.stderr, error.message].filter(Boolean).join("\n"),
      )}`,
    );
  });
  const localCommit = localOut.trim();
  if (localCommit !== acceptedCommit) {
    throw new Error(
      `Local factory proposal branch moved after acceptance: expected ${acceptedCommit}, got ${localCommit}.`,
    );
  }

  await git(rootDir, ["fetch", "origin", project.defaultBranch]);
  await git(rootDir, [
    "merge-base",
    "--is-ancestor",
    current.buildArtifact.baseSha,
    `origin/${project.defaultBranch}`,
  ]).catch(() => {
    throw new Error(
      "The accepted factory base is no longer an ancestor of the current default branch. Rebuild the proposal before publishing.",
    );
  });

  const remoteBefore = await git(rootDir, [
    "ls-remote",
    "--heads",
    "origin",
    branch,
  ]);
  const remoteLine = remoteBefore.stdout.trim();
  if (remoteLine) {
    const remoteCommit = remoteLine.split(/\s+/)[0] ?? "";
    if (remoteCommit !== acceptedCommit) {
      throw new Error(
        `Remote factory branch ${branch} already exists at a different commit.`,
      );
    }
  } else {
    await git(rootDir, [
      "push",
      "--set-upstream",
      "origin",
      `refs/heads/${branch}:refs/heads/${branch}`,
    ]).catch((cause) => {
      const error = cause as Error & { stdout?: string; stderr?: string };
      throw new Error(
        `Unable to push accepted factory proposal: ${normalizeOutput(
          [error.stdout, error.stderr, error.message].filter(Boolean).join("\n"),
        )}`,
      );
    });
  }

  const remoteAfter = await git(rootDir, [
    "ls-remote",
    "--heads",
    "origin",
    branch,
  ]);
  const remoteCommit = remoteAfter.stdout.trim().split(/\s+/)[0] ?? "";
  if (remoteCommit !== acceptedCommit) {
    throw new Error(
      "Remote factory branch does not match the accepted proposal commit after push.",
    );
  }

  const github = provider();
  const existing = await github.findOpenPullRequestByHead(
    repository,
    branch,
    project.defaultBranch,
  );
  const pullRequest =
    existing ??
    (await github.createPullRequest(
      repository,
      branch,
      project.defaultBranch,
      `Factory: ${current.build.request.label}`,
      [
        "## Supervised workflow-factory proposal",
        "",
        `Factory job: \`${current.id}\``,
        `Canonical workflow: \`${current.build.canonicalId}\``,
        `Accepted commit: \`${acceptedCommit}\``,
        "",
        "This proposal passed the local supervised factory acceptance suite before publication.",
        "",
        "Acceptance checks:",
        ...current.buildArtifact.checks.map(
          (check) => `- ✅ ${check.id}: ${check.summary}`,
        ),
        "",
        "The factory created this pull request only. It did not merge, deploy, charge, or mail anything.",
      ].join("\n"),
    ));

  return recordPersistentFactoryPublication({
    jobId: current.id,
    actorId: input.actorId,
    artifact: Object.freeze({
      repository,
      branch,
      commitSha: acceptedCommit,
      pullRequestNumber: pullRequest.number,
      pullRequestUrl: pullRequest.url,
      publishedAt: new Date().toISOString(),
    }),
  });
}
